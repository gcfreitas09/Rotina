import { test } from "node:test";
import assert from "node:assert/strict";
import { encerrar, lidoNoDia, linkAtalho, previsao, ritmo, sequencia, sessaoAtiva } from "../src/modules/leitura/logica.ts";
import type { Leitura, Livro } from "../src/data/types.ts";

const livro: Livro = { id: "l1", _m: 0, titulo: "Dom Casmurro", autor: "Machado de Assis", paginas: 256, pagina: 40, estado: "lendo" };
const sessao = (data: string, min: number, de: number, ate: number | null, id = data + min): Leitura =>
  ({ id, _m: 0, livroId: "l1", data, inicio: 0, planejadoMin: 30, fim: ate === null ? null : min * 60000, paginaInicio: de, paginaFim: ate });

test("soma páginas e minutos do dia, sem contar a sessão aberta", () => {
  const ls = [sessao("2026-11-08", 25, 40, 52), sessao("2026-11-08", 10, 52, 58), sessao("2026-11-08", 0, 58, null, "aberta"), sessao("2026-11-07", 30, 20, 40)];
  assert.deepEqual(lidoNoDia(ls, "2026-11-08"), { paginas: 18, minutos: 35 });
  assert.equal(sessaoAtiva(ls)?.id, "aberta");
});

test("sequência de dias lendo", () => {
  const ls = [sessao("2026-11-06", 20, 1, 10), sessao("2026-11-07", 20, 10, 20)];
  assert.equal(sequencia(ls, "2026-11-08"), 2); // hoje ainda não leu: conta até ontem
  assert.equal(sequencia([...ls, sessao("2026-11-08", 15, 20, 25)], "2026-11-08"), 3);
  assert.equal(sequencia([sessao("2026-11-05", 20, 1, 10)], "2026-11-08"), 0);
});

test("encerrar guarda a página e marca o livro como lido no fim", () => {
  const a = sessao("2026-11-08", 0, 40, null);
  const r = encerrar(a, livro, 63, 1_500_000, "2026-11-08");
  assert.equal(r.leitura.fim, 1_500_000);
  assert.equal(r.leitura.paginaFim, 63);
  assert.equal(r.livro.pagina, 63);
  assert.equal(r.livro.estado, "lendo");
  const fim = encerrar(a, livro, 300, 1, "2026-11-08");
  assert.equal(fim.livro.pagina, 256);
  assert.equal(fim.livro.estado, "lido");
  assert.equal(fim.livro.concluidoEm, "2026-11-08");
  assert.equal(encerrar(a, livro, 10, 1, "2026-11-08").leitura.paginaFim, 40); // voltou página: não conta negativo
});

test("ritmo e previsão", () => {
  assert.equal(ritmo([]), null);
  assert.equal(ritmo([sessao("2026-11-08", 30, 40, 55)]), 0.5);
  assert.deepEqual(previsao(livro, 20), { faltam: 216, dias: 11 });
});

test("link do atalho do iPhone volta para o app", () => {
  const u = linkAtalho("Iniciar leitura", 30, "https://rotina-gcf.vercel.app/#/mais/leitura/agora");
  assert.ok(u.startsWith("shortcuts://x-callback-url/run-shortcut?name=Iniciar%20leitura&input=text&text=30&x-success=https"));
  assert.ok(u.includes(encodeURIComponent("#/mais/leitura/agora")));
});

import { minutosPara, urlDeVolta } from "../src/modules/leitura/logica.ts";

test("o atalho devolve para o web app da Tela de Início (webapp://) e, no Safari, para a página", () => {
  assert.equal(urlDeVolta(true, "https://rotina-gcf.vercel.app", "rotina-gcf.vercel.app", "/", "#/mais/leitura/agora"), "webapp://rotina-gcf.vercel.app");
  assert.equal(urlDeVolta(false, "https://rotina-gcf.vercel.app", "rotina-gcf.vercel.app", "/", "#/mais/leitura"), "https://rotina-gcf.vercel.app/#/mais/leitura");
});

test("minutos que o atalho recebe para ligar o Foco até o fim certo", () => {
  assert.equal(minutosPara(30 * 60000, 0), 30);
  assert.equal(minutosPara(30 * 60000, 60_001), 29); // 28 min e 59 s → 29
  assert.equal(minutosPara(0, 5 * 60000), 1); // nunca menos de 1
  const u = linkAtalho("Iniciar leitura", 35, "webapp://rotina-gcf.vercel.app");
  assert.ok(u.includes(`x-success=${encodeURIComponent("webapp://rotina-gcf.vercel.app")}`));
});
