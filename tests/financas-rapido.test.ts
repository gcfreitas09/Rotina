import { test } from "node:test";
import assert from "node:assert/strict";
import type { Lancamento } from "../src/data/types.ts";
import { lerRapido } from "../src/modules/financas/rapido.ts";

const h = "2026-11-10";
const L = (descricao: string, extra: Partial<Lancamento> = {}): Lancamento =>
  ({ id: descricao, _m: 1, tipo: "saida", valor: 500, data: "2026-11-01", descricao, categoria: "Outros", carteira: "conta", ...extra });
const r = (t: string, hist: Lancamento[] = [], hj = h) => {
  const x = lerRapido(t, hist, hj);
  return x && [x.tipo, x.valor, x.descricao, x.categoria, x.carteira, x.data];
};

test("gastos do dia a dia: valor, categoria, dinheiro, hoje", () => {
  assert.deepEqual(r("lanche 12,50"), ["saida", 1250, "Lanche", "Alimentação", "conta", h]);
  assert.deepEqual(r("uber 18 ontem"), ["saida", 1800, "Uber", "Transporte", "conta", "2026-11-09"]);
  assert.deepEqual(r("tênis 1.299,90"), ["saida", 129990, "Tênis", "Roupas", "conta", h]);
  assert.deepEqual(r("2 coxinhas 9,50"), ["saida", 950, "2 coxinhas", "Outros", "conta", h]);
  assert.deepEqual(r("-50 presente da mãe"), ["saida", 5000, "Presente da mãe", "Outros", "conta", h]); // "-" força gasto
});

test("entradas em dinheiro", () => {
  assert.deepEqual(r("+800 salário"), ["entrada", 80000, "Salário", "Salário", "conta", h]);
  assert.deepEqual(r("salário 174 31/10"), ["entrada", 17400, "Salário", "Salário", "conta", "2026-10-31"]);
  assert.deepEqual(r("recebi 150 freela"), ["entrada", 15000, "Freela", "Freela", "conta", h]);
  assert.deepEqual(r("+40 pix do joão"), ["entrada", 4000, "Pix do joão", "Outros", "conta", h]);
});

test("gasto no vale: sigla ou por extenso, em qualquer lugar da linha", () => {
  const va = ["saida", 1500, "Salgado", "Alimentação", "va", h];
  for (const t of ["va salgado 15", "salgado 15 va", "salgado 15 no va", "VA Salgado 15", "vale alimentação salgado 15", "salgado 15 no vale-alimentação"]) assert.deepEqual(r(t), va, t);
  assert.deepEqual(r("ônibus 4,40 vale transporte"), ["saida", 440, "Ônibus", "Transporte", "vt", h]);
  assert.deepEqual(r("vt 4,40"), ["entrada", 440, "Vale-transporte", "Vale", "vt", h]); // só o vale e o valor = recebeu
  assert.deepEqual(r("almoço 30 vr"), ["saida", 3000, "Almoço", "Alimentação", "vr", h]);
  assert.deepEqual(r("-4,40 vt"), ["saida", 440, "", "Transporte", "vt", h]); // "-" + vale = gasto no vale
});

test("receber vale: nunca no dinheiro (bug de 10/11/2026: o VA recebido caía no dinheiro ou virava gasto)", () => {
  assert.deepEqual(r("vale alimentação 600"), ["entrada", 60000, "Vale-alimentação", "Vale", "va", h]);
  assert.deepEqual(r("va 600"), ["entrada", 60000, "Vale-alimentação", "Vale", "va", h]);
  assert.deepEqual(r("+600 va"), ["entrada", 60000, "Vale-alimentação", "Vale", "va", h]);
  assert.deepEqual(r("recebi 600 vale alimentação"), ["entrada", 60000, "Vale-alimentação", "Vale", "va", h]);
  assert.deepEqual(r("caiu vale transporte 128 01/11"), ["entrada", 12800, "Vale-transporte", "Vale", "vt", "2026-11-01"]);
  // "vale" sem dizer qual: entrada de vale, carteira em aberto (a tela pede para escolher)
  assert.deepEqual(r("+600 vale"), ["entrada", 60000, "Vale", "Vale", null, h]);
  assert.deepEqual(r("vale 600"), ["entrada", 60000, "Vale", "Vale", null, h]);
});

test("datas: 06/11, 6/11/2026, 06/11/26, dia 6; impossível recusa", () => {
  assert.deepEqual(r("VA Salgado 15 06/11"), ["saida", 1500, "Salgado", "Alimentação", "va", "2026-11-06"]);
  assert.deepEqual(r("06/11 salgado 15 va"), ["saida", 1500, "Salgado", "Alimentação", "va", "2026-11-06"]);
  assert.deepEqual(r("uber 18 6/11/2026"), ["saida", 1800, "Uber", "Transporte", "conta", "2026-11-06"]);
  assert.deepEqual(r("uber 18 06/11/26"), ["saida", 1800, "Uber", "Transporte", "conta", "2026-11-06"]);
  assert.deepEqual(r("lanche 12,50 dia 6"), ["saida", 1250, "Lanche", "Alimentação", "conta", "2026-11-06"]);
  assert.deepEqual(r("lanche 12,50 dia 25"), ["saida", 1250, "Lanche", "Alimentação", "conta", "2026-10-25"]);
  assert.deepEqual(r("chocolate 50 28/12", [], "2027-01-05"), ["saida", 5000, "Chocolate", "Alimentação", "conta", "2026-12-28"]);
  assert.equal(lerRapido("salgado 15 31/02", [], h), null);
  assert.equal(lerRapido("salgado 06/11", [], h), null); // só data, sem valor
  assert.equal(lerRapido("lanche", [], h), null);
  assert.equal(lerRapido("   ", [], h), null);
});

test("aprende com o que já foi anotado (categoria e carteira), sem passar por cima do que a linha diz", () => {
  const hist = [L("Coxinha da cantina", { categoria: "Alimentação", carteira: "va" }), L("Barbeiro", { categoria: "Outros" })];
  const x = lerRapido("coxinha 6", hist, h)!;
  assert.deepEqual([x.categoria, x.carteira, x.aprendeu], ["Alimentação", "va", true]);
  assert.equal(lerRapido("coxinha 6 vt", hist, h)!.carteira, "vt"); // a linha manda
  assert.equal(lerRapido("coxinha 6 no vale", hist, h)!.carteira, null); // "vale" sem nome: pergunta
  // ajuste de saldo e entrada de vale não ensinam categoria
  const hist2 = [L("Ajuste", { categoria: "Ajuste de saldo" })];
  assert.equal(lerRapido("ajuste 10", hist2, h)!.aprendeu, false);
});
