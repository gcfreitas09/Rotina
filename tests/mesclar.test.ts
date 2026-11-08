import { test } from "node:test";
import assert from "node:assert/strict";
import { mesclar, validarBackup } from "../src/data/storage.ts";

test("vence a versão alterada por último, e nada some", () => {
  const celular = [{ id: "a", _m: 10, v: "cel" }, { id: "b", _m: 5, v: "so-cel" }];
  const desktop = [{ id: "a", _m: 20, v: "desk" }, { id: "c", _m: 1, v: "so-desk" }];
  const { lista, mudou } = mesclar(celular, desktop);
  assert.equal(mudou, true);
  const m = Object.fromEntries(lista.map((r) => [r.id, r.v]));
  assert.deepEqual(m, { a: "desk", b: "so-cel", c: "so-desk" });
});

test("exclusão (lápide) mais nova vence", () => {
  const { lista } = mesclar([{ id: "a", _m: 10 }], [{ id: "a", _m: 11, _x: true }]);
  assert.equal(lista[0]._x, true);
});

test("backup inválido é recusado", () => {
  assert.throws(() => validarBackup({ foo: 1 }), /não é um backup do Rotina/);
  assert.throws(() => validarBackup({ app: "rotina", dados: { tarefas: [{ titulo: "x" }] } }), /corrompido/);
});
