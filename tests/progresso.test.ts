import { test } from "node:test";
import assert from "node:assert/strict";
import { e1rm, historico, resumoProgresso, tendencia } from "../src/modules/treino/progresso.ts";
import { novaSessao } from "../src/modules/treino/sessao.ts";
import type { Ficha, Sessao } from "../src/data/types.ts";

const ses = (data: string, nome: string, series: [number, number, boolean?][], concluida = false): Sessao => ({
  id: `ses-${data}-${nome}`, _m: 0, data, fichaId: "f", fichaNome: "Push", concluida,
  exercicios: [{ exercicioId: "e-" + nome, nome, series: series.map(([carga, reps, feita = true]) => ({ carga, reps, feita })) }],
});

test("1RM estimado (Epley)", () => {
  assert.equal(e1rm({ carga: 20, reps: 10 }), 26.7);
  assert.equal(e1rm({ carga: 100, reps: 1 }), 100);
});

test("histórico conta toda série concluída, mesmo sem 'Salvar treino'", () => {
  const h = historico([
    ses("2026-11-02", "Supino", [[20, 10], [22.5, 8], [25, 3, false]]), // não concluída: não conta
    ses("2026-11-09", "Supino", [[22.5, 10], [22.5, 9]], true),
  ], "supino ");
  assert.equal(h.length, 2);
  assert.deepEqual(h[0].series, [{ carga: 20, reps: 10 }, { carga: 22.5, reps: 8 }]);
  assert.deepEqual(h[0].melhor, { carga: 22.5, reps: 8 }); // 22,5×8 (28,5) > 20×10 (26,7)
  assert.equal(h[0].volume, 380);
  assert.equal(h[1].e1rm, 30);
});

test("tendência: subindo, estável, caindo e primeiro treino", () => {
  const sobe = tendencia(historico([ses("2026-10-01", "A", [[20, 10]]), ses("2026-10-08", "A", [[20, 10]]), ses("2026-10-15", "A", [[22.5, 10]])], "A"))!;
  assert.equal(sobe.tipo, "subindo");
  assert.equal(sobe.variacao, 2.5);
  assert.equal(sobe.desde, "2026-10-01");
  const parado = tendencia(historico([ses("2026-10-01", "A", [[20, 10]]), ses("2026-10-08", "A", [[20, 10]]), ses("2026-10-15", "A", [[20, 10]])], "A"))!;
  assert.equal(parado.tipo, "estavel");
  assert.equal(parado.mesmaCargaHa, 3);
  const cai = tendencia(historico([ses("2026-10-01", "A", [[30, 8]]), ses("2026-10-08", "A", [[25, 8]])], "A"))!;
  assert.equal(cai.tipo, "caindo");
  assert.equal(cai.recorde.data, "2026-10-01");
  assert.equal(tendencia(historico([ses("2026-10-01", "A", [[30, 8]])], "A"))!.tipo, "inicio");
  // mais repetições com o mesmo peso também é evolução
  assert.equal(tendencia(historico([ses("2026-10-01", "A", [[20, 8]]), ses("2026-10-08", "A", [[20, 12]])], "A"))!.tipo, "subindo");
});

test("resumo: todos os exercícios com registro, do treinado mais recente primeiro", () => {
  const r = resumoProgresso([ses("2026-10-01", "Remada", [[30, 10]]), ses("2026-11-01", "Supino", [[20, 10]]), ses("2026-11-02", "Nada", [[10, 10, false]])]);
  assert.deepEqual(r.map((x) => x.nome), ["Supino", "Remada"]);
});

test("treino novo começa com o peso da última vez em cada série (não o da ficha)", () => {
  const ficha: Ficha = { id: "f", _m: 0, nome: "Push", dias: [0], exercicios: [{ id: "e-Supino", nome: "Supino", series: 3, reps: 8, carga: 10 }] };
  const ant = ses("2026-11-02", "Supino", [[20, 10], [22.5, 8]]);
  const s = novaSessao(ficha, "2026-11-09", 0, [ant]);
  assert.deepEqual(s.exercicios[0].series.map((x) => x.carga), [20, 22.5, 22.5]); // a 3ª série repete a última feita
  assert.deepEqual(novaSessao(ficha, "2026-11-09", 0).exercicios[0].series.map((x) => x.carga), [10, 10, 10]);
});
