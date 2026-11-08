import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PREFERIDO, buscarAlimentos, calcular, lerQuantidade, quaseIgual, type Encontrado, type LinhaTaco } from "../src/modules/dieta/nutricao.ts";
// @ts-ignore módulo JS (função do Vercel)
import { converterOFF } from "../api/_off.js";

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
  assert.equal(primeiro("pasta de amendoim"), "Pasta de amendoim, tradicional");
  assert.equal(primeiro("pasta de amendoim integral"), "Pasta de amendoim, integral");
  assert.equal(primeiro("pasta de amendoin"), "Pasta de amendoim, tradicional"); // erro de digitação
  assert.equal(primeiro("mussarella"), "Queijo, mozarela");
  assert.equal(primeiro("requeijão light"), "Queijo, requeijão, light");
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
  assert.equal(ok("whey", "1 scoop").gramas, 30);
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

test("erro de uma letra ainda casa", () => {
  assert.ok(quaseIgual("amendoim", "amendoin"));
  assert.ok(quaseIgual("mozarela", "mozzarela"));
  assert.ok(!quaseIgual("arroz", "frango"));
});

test("produto de marca: usa os valores do rótulo e a porção dele", () => {
  const p: Encontrado = { id: "off:1", nome: "Pasta de Amendoim", kcal100: 600, prot100: 23.3, fonte: "Open Food Facts", marca: "Santo Óleo", porcao: 15 };
  const r = calcular(tabela, "qualquer", "1 porção", p);
  assert.ok(r.ok && r.calculo.gramas === 15 && r.calculo.kcal === 90 && r.calculo.proteina === 3.5);
  const c = calcular(tabela, "x", "2 colheres de sopa", p); // medida caseira pelo nome (pasta de amendoim = 16 g)
  assert.ok(c.ok && c.calculo.gramas === 32);
  const b: Encontrado = { id: "off:2", nome: "Barra Protein Crisp", kcal100: 380, prot100: 30, fonte: "Open Food Facts", porcao: 45 };
  const u = calcular(tabela, "x", "1 barra", b);
  assert.ok(u.ok && u.calculo.gramas === 45);
});

test("converte produto da Open Food Facts e recusa valores impossíveis", () => {
  assert.deepEqual(
    converterOFF({ code: 789, product_name: " Pasta  De Amendoim ", brands: ["Santo Óleo"], nutriments: { "energy-kcal_100g": 600.4, proteins_100g: 23.33 }, serving_quantity: 15 }),
    { codigo: "789", nome: "Pasta De Amendoim", marca: "Santo Óleo", kcal100: 600, prot100: 23.3, porcao: 15 },
  );
  assert.equal(converterOFF({ product_name: "Whey", nutriments: { "energy-kj_100g": 1674, proteins_100g: 80 } }).kcal100, 400); // só kJ
  assert.equal(converterOFF({ product_name: "X", nutriments: { "energy-kcal_100g": 1200, proteins_100g: 5 } }), null);
  assert.equal(converterOFF({ product_name: "X", nutriments: { "energy-kcal_100g": 100 } }), null);
  assert.equal(converterOFF({ product_name: "", nutriments: { "energy-kcal_100g": 100, proteins_100g: 5 } }), null);
});
