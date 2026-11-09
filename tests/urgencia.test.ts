import { test } from "node:test";
import assert from "node:assert/strict";
import { urgencia } from "../src/modules/tarefas/logica.ts";

const H = "2026-11-08";

test("atrasada é sempre urgente, mesmo com prioridade baixa", () => {
  assert.equal(urgencia("baixa", "2026-11-07", H), "urgente");
  assert.equal(urgencia("media", "2026-10-01", H), "urgente");
});

test("vence hoje: alta urgente, média alta, baixa média", () => {
  assert.equal(urgencia("alta", H, H), "urgente");
  assert.equal(urgencia("media", H, H), "alta");
  assert.equal(urgencia("baixa", H, H), "media");
});

test("vence amanhã: alta alta, média média, baixa tranquila", () => {
  assert.equal(urgencia("alta", "2026-11-09", H), "alta");
  assert.equal(urgencia("media", "2026-11-09", H), "media");
  assert.equal(urgencia("baixa", "2026-11-09", H), "tranquila");
});

test("esta semana (até 7 dias): alta média, média e baixa tranquilas", () => {
  assert.equal(urgencia("alta", "2026-11-13", H), "media");
  assert.equal(urgencia("media", "2026-11-13", H), "tranquila");
  assert.equal(urgencia("baixa", "2026-11-15", H), "tranquila");
});

test("além de 7 dias tudo é tranquilo, até a de prioridade alta", () => {
  assert.equal(urgencia("alta", "2026-11-16", H), "tranquila");
  assert.equal(urgencia("media", "2026-12-25", H), "tranquila");
});

import { filtrar } from "../src/modules/tarefas/logica.ts";
import type { Tarefa } from "../src/data/types.ts";

const tarefa = (id: string, data: string, extra: Partial<Tarefa> = {}): Tarefa => ({
  id, _m: 0, titulo: id, descricao: "", data, prioridade: "media", categoria: "Escola", subtarefas: [],
  recorrencia: { tipo: "nenhuma" }, concluida: false, concluidaEm: null, feitasEm: [], ...extra,
});

test("filtro Semana vale hoje e os próximos 6 dias (domingo vê a segunda)", () => {
  // 08/11/2026 é domingo: a semana de calendário (seg a dom) acaba hoje, mas amanhã tem de aparecer
  const ts = [tarefa("hoje", "2026-11-08"), tarefa("amanha", "2026-11-09"), tarefa("dia6", "2026-11-14"), tarefa("dia7", "2026-11-15"), tarefa("atrasada", "2026-11-01")];
  const ids = (f: "semana" | "hoje") => filtrar(ts, f, H, null).map((l) => l.tarefa.id);
  assert.deepEqual(ids("semana"), ["atrasada", "hoje", "amanha", "dia6"]); // dia 7 (15/11) ainda não
  assert.deepEqual(ids("hoje"), ["atrasada", "hoje"]);
});

test("filtro Semana também traz a próxima ocorrência das tarefas recorrentes", () => {
  const diaria = tarefa("seg", "2026-11-02", { recorrencia: { tipo: "dias", dias: [0] } }); // toda segunda
  assert.equal(filtrar([diaria], "semana", H, null)[0]?.data, "2026-11-09");
});
