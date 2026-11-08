import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarReps, lerReps } from "../src/modules/treino/reps.ts";

test("aceita número ou faixa de repetições", () => {
  assert.deepEqual(lerReps("10"), { reps: 10 });
  assert.deepEqual(lerReps("8-10"), { reps: 8, repsMax: 10 });
  assert.deepEqual(lerReps("8 - 10"), { reps: 8, repsMax: 10 });
  assert.deepEqual(lerReps("8–10"), { reps: 8, repsMax: 10 });
  assert.deepEqual(lerReps("8 a 10"), { reps: 8, repsMax: 10 });
  assert.deepEqual(lerReps("12-15"), { reps: 12, repsMax: 15 });
  assert.deepEqual(lerReps("10-8"), { reps: 8, repsMax: 10 });
  assert.deepEqual(lerReps("10-10"), { reps: 10 });
});

test("recusa o que não é repetição", () => {
  for (const t of ["", "-10", "12-", "0", "101", "8-101", "dez", "8,5"]) assert.equal(lerReps(t), null, t);
});

test("mostra faixa com traço", () => {
  assert.equal(formatarReps({ reps: 8, repsMax: 10 }), "8–10");
  assert.equal(formatarReps({ reps: 10 }), "10");
});
