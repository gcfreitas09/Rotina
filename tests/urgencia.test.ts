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
