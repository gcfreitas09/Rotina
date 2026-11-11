import { test } from "node:test";
import assert from "node:assert/strict";
import type { Fixo, Lancamento } from "../src/data/types.ts";
import { formatarDias, lerDias, comparaMesAnterior, dataDoFixo, fixosDoMes, lerValor, porCategoria, porDia, reais, resumoMes, somarMes } from "../src/modules/financas/logica.ts";

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
