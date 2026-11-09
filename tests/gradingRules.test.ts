import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blocoProvas, calcularSemestre, calcularMateria, recuperacaoNecessaria, exameNecessario,
  faltaNoSemestre, validarNota, type NotasSemestre,
} from "../src/config/gradingRules.ts";

const sem = (p: Partial<NotasSemestre>): NotasSemestre => ({ p1: null, p2: null, t1: null, t2: null, extra: null, rec: null, ...p });
const regras = { mediaAprovacao: 7, minimoExame: 5 };

test("semestre é soma simples", () => {
  assert.equal(calcularSemestre(sem({ p1: 3, p2: 2.5, t1: 1.5, t2: 1 })).nota, 8);
});

test("recuperação segue (P1+P2+2×Rec)/3, como no documento da escola", () => {
  // P1+P2 = 2,0 e Rec = 4,0 → (2 + 8)/3 = 3,333…
  assert.equal(blocoProvas({ p1: 1, p2: 1, rec: 4 }).final, 3.333);
  assert.equal(blocoProvas({ p1: 1.5, p2: 2, rec: 5 }).final, 4.5); // (3,5 + 10)/3
  // o app antigo dividia por 2 e dava 6,75 aqui
});

test("recuperação nota máxima não passa de 7,0 sozinha", () => {
  assert.equal(blocoProvas({ p1: 3.5, p2: 3.5, rec: 7 }).final, 7); // (7 + 14)/3
  assert.equal(blocoProvas({ p1: 0, p2: 0, rec: 7 }).final, 4.667); // 14/3
  const s = calcularSemestre(sem({ p1: 1.5, p2: 1.5, t1: 2, t2: 1, rec: 7 }));
  assert.equal(s.nota, 8.667); // (3 + 14)/3 = 5,667 + 3 dos trabalhos
});

test("recuperação só conta se trouxer benefício (senão fica P1+P2)", () => {
  const b = blocoProvas({ p1: 3, p2: 3, rec: 1 });
  assert.equal(b.final, 6);
  assert.equal(b.usouRecuperacao, false);
  // empate também não conta: (4 + 8)/3 = 4
  assert.equal(blocoProvas({ p1: 2, p2: 2, rec: 4 }).usouRecuperacao, false);
  // rec abaixo das provas juntas: (3,5 + 6)/3 = 3,17 < 3,5
  const c = blocoProvas({ p1: 1.5, p2: 2, rec: 3 });
  assert.equal(c.final, 3.5);
  assert.equal(c.usouRecuperacao, false);
});

test("ponto extra soma só até 10", () => {
  assert.equal(calcularSemestre(sem({ p1: 3, p2: 3, t1: 1, t2: 0.5, extra: 0.5 })).nota, 8);
  const cheio = calcularSemestre(sem({ p1: 3.5, p2: 3.3, t1: 2, t2: 1, extra: 0.5 }));
  assert.equal(cheio.nota, 10);
  assert.equal(cheio.extraAplicado, 0.2);
  assert.equal(calcularSemestre(sem({ p1: 3.5, p2: 3.5, t1: 2, t2: 1, extra: 0.5 })).extraAplicado, 0);
});

test("situação: aprovado, em exame, reprovado, aprovado após exame", () => {
  const bom = sem({ p1: 3, p2: 3, t1: 2, t2: 1 }); // 9
  const ruim = sem({ p1: 1, p2: 1, t1: 1, t2: 0.5, rec: 4 }); // bloco (2+8)/3=3,333 → 4,833
  assert.equal(calcularMateria([bom, bom], null, regras).situacao, "Aprovado");
  const m = calcularMateria([bom, ruim], null, regras); // anual (9 + 4,833)/2 = 6,917
  assert.equal(m.anual, 6.917);
  assert.equal(m.situacao, "Em exame");
  assert.equal(calcularMateria([bom, ruim], 3, regras).situacao, "Reprovado"); // (6,917+3)/2=4,958
  assert.equal(calcularMateria([bom, ruim], 4, regras).situacao, "Aprovado"); // 5,458
});

test("situação: em recuperação quando provas lançadas e não dá mais para chegar à média", () => {
  const s = sem({ p1: 1, p2: 1 }); // 2 + até 3 de trabalhos = 5 < 7
  assert.equal(calcularMateria([s, sem({})], null, regras).situacao, "Em recuperação");
});

test("quanto preciso na recuperação (fórmula invertida, ÷ 3)", () => {
  const s = sem({ p1: 1, p2: 1, t1: 2, t2: 1 }); // 5; alvo bloco 4 → rec = (3×4 − 2)/2 = 5
  const r = recuperacaoNecessaria(s, 7);
  assert.deepEqual(r, { tipo: "precisa", valor: 5, maximo: 7 });
  // conferindo de volta: com essa nota o semestre chega na média
  assert.equal(calcularSemestre({ ...s, rec: 5 }).nota, 7);
  // sem nada nas provas e nos trabalhos, mesmo 7 na recuperação (bloco 4,667) não chega a 7
  const s2 = sem({ p1: 0, p2: 0, t1: 0, t2: 0 });
  assert.equal(recuperacaoNecessaria(s2, 7).tipo, "impossivel");
  // para média 5 com P1+P2 = 2 e sem trabalhos: bloco alvo 5 → rec = (15 − 2)/2 = 6,5
  assert.deepEqual(recuperacaoNecessaria(sem({ p1: 1, p2: 1, t1: 0, t2: 0 }), 5), { tipo: "precisa", valor: 6.5, maximo: 7 });
});

test("quanto preciso no exame = 2×mínimo − anual", () => {
  assert.deepEqual(exameNecessario(6, 5), { tipo: "precisa", valor: 4, maximo: 10 });
  assert.equal(exameNecessario(-1, 5).tipo, "impossivel");
});

test("quanto falta no semestre", () => {
  const f = faltaNoSemestre(sem({ p1: 3, t1: 2 }), 7); // tem 5, falta 2 em P2+T2 (máx 4,5)
  assert.equal(f.tipo, "precisa");
  assert.equal(f.tipo === "precisa" && f.valor, 2);
  assert.deepEqual(f.pendentes, ["p2", "t2"]);
  assert.equal(faltaNoSemestre(sem({ p1: 0, p2: 0, t1: 0 }), 7).tipo, "impossivel");
});

test("validação de máximo", () => {
  assert.equal(validarNota("p1", 3.5), null);
  assert.match(validarNota("p1", 3.6) ?? "", /máximo 3,5/);
  assert.match(validarNota("extra", 0.6) ?? "", /máximo 0,5/);
});
