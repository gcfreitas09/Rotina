// Gera src/modules/dieta/taco.json: a TACO (Tabela Brasileira de Composição de Alimentos, NEPA/UNICAMP, 4ª ed.)
// com só o que o app usa — kcal, proteína, carboidrato e gordura por 100 g — mais alguns itens que a TACO não tem
// (ou tem sem valores, como o leite integral). Fonte da TACO: https://brolesi.github.io/taco/ (JSON estático).
//   node scripts/taco.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://brolesi.github.io/taco";
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

// Itens fora da TACO. Fonte em cada linha. [nome, kcal, proteína, carboidrato, gordura] por 100 g (ou 100 ml).
const EXTRAS = [
  ["Leite, de vaca, integral", 61, 3.2, 4.8, 3.3, "USDA FDC SR 171265"],
  ["Leite, de vaca, semidesnatado", 42, 3.4, 5, 1, "USDA FDC SR 171269 (1%)"],
  ["Leite, de vaca, desnatado", 34, 3.4, 5, 0.1, "USDA FDC SR 171269"],
  ["Pasta de amendoim, integral", 588, 25.1, 19.6, 50.4, "USDA FDC SR 172470"],
  ["Pão, de forma, tradicional", 266, 7.6, 49.4, 3.3, "USDA FDC SR 172686"],
  ["Macarrão, trigo, cozido", 158, 5.8, 30.9, 0.9, "USDA FDC SR 168928"],
  ["Tilápia, filé, grelhada", 128, 26.2, 0, 2.7, "USDA FDC SR 175177"],
  ["Tilápia, filé, crua", 96, 20.1, 0, 1.7, "USDA FDC SR 175176"],
  ["Queijo, cottage", 98, 11.1, 3.4, 4.3, "USDA FDC SR 173417"],
  ["Iogurte, grego, natural, integral", 97, 9, 4, 5, "USDA FDC SR 170903"],
  ["Whey protein, concentrado", 400, 80, 7, 6, "média de rótulos (30 g = 120 kcal, 24 g de proteína)"],
  ["Goma de tapioca, hidratada", 240, 0, 59, 0, "média de rótulos (20 g = 48 kcal)"],
  ["Peito de peru, defumado, fatiado", 100, 18, 3, 1.5, "média de rótulos"],
  ["Granola, tradicional", 400, 9, 65, 12, "média de rótulos"],
];

const lista = (await (await fetch(`${BASE}/foods.json`)).json()).foods;
const linhas = [];
for (const { id } of lista) {
  const f = await (await fetch(`${BASE}/foods/${id}.json`)).json();
  if (f.energy_kcal == null) continue; // sem energia na TACO (leite UHT, sal, coco verde…): leite vem dos EXTRAS
  // Na TACO, nulo em proteína/carboidrato/gordura com energia presente é traço ("Tr") ou não se aplica: conta 0.
  linhas.push([f.id, f.description.replace(/\/10minutos/g, "").replace(/\s+/g, " ").trim(), Math.round(f.energy_kcal), r1(f.protein_g) ?? 0, r1(f.carbohydrate_g) ?? 0, r1(f.lipids_g) ?? 0]);
}
EXTRAS.forEach(([nome, kcal, p, c, g], i) => linhas.push([1001 + i, nome, kcal, p, c, g]));

const saida = path.join(RAIZ, "src/modules/dieta/taco.json");
fs.writeFileSync(saida, JSON.stringify(linhas));
console.log(`${linhas.length} alimentos → ${path.relative(RAIZ, saida)} (${(fs.statSync(saida).size / 1024).toFixed(1)} KB)`);
