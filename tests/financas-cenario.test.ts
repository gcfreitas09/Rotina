/**
 * O cenário real que deu errado (10/11/2026), centavo a centavo:
 * outubro: salário 800, gastou 626 → sobrou 174. Novembro: salário 128, gastos em dinheiro 142,11;
 * VA 600 recebido (fixo "Vale alimentação", Recebi) e gastos de VA 78,31; VT 128 recebido.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Fixo, Lancamento } from "../src/data/types.ts";
import {
  AJUSTE, carteiraPeloTexto, extrato, moverParaCarteira, resumoMes, saldoAgora, saldoAte, suspeitos, validarLancamento,
} from "../src/modules/financas/logica.ts";
import { lerRapido } from "../src/modules/financas/rapido.ts";

let n = 0;
const L = (tipo: Lancamento["tipo"], valor: number, data: string, extra: Partial<Lancamento> = {}): Lancamento =>
  ({ id: `l${++n}`, _m: n, tipo, valor, data, descricao: "", categoria: "Outros", carteira: "conta", ...extra });
const hoje = "2026-11-10";

const fixoVA: Fixo = { id: "fva", _m: 1, tipo: "entrada", valor: 60000, descricao: "Vale alimentação", categoria: "Vale", carteira: "va", dia: 1, desde: "2026-11" };
const lancs: Lancamento[] = [
  L("entrada", 80000, "2026-10-05", { categoria: "Salário", descricao: "Salário" }),
  L("saida", 40000, "2026-10-12", { categoria: "Lazer" }),
  L("saida", 22600, "2026-10-25", { categoria: "Roupas" }),
  L("entrada", 12800, "2026-11-05", { categoria: "Salário", descricao: "Salário" }),
  L("saida", 3100, "2026-11-10", { categoria: "Transporte" }),
  L("saida", 11111, "2026-11-08", { categoria: "Lazer" }),
  L("entrada", 60000, "2026-11-01", { categoria: "Vale", carteira: "va", descricao: "Vale alimentação", fixoId: "fva" }),
  L("saida", 1500, "2026-11-06", { categoria: "Alimentação", carteira: "va", descricao: "Salgado" }),
  L("saida", 6331, "2026-11-09", { categoria: "Mercado", carteira: "va" }),
  L("entrada", 12800, "2026-11-01", { categoria: "Vale", carteira: "vt" }),
];

test("saldos de cada carteira batem centavo a centavo", () => {
  assert.equal(saldoAte(lancs, "conta", "2026-10"), 17400); // sobrou 174 de outubro
  assert.equal(saldoAgora(lancs, "conta", hoje), 17400 + 12800 - 3100 - 11111); // 159,89
  assert.equal(saldoAgora(lancs, "va", hoje), 60000 - 1500 - 6331); // 521,69
  assert.equal(saldoAgora(lancs, "vt", hoje), 12800);
  const r = resumoMes(lancs, [fixoVA], "2026-11");
  assert.equal(r.anterior, 17400);
  assert.equal(r.saldo, 12800 - 3100 - 11111); // saldo do mês: −14,11
  assert.equal(r.entrou, 12800); // o VA não entra como dinheiro
});

test("cada lançamento novo muda só a carteira dele, na hora", () => {
  const antes = { conta: saldoAgora(lancs, "conta", hoje), va: saldoAgora(lancs, "va", hoje) };
  const x = lerRapido("va salgado 15", lancs, hoje)!;
  const mais = [...lancs, { ...x, carteira: x.carteira!, id: "novo", _m: 999, fixoId: null }];
  assert.equal(saldoAgora(mais, "va", hoje), antes.va - 1500);
  assert.equal(saldoAgora(mais, "conta", hoje), antes.conta);
});

test("extrato da caderneta: saldo linha a linha, começo e fim do mês", () => {
  const e = extrato(lancs, "va", "2026-11");
  assert.equal(e.inicio, 0);
  assert.equal(e.fim, 52169);
  assert.deepEqual(e.dias.map((d) => [d.data, d.itens.map((i) => i.fica)]), [["2026-11-09", [52169]], ["2026-11-06", [58500]], ["2026-11-01", [60000]]]);
  const c = extrato(lancs, "conta", "2026-11");
  assert.equal(c.inicio, 17400);
  assert.equal(c.fim, 15989);
  assert.equal(c.dias[0].itens[0].fica, 15989); // o mais novo fica com o saldo final
  const todas = extrato(lancs, null, "2026-11");
  assert.equal(todas.inicio, null);
  assert.equal(todas.dias.flatMap((d) => d.itens).length, 7);
});

test("vale não pode cair no dinheiro (o erro de antes) e quem já caiu é achado e movido", () => {
  assert.match(validarLancamento({ tipo: "entrada", valor: 60000, categoria: "Vale", carteira: "conta", data: hoje })!, /Vale não é dinheiro/);
  assert.equal(validarLancamento({ tipo: "entrada", valor: 60000, categoria: "Vale", carteira: "va", data: hoje }), null);
  assert.deepEqual(["Vale alimentação", "vale-transporte", "Almoço VR", "Vale", "Uva", "Lava jato"].map(carteiraPeloTexto), ["va", "vt", "vr", "vale", null, null]);

  // como estava: fixo de VA sem trocar o "Onde" (ficou no dinheiro) e o Recebi lançou 600 no dinheiro
  const fixoErrado: Fixo = { ...fixoVA, id: "f2", carteira: "conta", categoria: "Salário" };
  const errados = [
    L("entrada", 60000, "2026-11-01", { categoria: "Salário", descricao: "Vale alimentação", fixoId: "f2" }),
    L("entrada", 12800, "2026-11-01", { categoria: "Vale", descricao: "" }),
    L("saida", 2000, "2026-11-02", { descricao: "Lanche", categoria: "Alimentação" }),
    L("entrada", 5000, "2026-11-03", { categoria: AJUSTE, descricao: "Ajuste de saldo vale" }),
  ];
  const s = suspeitos(errados, [fixoErrado]);
  assert.deepEqual(s.map((x) => [x.tipo, x.sugestao]), [["fixo", "va"], ["lancamento", null]]); // o lançamento do fixo vem junto com o fixo; ajuste e lanche não
  const mv = moverParaCarteira(errados, [fixoErrado], s[0], "va");
  assert.deepEqual(mv.fixos.map((f) => [f.carteira, f.categoria]), [["va", "Vale"]]);
  assert.deepEqual(mv.lancamentos.map((l) => [l.carteira, l.categoria, l.valor]), [["va", "Vale", 60000]]);
  assert.deepEqual(suspeitos(errados, [fixoErrado], ["f2", errados[1].id]), []); // "está certo" some da lista
});
