import { test } from "node:test";
import assert from "node:assert/strict";
import { montarConsulta, ranquear, type DocOL } from "../src/modules/leitura/catalogo.ts";

test("consulta: última palavra vira prefixo e as palavras de ligação saem", () => {
  assert.equal(montarConsulta("dom casmu"), "title:(dom casmu*)");
  assert.equal(montarConsulta("A Hora da Estrela"), "title:(hora estrela*)");
  assert.equal(montarConsulta("O Pequeno Príncipe"), "title:(pequeno principe*)");
  assert.equal(montarConsulta("ab"), null);
  assert.equal(montarConsulta("  "), null);
  assert.equal(montarConsulta("de da"), null);
});

const d = (title: string, autor: string | undefined, extra: Partial<DocOL> = {}): DocOL => ({ key: "/works/" + title, title, author_name: autor ? [autor] : undefined, ...extra });

test("ranking: obra conhecida em português primeiro, ruído fora ou no fim", () => {
  const docs: DocOL[] = [
    d("Dom Casmurro : a Novel", "Joaquim Maria Machado de Assis", { language: ["por"] }),
    d("Resumo de Dom Casmurro", "Speed Read Publishing", { language: ["por"], edition_count: 1 }),
    d("Dom Casmurro", "Machado de Assis", { language: ["por", "eng"], number_of_pages_median: 269, edition_count: 112, first_publish_year: 1899, cover_i: 7 }),
    d("Fashion and Irony in «Dom Casmurro»", "Geanneti Tavares Salomon", { edition_count: 4 }),
    d("Cuaderno", "Cool Libreta", { edition_count: 2442 }),
  ];
  const r = ranquear(docs, "dom casmu");
  assert.equal(r[0].titulo, "Dom Casmurro");
  assert.equal(r[0].autor, "Machado de Assis");
  assert.equal(r[0].paginas, 269);
  assert.equal(r[0].ano, 1899);
  assert.equal(r[0].capa, "https://covers.openlibrary.org/b/id/7-S.jpg");
  assert.ok(!r.some((x) => x.titulo === "Cuaderno"), "não bate com o que foi digitado");
  assert.ok(r.findIndex((x) => x.titulo.startsWith("Resumo")) > r.findIndex((x) => x.titulo === "Dom Casmurro : a Novel"), "resumo vai para o fim");
});

test("tira edições repetidas e exige todas as palavras digitadas", () => {
  const docs: DocOL[] = [
    d("O Pequeno Príncipe", "Antoine de Saint-Exupéry", { number_of_pages_median: 111, language: ["por"] }),
    d("O Pequeno Principe", "Antoine de Saint-Exupéry", { number_of_pages_median: 70, language: ["por"] }),
    d("Little Wooden Robot and the Log Princess", "Tom Gauld"),
    d("Pequeno príncipe", undefined),
  ];
  const r = ranquear(docs, "pequeno princ");
  assert.equal(r.filter((x) => x.autor.startsWith("Antoine")).length, 1);
  assert.ok(!r.some((x) => /Robot/.test(x.titulo)));
  assert.equal(r[0].autor, "Antoine de Saint-Exupéry");
});

test("limite de opções e título sem páginas fica sem páginas", () => {
  const docs = Array.from({ length: 20 }, (_, i) => d(`Dom Casmurro ${i}`, "Autor " + i));
  assert.equal(ranquear(docs, "dom casmu").length, 6);
  assert.equal(ranquear([d("Dom Casmurro", "Machado")], "dom casmu")[0].paginas, undefined);
});
