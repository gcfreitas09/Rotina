import { test } from "node:test";
import assert from "node:assert/strict";
import type { Fixo, Lancamento } from "../src/data/types.ts";
import { AJUSTE, ajusteDeSaldo, reaisCurto, gastoPorDia, ritmoDoMes, saldoAte, serieMeses, formatarDias, lerDias, comparaMesAnterior, dataDoFixo, fixosDoMes, lerValor, porCategoria, porDia, reais, resumoMes, somarMes } from "../src/modules/financas/logica.ts";

test("lê valores em reais e devolve centavos", () => {
  assert.equal(lerValor("1.234,56"), 123456);
  assert.equal(lerValor("1234,56"), 123456);
  assert.equal(lerValor("12,5"), 1250);
  assert.equal(lerValor("12.50"), 1250);
  assert.equal(lerValor("R$ 30"), 3000);
  assert.equal(lerValor("1.234"), 123400);
  assert.equal(lerValor("0,1"), 10);
  assert.equal(lerValor(""), null);
  for (const t of ["abc", "0", "-5", "1,234", "12,"]) assert.ok(Number.isNaN(lerValor(t)), t);
});

test("formata reais e soma meses", () => {
  assert.equal(reais(123456).replace(/\s/g, " "), "R$ 1.234,56");
  assert.equal(reais(-1200).replace(/\s/g, " "), "−R$ 12,00");
  assert.equal(somarMes("2026-12", 1), "2027-01");
  assert.equal(somarMes("2026-01", -1), "2025-12");
  assert.equal(dataDoFixo({ dia: 31 }, "2026-11"), "2026-11-30");
  assert.equal(dataDoFixo({ dia: 31 }, "2027-02"), "2027-02-28");
});

const L = (id: string, tipo: Lancamento["tipo"], valor: number, data: string, extra: Partial<Lancamento> = {}): Lancamento =>
  ({ id, _m: 1, tipo, valor, data, descricao: id, categoria: "Outros", carteira: "conta", ...extra });
const F = (id: string, tipo: Fixo["tipo"], valor: number, dia: number, extra: Partial<Fixo> = {}): Fixo =>
  ({ id, _m: 1, tipo, valor, dia, desde: "2026-10", descricao: id, categoria: "Outros", carteira: "conta", ...extra });

test("resumo do mês: conta separada dos vales, previsto com os fixos que faltam", () => {
  const fixos = [F("salario", "entrada", 200000, 5), F("aluguel", "saida", 80000, 10), F("vr", "entrada", 50000, 1, { carteira: "vr" }), F("novo", "saida", 1000, 1, { desde: "2026-12" })];
  const lancs = [
    L("s", "entrada", 200000, "2026-11-05", { fixoId: "salario" }),
    L("lanche", "saida", 2500, "2026-11-06", { categoria: "Alimentação" }),
    L("almoco", "saida", 3500, "2026-11-06", { carteira: "vr", categoria: "Alimentação" }),
    L("outubro", "saida", 9999, "2026-10-20"),
  ];
  const r = resumoMes(lancs, fixos, "2026-11");
  assert.equal(r.entrou, 200000);
  assert.equal(r.saiu, 2500);
  assert.equal(r.saldo, 197500);
  assert.equal(r.aPagar, 80000);
  assert.equal(r.aReceber, 0);
  assert.equal(r.previsto, 117500);
  assert.deepEqual(r.vales, [{ carteira: "vr", entrou: 0, saiu: 3500, saldo: -3500 }]);
  const fm = fixosDoMes(fixos, lancs, "2026-11");
  assert.deepEqual(fm.map((x) => [x.fixo.id, !!x.lancamento]), [["vr", false], ["salario", true], ["aluguel", false]]); // "novo" só em dezembro
  assert.deepEqual(porCategoria(lancs, "2026-11").map((c) => [c.categoria, c.total]), [["Alimentação", 6000]]);
  const dias = porDia(lancs, "2026-11");
  assert.deepEqual(dias.map((d) => [d.data, d.itens.length, d.saldo]), [["2026-11-06", 2, -2500], ["2026-11-05", 1, 200000]]);
  assert.ok(Math.abs((comparaMesAnterior(lancs, "2026-11") as number) - (6000 / 9999 - 1)) < 1e-9);
  assert.equal(comparaMesAnterior(lancs, "2026-10"), null);
});

test("dia do fixo: dia certo ou faixa 05-10", () => {
  assert.deepEqual(lerDias("5"), { dia: 5 });
  assert.deepEqual(lerDias("05-10"), { dia: 5, diaMax: 10 });
  assert.deepEqual(lerDias("5 a 10"), { dia: 5, diaMax: 10 });
  assert.deepEqual(lerDias("10-5"), { dia: 5, diaMax: 10 });
  assert.deepEqual(lerDias("7-7"), { dia: 7 });
  for (const t of ["", "0", "32", "5-", "abc", "5-40"]) assert.equal(lerDias(t), null, t);
  assert.equal(formatarDias({ dia: 5, diaMax: 10 }), "05–10");
  assert.equal(formatarDias({ dia: 5 }), "05");
  const [x] = fixosDoMes([F("sal", "entrada", 1000, 25, { diaMax: 31 })], [], "2026-11");
  assert.deepEqual([x.data, x.ate], ["2026-11-25", "2026-11-30"]);
});

test("acumulado: o que sobra passa para o mês seguinte (conta e vales)", () => {
  const lancs = [
    L("out", "entrada", 80000, "2026-10-05"),
    L("gasto-out", "saida", 30000, "2026-10-20"),
    L("vr-out", "entrada", 40000, "2026-10-01", { carteira: "vr" }),
    L("nov", "entrada", 10000, "2026-11-05"),
    L("gasto-nov", "saida", 5000, "2026-11-06"),
  ];
  assert.equal(saldoAte(lancs, "conta", "2026-10"), 50000);
  const r = resumoMes(lancs, [F("aluguel", "saida", 20000, 10)], "2026-11");
  assert.equal(r.anterior, 50000);
  assert.equal(r.acumulado, 55000);
  assert.equal(r.previstoAcumulado, 35000);
  assert.deepEqual(r.vales, [{ carteira: "vr", entrou: 0, saiu: 0, saldo: 40000 }]); // sobra de VR de outubro aparece em novembro
  assert.deepEqual(serieMeses(lancs, "2026-11", 3).map((p) => [p.mes, p.entrou, p.saiu, p.acumulado]),
    [["2026-09", 0, 0, 0], ["2026-10", 80000, 30000, 50000], ["2026-11", 10000, 5000, 55000]]);
  const g = gastoPorDia(lancs, "2026-11");
  assert.equal(g.length, 30);
  assert.equal(g[4], 0);
  assert.equal(g[5], 5000);
  assert.equal(g[29], 5000);
  const rt = ritmoDoMes(lancs, [F("aluguel", "saida", 20000, 10)], "2026-11", "2026-11-10")!;
  assert.equal(rt.ateHoje, 5000);
  assert.equal(rt.mesmoDiaAntes, 0);
  assert.equal(rt.projecao, 15000);
  assert.equal(rt.diasRestantes, 21);
  assert.equal(rt.porDia, Math.floor(35000 / 21));
  assert.equal(ritmoDoMes(lancs, [], "2026-10", "2026-11-10"), null);
});

test("ajustar saldo mexe só no acumulado", () => {
  const lancs = [L("a", "entrada", 10000, "2026-11-02")];
  const aj = ajusteDeSaldo(lancs, "conta", 60000, "2026-11-10")!;
  assert.deepEqual([aj.tipo, aj.valor, aj.categoria], ["entrada", 50000, AJUSTE]);
  const com = [...lancs, { ...aj, id: "aj", _m: 1 } as Lancamento];
  const r = resumoMes(com, [], "2026-11");
  assert.equal(r.entrou, 10000);
  assert.equal(r.acumulado, 60000);
  assert.equal(ajusteDeSaldo(com, "conta", 60000, "2026-11-10"), null);
  assert.equal(ajusteDeSaldo(com, "conta", 55000, "2026-11-10")!.tipo, "saida");
  assert.equal(reaisCurto(123456), "R$ 1,2 mil");
  assert.equal(reaisCurto(85000), "R$ 850");
});

import { cruzouLimite, contasDoDia, fechamento, limitesDoMes, regra503020 } from "../src/modules/financas/logica.ts";
import { lerRapido } from "../src/modules/financas/rapido.ts";

test("limites por categoria e aviso só ao cruzar 80% e 100%", () => {
  const lancs = [L("a", "saida", 12000, "2026-11-02", { categoria: "Lazer" }), L("b", "saida", 3000, "2026-11-03", { categoria: "Lazer", carteira: "vr" })];
  const est = limitesDoMes(lancs, "2026-11", { Lazer: 15000, Roupas: 10000, Casa: 0 });
  assert.deepEqual(est.map((e) => [e.categoria, e.gasto, e.fracao]), [["Lazer", 15000, 1], ["Roupas", 0, 0]]);
  assert.equal(cruzouLimite(10000, 12500, 15000), 80);
  assert.equal(cruzouLimite(12500, 15000, 15000), 100);
  assert.equal(cruzouLimite(10000, 16000, 15000), 100);
  assert.equal(cruzouLimite(12500, 13000, 15000), null);
  assert.equal(cruzouLimite(0, 99999, 0), null);
});

test("contas do dia: fixo cuja data chegou e ainda não foi lançado", () => {
  const fixos = [F("cel", "saida", 5990, 10), F("sal", "entrada", 80000, 5, { diaMax: 12 }), F("alug", "saida", 50000, 20), F("luz", "saida", 9000, 3)];
  const lancs = [L("x", "saida", 9000, "2026-11-03", { fixoId: "luz" })];
  const c = contasDoDia(fixos, lancs, "2026-11-10");
  assert.deepEqual(c.map((x) => [x.fixo.id, x.atrasado]), [["sal", false], ["cel", false]]);
  assert.deepEqual(contasDoDia(fixos, lancs, "2026-11-13").map((x) => [x.fixo.id, x.atrasado]), [["sal", true], ["cel", true]]);
});

test("50/30/20 e fechamento do mês", () => {
  const lancs = [
    L("s", "entrada", 100000, "2026-10-05"),
    L("m", "saida", 30000, "2026-10-06", { categoria: "Mercado" }),
    L("l", "saida", 20000, "2026-10-06", { categoria: "Lazer" }),
    L("r", "saida", 10000, "2026-10-20", { categoria: "Roupas" }),
    L("lset", "saida", 5000, "2026-09-20", { categoria: "Lazer" }),
  ];
  const r = regra503020(lancs, "2026-10")!;
  assert.deepEqual([r.necessidades, r.desejos, r.guardou], [30000, 30000, 40000]);
  assert.equal(regra503020(lancs, "2026-08"), null);
  const f = fechamento(lancs, [], "2026-10")!;
  assert.equal(f.sobrou, 40000);
  assert.deepEqual(f.maior, { categoria: "Mercado", total: 30000 });
  assert.deepEqual(f.mudou, { categoria: "Lazer", antes: 5000, agora: 20000 });
  assert.deepEqual(f.diaMaisCaro, { data: "2026-10-06", total: 50000 });
  assert.equal(fechamento(lancs, [], "2026-07"), null);
});

test("lançar rápido: valor, tipo, carteira, data e categoria", () => {
  const h = "2026-11-10";
  const r = (t: string, hist: Lancamento[] = []) => { const x = lerRapido(t, hist, h); return x && [x.tipo, x.valor, x.descricao, x.categoria, x.carteira, x.data]; };
  assert.deepEqual(r("lanche 12,50"), ["saida", 1250, "Lanche", "Alimentação", "conta", h]);
  assert.deepEqual(r("uber 18 ontem"), ["saida", 1800, "Uber", "Transporte", "conta", "2026-11-09"]);
  assert.deepEqual(r("+800 salário"), ["entrada", 80000, "Salário", "Salário", "conta", h]);
  assert.deepEqual(r("recebi 150 freela"), ["entrada", 15000, "Freela", "Freela", "conta", h]);
  assert.deepEqual(r("almoço 32,50 vr"), ["saida", 3250, "Almoço", "Alimentação", "vr", h]);
  assert.deepEqual(r("2 coxinhas 9,50"), ["saida", 950, "2 coxinhas", "Outros", "conta", h]);
  assert.deepEqual(r("tênis 1.299,90"), ["saida", 129990, "Tênis", "Roupas", "conta", h]);
  // aprende: "coxinha" já foi lançada como Alimentação no VR
  const hist = [L("h", "saida", 500, "2026-11-01", { descricao: "Coxinha da cantina", categoria: "Alimentação", carteira: "vr" })];
  assert.deepEqual(r("coxinha 6", hist), ["saida", 600, "Coxinha", "Alimentação", "vr", h]);
  assert.equal(lerRapido("lanche", [], h), null);
  assert.equal(lerRapido("", [], h), null);
});
