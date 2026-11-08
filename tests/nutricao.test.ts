import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PREFERIDO, buscarAlimentos, calcular, lerQuantidade, type LinhaTaco } from "../src/modules/dieta/nutricao.ts";

const tabela: LinhaTaco[] = JSON.parse(readFileSync(new URL("../src/modules/dieta/taco.json", import.meta.url), "utf8"));
const ok = (nome: string, qtd: string) => {
  const r = calcular(tabela, nome, qtd);
  assert.ok(r.ok, `${nome} / ${qtd}: ${!r.ok && r.motivo}`);
  return r.calculo;
};

test("todo preferido aponta para um nome que existe na tabela", () => {
  const nomes = new Set(tabela.map((l) => l[1]));
  const faltando = Object.values(PREFERIDO).filter((n) => !nomes.has(n));
  assert.deepEqual(faltando, []);
});

test("valores da TACO conferem com a tabela oficial (por 100 g)", () => {
  const f = (n: string) => tabela.find((l) => l[1] === n)!;
  assert.deepEqual(f("Feijão, carioca, cozido").slice(2, 4), [76, 4.8]);
  assert.deepEqual(f("Arroz, tipo 1, cozido").slice(2, 4), [128, 2.5]);
  assert.deepEqual(f("Ovo, de galinha, inteiro, cozido").slice(2, 4), [146, 13.3]);
  assert.deepEqual(f("Frango, peito, sem pele, grelhado").slice(2, 4), [159, 32]);
});

test("lê quantidades do jeito que a gente escreve", () => {
  assert.deepEqual(lerQuantidade("150 g"), { n: 150, medida: "g" });
  assert.deepEqual(lerQuantidade("150g"), { n: 150, medida: "g" });
  assert.deepEqual(lerQuantidade("2 colheres de sopa"), { n: 2, medida: "colher-sopa" });
  assert.deepEqual(lerQuantidade("1 colher de chá"), { n: 1, medida: "colher-cha" });
  assert.deepEqual(lerQuantidade("1/2 xícara"), { n: 0.5, medida: "xicara" });
  assert.deepEqual(lerQuantidade("meia xícara"), { n: 0.5, medida: "xicara" });
  assert.deepEqual(lerQuantidade("1 e meia xícara"), { n: 1.5, medida: "xicara" });
  assert.deepEqual(lerQuantidade("1 1/2 copo"), { n: 1.5, medida: "copo" });
  assert.deepEqual(lerQuantidade("1,5 copo"), { n: 1.5, medida: "copo" });
  assert.deepEqual(lerQuantidade("um ovo inteiro"), { n: 1, medida: "unidade" });
  assert.deepEqual(lerQuantidade("2 ovos"), { n: 2, medida: "unidade" });
  assert.deepEqual(lerQuantidade("300 ml"), { n: 300, medida: "ml" });
  assert.deepEqual(lerQuantidade("1 litro"), { n: 1000, medida: "ml" });
  assert.deepEqual(lerQuantidade("1 scoop"), { n: 1, medida: "scoop" });
  assert.deepEqual(lerQuantidade("2"), { n: 2, medida: null });
  assert.equal(lerQuantidade(""), null);
  assert.equal(lerQuantidade("à vontade"), null);
});

test("acha o alimento pelo nome comum", () => {
  const primeiro = (t: string) => buscarAlimentos(tabela, t, 1)[0]?.nome;
  assert.equal(primeiro("ovo"), "Ovo, de galinha, inteiro, cozido");
  assert.equal(primeiro("Ovos"), "Ovo, de galinha, inteiro, cozido");
  assert.equal(primeiro("ovo frito"), "Ovo, de galinha, inteiro, frito");
  assert.equal(primeiro("arroz"), "Arroz, tipo 1, cozido");
  assert.equal(primeiro("arroz integral"), "Arroz, integral, cozido");
  assert.equal(primeiro("Feijão preto"), "Feijão, preto, cozido");
  assert.equal(primeiro("peito de frango"), "Frango, peito, sem pele, grelhado");
  assert.equal(primeiro("frango desfiado"), "Frango, peito, sem pele, cozido");
  assert.equal(primeiro("pão francês"), "Pão, trigo, francês");
  assert.equal(primeiro("pão de forma"), "Pão, de forma, tradicional");
  assert.equal(primeiro("leite"), "Leite, de vaca, integral");
  assert.equal(primeiro("leite desnatado"), "Leite, de vaca, desnatado");
  assert.equal(primeiro("banana"), "Banana, prata, crua");
  assert.equal(primeiro("aveia"), "Aveia, flocos, crua");
  assert.equal(primeiro("whey"), "Whey protein, concentrado");
  assert.equal(primeiro("pasta de amendoim"), "Pasta de amendoim, integral");
  assert.equal(primeiro("queijo mussarela"), "Queijo, mozarela");
  assert.equal(primeiro("tapioca"), "Goma de tapioca, hidratada");
  assert.equal(primeiro("batata doce"), "Batata, doce, cozida");
  assert.equal(primeiro("carne moída"), "Carne, bovina, acém, moído, cozido");
  assert.equal(primeiro("azeite"), "Azeite, de oliva, extra virgem");
  assert.equal(primeiro("café"), "Café, infusão 10%");
  assert.equal(primeiro("xyzw"), undefined);
});

test("calcula kcal e proteína pela quantidade", () => {
  const ovo = ok("ovo", "1 ovo inteiro");
  assert.equal(ovo.gramas, 50);
  assert.equal(ovo.kcal, 73); // 146 × 0,5
  assert.equal(ovo.proteina, 6.7);
  assert.equal(ovo.como, "1 unidade ≈ 50 g");

  assert.equal(ok("ovos", "2").gramas, 100); // só número pequeno com unidade conhecida = unidades
  assert.equal(ok("arroz", "150").gramas, 150); // arroz não tem "unidade": número vira grama
  assert.equal(ok("arroz", "4 colheres de sopa").gramas, 100);
  assert.equal(ok("aveia", "2 colheres de sopa").kcal, Math.round(394 * 0.3));
  const frango = ok("peito de frango", "120 g");
  assert.equal(frango.kcal, Math.round(159 * 1.2));
  assert.equal(frango.proteina, 38.4);
  assert.equal(ok("leite", "1 copo").gramas, 200);
  assert.equal(ok("whey", "1 scoop").proteina, 24);
  assert.equal(ok("pão francês", "1 unidade").kcal, 150);
  assert.equal(ok("azeite", "1 colher de sopa").gramas, 13);
  assert.equal(ok("feijão", "1 concha").gramas, 100);
});

test("diz o que faltou quando não dá para calcular", () => {
  const sem = calcular(tabela, "xyzw", "100 g");
  assert.equal(sem.ok, false);
  assert.equal(!sem.ok && sem.motivo, "sem-alimento");
  const semQtd = calcular(tabela, "arroz", "");
  assert.equal(!semQtd.ok && semQtd.motivo, "sem-quantidade");
  const medida = calcular(tabela, "arroz", "2 unidades");
  assert.equal(!medida.ok && medida.motivo, "medida-desconhecida");
});

test("o alimento escolhido na lista (ref) vence a busca pelo nome", () => {
  const id = tabela.find((l) => l[1] === "Ovo, de galinha, inteiro, frito")![0];
  const r = calcular(tabela, "ovo", "1", id);
  assert.ok(r.ok && r.calculo.alimento.nome === "Ovo, de galinha, inteiro, frito");
});
