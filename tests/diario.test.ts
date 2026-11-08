import { test } from "node:test";
import assert from "node:assert/strict";
import { alternarAlimentoNoDia, alternarRefeicaoNoDia, comeu, estadoRefeicao, resumoDia } from "../src/modules/dieta/diario.ts";
import type { Alimento, DiaDieta, Refeicao } from "../src/data/types.ts";

const al = (id: string, kcal: number, proteina: number): Alimento => ({ id, nome: id, quantidade: "", kcal, proteina });
const ref = (id: string, alimentos: Alimento[]): Refeicao => ({ id, _m: 0, grupo: id, nome: id, tipo: "lanche", dia: 0, horario: "08:00", alimentos });
const vazio: DiaDieta = { id: "2026-11-09", _m: 0, feitas: [], aguaMl: 0 };
const cafe = ref("cafe", [al("ovo", 146, 13.3), al("pao", 150, 4), al("cafe", 9, 0.7)]);
const almoco = ref("almoco", [al("arroz", 128, 2.5), al("frango", 159, 32)]);

test("marcar alimento por alimento; todos comidos = refeição feita", () => {
  let r = alternarAlimentoNoDia(vazio, cafe, "ovo");
  assert.equal(estadoRefeicao(r, cafe), "parte");
  assert.deepEqual(r.comidos, ["cafe/ovo"]);
  r = alternarAlimentoNoDia(r, cafe, "pao");
  r = alternarAlimentoNoDia(r, cafe, "cafe");
  assert.equal(estadoRefeicao(r, cafe), "toda");
  assert.deepEqual(r.feitas, ["cafe"]);
  assert.deepEqual(r.comidos, []); // refeição inteira volta a ser guardada só em feitas
});

test("desmarcar um alimento de refeição feita deixa os outros comidos", () => {
  const feita = alternarRefeicaoNoDia(vazio, "cafe");
  const r = alternarAlimentoNoDia(feita, cafe, "pao");
  assert.equal(estadoRefeicao(r, cafe), "parte");
  assert.ok(comeu(r, cafe, "ovo") && !comeu(r, cafe, "pao") && comeu(r, cafe, "cafe"));
  assert.deepEqual(r.feitas, []);
});

test("refeição em parte: marcar a refeição marca tudo; desmarcar limpa tudo", () => {
  const parte = alternarAlimentoNoDia(vazio, cafe, "ovo");
  const toda = alternarRefeicaoNoDia(parte, "cafe");
  assert.equal(estadoRefeicao(toda, cafe), "toda");
  assert.deepEqual(toda.comidos, []);
  const nada = alternarRefeicaoNoDia(toda, "cafe");
  assert.equal(estadoRefeicao(nada, cafe), "nada");
});

test("mexer numa refeição não apaga o que foi comido em outra", () => {
  let r = alternarAlimentoNoDia(vazio, almoco, "arroz");
  r = alternarAlimentoNoDia(r, cafe, "ovo");
  r = alternarRefeicaoNoDia(r, "cafe");
  assert.ok(comeu(r, almoco, "arroz"));
});

test("resumo do dia: seguido, comido do plano, fora do plano e total", () => {
  let r = alternarRefeicaoNoDia(vazio, "cafe"); // 3 de 5 itens
  r = alternarAlimentoNoDia(r, almoco, "frango"); // 4 de 5
  r = { ...r, extras: [al("chocolate", 270, 3.6)] };
  const s = resumoDia(r, [cafe, almoco]);
  assert.equal(s.itensComidos, 4);
  assert.equal(s.itensTotal, 5);
  assert.equal(s.seguido, 0.8);
  assert.deepEqual(s.plano, { kcal: 592, proteina: 52.5 });
  assert.deepEqual(s.doPlano, { kcal: 464, proteina: 50 });
  assert.deepEqual(s.fora, { kcal: 270, proteina: 3.6 });
  assert.deepEqual(s.total, { kcal: 734, proteina: 53.6 });
});

test("registro antigo (só feitas) e refeição sem alimentos continuam contando", () => {
  const semAlimentos = ref("ceia", []);
  const s = resumoDia({ ...vazio, feitas: ["cafe", "ceia"] }, [cafe, semAlimentos]);
  assert.equal(s.itensComidos, 4);
  assert.equal(s.itensTotal, 4);
  assert.equal(resumoDia(vazio, []).seguido, null);
});
