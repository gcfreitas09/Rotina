import { test } from "node:test";
import assert from "node:assert/strict";
import { dominio, fila, paraRevisar, responder } from "../src/modules/flashcards/logica.ts";
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
