import { test } from "node:test";
import assert from "node:assert/strict";
import { dificuldadeDe, dominio, embaralhar, fila, paraRevisar, responder } from "../src/modules/flashcards/logica.ts";
import type { Cartao } from "../src/data/types.ts";

const c = (p: Partial<Cartao> = {}): Cartao => ({ id: "c", _m: 0, baralhoId: "b", frente: "O que foi a Revolução Francesa?", verso: "…", caixa: 1, proxima: "2026-11-08", acertos: 0, erros: 0, ...p });

test("acerto sobe de caixa e espaça a revisão", () => {
  const r1 = responder(c(), true, "2026-11-08");
  assert.equal(r1.caixa, 2);
  assert.equal(r1.proxima, "2026-11-09");
  const r2 = responder(c({ caixa: 4 }), true, "2026-11-08");
  assert.equal(r2.caixa, 5);
  assert.equal(r2.proxima, "2026-11-22");
  assert.equal(responder(c({ caixa: 5 }), true, "2026-11-08").caixa, 5);
});

test("erro volta para a caixa 1 e revisa hoje", () => {
  const r = responder(c({ caixa: 4, proxima: "2026-11-15" }), false, "2026-11-08");
  assert.equal(r.caixa, 1);
  assert.equal(r.proxima, "2026-11-08");
  assert.equal(r.erros, 1);
});

test("fila traz só os vencidos, caixa menor primeiro", () => {
  const l = fila([c({ id: "a", caixa: 3 }), c({ id: "b", caixa: 1 }), c({ id: "x", proxima: "2026-12-01" })], "2026-11-08");
  assert.deepEqual(l.map((x) => x.id), ["b", "a"]);
  assert.equal(paraRevisar(c({ proxima: "2026-11-09" }), "2026-11-08"), false);
  assert.equal(fila([c({ proxima: "2026-12-01" })], "2026-11-08", true).length, 1);
});

test("domínio vai de 0 a 1", () => {
  assert.equal(dominio([c({ caixa: 1 })]), 0);
  assert.equal(dominio([c({ caixa: 5 })]), 1);
  assert.equal(dominio([]), 0);
});

test("cartão antigo sem dificuldade vale médio", () => {
  assert.equal(dificuldadeDe(c()), "medio");
  assert.equal(dificuldadeDe(c({ dificuldade: "dificil" })), "dificil");
});

test("na mesma caixa, o difícil vem antes do fácil", () => {
  const l = fila([c({ id: "f", dificuldade: "facil" }), c({ id: "d", dificuldade: "dificil" }), c({ id: "m" })], "2026-11-08");
  assert.deepEqual(l.map((x) => x.id), ["d", "m", "f"]);
});

test("filtro de dificuldade deixa só aquela", () => {
  const cs = [c({ id: "f", dificuldade: "facil" }), c({ id: "d", dificuldade: "dificil" }), c({ id: "m" })];
  assert.deepEqual(fila(cs, "2026-11-08", false, { ordem: "caixa", dificuldade: "dificil" }).map((x) => x.id), ["d"]);
  assert.deepEqual(fila(cs, "2026-11-08", false, { ordem: "caixa", dificuldade: "medio" }).map((x) => x.id), ["m"]);
});

test("ordem aleatória mistura sem perder nem repetir cartões e ignora caixa", () => {
  const cs = Array.from({ length: 20 }, (_, i) => c({ id: `c${i}`, caixa: 1 + (i % 5) }));
  const opc = { ordem: "aleatoria" as const, dificuldade: null };
  const a = fila(cs, "2026-11-08", true, opc);
  assert.deepEqual(a.map((x) => x.id).sort(), cs.map((x) => x.id).sort());
  const porCaixa = fila(cs, "2026-11-08", true).map((x) => x.id);
  assert.notDeepEqual(a.map((x) => x.id), porCaixa);
  assert.equal(new Set(a.map((x) => x.id)).size, 20);
});

test("embaralhar é determinístico com o mesmo sorteio e não muda a entrada", () => {
  const e = [1, 2, 3, 4, 5, 6];
  let k = 0;
  const sorteio = () => ((k = (k * 7 + 3) % 10) / 10);
  const x = embaralhar(e, sorteio);
  k = 0;
  assert.deepEqual(embaralhar(e, sorteio), x);
  assert.deepEqual(e, [1, 2, 3, 4, 5, 6]);
});
