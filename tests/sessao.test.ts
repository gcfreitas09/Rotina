import { test } from "node:test";
import assert from "node:assert/strict";
import { adicionarSerie, cargaSugerida, concluirSerie, desfazerSerie, formatarDuracao, novaSessao, proximaSerie, relogio, resumoSessao, serieDoExercicio, ultimaVez } from "../src/modules/treino/sessao.ts";
import type { Ficha } from "../src/data/types.ts";

const ficha: Ficha = {
  id: "f1", _m: 0, nome: "Push", dias: [0],
  exercicios: [
    { id: "e1", nome: "Supino", series: 3, reps: 8, repsMax: 10, carga: 20 },
    { id: "e2", nome: "Tríceps", series: 2, reps: 12, carga: 15 },
  ],
};

test("sessão nova segue a ficha: séries, reps do começo da faixa, carga", () => {
  const s = novaSessao(ficha, "2026-11-09", 1000);
  assert.equal(s.id, "ses-2026-11-09-f1");
  assert.equal(s.exercicios[0].series.length, 3);
  assert.deepEqual(s.exercicios[0].series[0], { reps: 8, carga: 20, feita: false });
  assert.equal(s.inicio, 1000);
});

test("a próxima série anda na ordem e volta para a que foi pulada", () => {
  let s = novaSessao(ficha, "2026-11-09", 0);
  assert.deepEqual(proximaSerie(s), { ei: 0, si: 0 });
  s = concluirSerie(s, { ei: 0, si: 0 }, 10, 22.5);
  assert.deepEqual(proximaSerie(s, { ei: 0, si: 0 }), { ei: 0, si: 1 });
  // pulou para o tríceps e fez as 2 séries: a próxima é a série 2 do supino, que ficou para trás
  s = concluirSerie(concluirSerie(s, { ei: 1, si: 0 }, 12, 15), { ei: 1, si: 1 }, 12, 15);
  assert.deepEqual(proximaSerie(s, { ei: 1, si: 1 }), { ei: 0, si: 1 });
  s = concluirSerie(concluirSerie(s, { ei: 0, si: 1 }, 9, 22.5), { ei: 0, si: 2 }, 8, 22.5);
  assert.equal(proximaSerie(s), null);
});

test("série do exercício, desfazer e série extra", () => {
  let s = novaSessao(ficha, "2026-11-09", 0);
  s = concluirSerie(s, { ei: 0, si: 0 }, 10, 22.5);
  assert.deepEqual(serieDoExercicio(s, 0), { ei: 0, si: 1 });
  s = desfazerSerie(s, { ei: 0, si: 0 });
  assert.equal(s.exercicios[0].series[0].feita, false);
  s = adicionarSerie(s, 1);
  assert.equal(s.exercicios[1].series.length, 3);
  assert.deepEqual(s.exercicios[1].series[2], { reps: 12, carga: 15, feita: false });
});

test("carga sugerida = a última usada no exercício", () => {
  let s = novaSessao(ficha, "2026-11-09", 0);
  assert.equal(cargaSugerida(s, { ei: 0, si: 1 }), 20);
  s = concluirSerie(s, { ei: 0, si: 0 }, 10, 25);
  assert.equal(cargaSugerida(s, { ei: 0, si: 1 }), 25);
});

test("última vez: mesma série do último treino concluído", () => {
  const antiga = { ...concluirSerie(concluirSerie(novaSessao(ficha, "2026-11-02", 0), { ei: 0, si: 0 }, 10, 20), { ei: 0, si: 1 }, 9, 20), concluida: true };
  const atual = novaSessao(ficha, "2026-11-09", 0);
  assert.deepEqual(ultimaVez([antiga, atual], atual, "e1", "Supino", 1), { reps: 9, carga: 20, feita: true, data: "2026-11-02" });
  assert.equal(ultimaVez([antiga], atual, "e2", "Tríceps", 0), null);
});

test("resumo: séries, volume, duração e melhor série", () => {
  let s = novaSessao(ficha, "2026-11-09", 0);
  s = concluirSerie(s, { ei: 0, si: 0 }, 10, 20);
  s = concluirSerie(s, { ei: 0, si: 1 }, 8, 22.5);
  const r = resumoSessao({ ...s, fim: 47 * 60_000 }, 0);
  assert.equal(r.seriesFeitas, 2);
  assert.equal(r.seriesTotal, 5);
  assert.equal(r.volume, 380);
  assert.equal(r.duracao, 47 * 60_000);
  assert.deepEqual(r.exercicios[0].melhor, { reps: 8, carga: 22.5, feita: true });
});

test("formata duração e relógio", () => {
  assert.equal(formatarDuracao(42_000), "0:42");
  assert.equal(formatarDuracao(47 * 60_000), "47 min");
  assert.equal(formatarDuracao(65 * 60_000), "1 h 05 min");
  assert.equal(relogio(725_000), "12:05");
  assert.equal(relogio(3_725_000), "1:02:05");
});
