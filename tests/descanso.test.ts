import { test } from "node:test";
import assert from "node:assert/strict";
import { duracaoDescanso, faseDescanso, formatarDescanso, lerDescanso, mmss } from "../src/modules/treino/descanso.ts";

test("lê descanso em segundos, faixa e m:ss", () => {
  assert.deepEqual(lerDescanso("90"), { descanso: 90 });
  assert.deepEqual(lerDescanso("120-190"), { descanso: 120, descansoMax: 190 });
  assert.deepEqual(lerDescanso("120 a 190"), { descanso: 120, descansoMax: 190 });
  assert.deepEqual(lerDescanso("190-120"), { descanso: 120, descansoMax: 190 });
  assert.deepEqual(lerDescanso("2:00-3:10"), { descanso: 120, descansoMax: 190 });
  assert.deepEqual(lerDescanso("90s"), { descanso: 90 });
  for (const t of ["", "abc", "5", "1000", "60-", "1:75"]) assert.equal(lerDescanso(t), null, t);
});

test("formata e escolhe a duração (padrão quando o exercício não tem)", () => {
  assert.equal(formatarDescanso({ descanso: 120, descansoMax: 190 }), "120–190 s");
  assert.equal(formatarDescanso({ descanso: 90 }), "90 s");
  assert.equal(formatarDescanso({}), "");
  assert.deepEqual(duracaoDescanso({ descanso: 120, descansoMax: 190 }, 90), { minMs: 120_000, maxMs: 190_000 });
  assert.deepEqual(duracaoDescanso(undefined, 90), { minMs: 90_000, maxMs: 90_000 });
});

test("fases: descansando até o mínimo, 'pode' até o máximo, depois fim", () => {
  const d = { inicio: 0, minMs: 120_000, maxMs: 190_000 };
  const a = faseDescanso(d, 30_000);
  assert.ok(a.fase === "descansando" && a.restanteMs === 90_000);
  const b = faseDescanso(d, 150_000);
  assert.ok(b.fase === "pode" && b.passouMs === 30_000 && b.ateMaxMs === 40_000);
  assert.equal(faseDescanso(d, 190_000).fase, "fim");
  assert.equal(faseDescanso({ inicio: 0, minMs: 90_000, maxMs: 90_000 }, 90_000).fase, "fim"); // sem faixa: acaba no mínimo
  assert.equal(mmss(190_000), "3:10");
});
