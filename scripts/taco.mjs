// Gera src/modules/dieta/taco.json: a tabela local de alimentos do app (kcal, proteína, carboidrato e gordura por 100 g).
//   1. TACO — Tabela Brasileira de Composição de Alimentos (NEPA/UNICAMP, 4ª ed.), via https://brolesi.github.io/taco/
//   2. USDA (SR Legacy) — preparações que a TACO não tem (macarrão cozido, tilápia…), valores por 100 g.
//   3. Rótulos brasileiros — mediana dos produtos do Brasil na Open Food Facts (https://search.openfoodfacts.org),
//      para itens industrializados comuns (pasta de amendoim, whey, requeijão light…). Exige pelo menos 5 produtos.
//   node scripts/taco.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TACO = "https://brolesi.github.io/taco";
const OFF = "https://search.openfoodfacts.org/search";
const UA = "Rotina/1.0 (app pessoal de organização; gerador da tabela local)";
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// [nome, kcal, proteína, carboidrato, gordura] por 100 g, do USDA SR Legacy (descrição do USDA ao lado).
const USDA = [
  ["Leite, de vaca, integral", 61, 3.2, 4.8, 3.3], // Milk, whole, 3.25% milkfat
  ["Leite, de vaca, semidesnatado", 42, 3.4, 5, 1], // Milk, lowfat, fluid, 1% milkfat
  ["Leite, de vaca, desnatado", 34, 3.4, 5, 0.1], // Milk, nonfat, fluid
  ["Macarrão, trigo, cozido", 158, 5.8, 30.9, 0.9], // Pasta, cooked, enriched
  ["Tilápia, filé, grelhada", 128, 26.2, 0, 2.7], // Fish, tilapia, cooked, dry heat
  ["Tilápia, filé, crua", 96, 20.1, 0, 1.7], // Fish, tilapia, raw
  ["Queijo, cottage", 98, 11.1, 3.4, 4.3], // Cheese, cottage, creamed
  ["Pão, de forma, tradicional", 266, 7.6, 49.4, 3.3], // Bread, white, commercially prepared
  ["Batata, inglesa, assada", 93, 2.5, 21.2, 0.1], // Potatoes, baked, flesh and skin
  ["Arroz, integral, cru", 370, 7.9, 77.2, 2.9], // Rice, brown, long-grain, raw
];

// Industrializados: mediana dos rótulos do Brasil. inclui/exclui/algum filtram pelo nome do produto.
// kcal = faixa plausível por 100 g: muitos cadastros da Open Food Facts trazem o valor de UMA PORÇÃO no campo
// "por 100 g" (pasta de amendoim com 98 kcal, whey com 126); a faixa descarta esses antes da mediana.
const ROTULOS = [
  { nome: "Pasta de amendoim, tradicional", kcal: [500, 700], q: "pasta de amendoim", inclui: ["pasta", "amendoim"], exclui: ["integral", "cacau", "chocolate", "whey", "proteina", "avela", "coco", "doce de leite", "brigadeiro", "power", "crocante"] },
  { nome: "Pasta de amendoim, integral", kcal: [520, 700], q: "pasta de amendoim integral", inclui: ["amendoim", "integral"], exclui: ["cacau", "chocolate", "whey"] },
  { nome: "Pasta de amendoim, com cacau", kcal: [400, 650], q: "pasta de amendoim cacau", inclui: ["amendoim"], exclui: ["whey", "avela"], algum: ["cacau", "chocolate"] },
  { nome: "Pasta de amendoim, com whey", kcal: [450, 650], q: "pasta de amendoim whey", inclui: ["amendoim"], algum: ["whey", "proteina", "power", "fit"] },
  { nome: "Whey protein, concentrado", kcal: [330, 440], q: "whey protein", inclui: ["whey"], exclui: ["barra", "bar", "pasta", "isolado", "isolate", "cookie", "wafer", "bebida"] },
  { nome: "Whey protein, isolado", kcal: [330, 420], q: "whey isolado", inclui: ["whey"], algum: ["isolado", "isolate", "iso"], exclui: ["barra", "bar", "pasta"] },
  { nome: "Goma de tapioca, hidratada", kcal: [200, 280], q: "goma de tapioca", inclui: ["tapioca"], exclui: ["farinha", "biscoito", "recheada", "pao", "sagu"] },
  { nome: "Peito de peru, defumado, fatiado", kcal: [70, 160], q: "peito de peru", inclui: ["peito", "peru"], exclui: ["salsicha", "linguica", "hamburguer"] },
  { nome: "Granola, tradicional", kcal: [330, 480], q: "granola", inclui: ["granola"], exclui: ["barra", "zero", "proteica", "protein"] },
  { nome: "Iogurte, grego, tradicional", kcal: [90, 200], q: "iogurte grego", inclui: ["grego"], exclui: ["zero", "protein", "proteico", "light", "desnatado"] },
  { nome: "Iogurte, grego, zero", kcal: [40, 110], q: "iogurte grego zero", inclui: ["grego"], algum: ["zero", "light", "desnatado"] },
  { nome: "Iogurte, proteico", kcal: [40, 120], q: "iogurte proteina", inclui: ["iogurte"], algum: ["protein", "proteico", "high protein", "pro"] },
  { nome: "Queijo, requeijão, light", kcal: [120, 220], q: "requeijao light", inclui: ["requeijao"], algum: ["light", "zero", "magro"] },
  { nome: "Queijo, cream cheese", kcal: [200, 350], q: "cream cheese", inclui: ["cream", "cheese"], exclui: ["light", "zero"] },
  { nome: "Queijo, mussarela, light", kcal: [200, 300], q: "mussarela light", algum: ["mussarela", "mucarela", "mozarela", "muzzarela"], inclui: ["light"] },
  { nome: "Creme de ricota", kcal: [80, 200], q: "creme de ricota", inclui: ["ricota"], algum: ["creme", "cremosa"] },
  { nome: "Pão, de forma, integral (rótulos)", kcal: [200, 300], q: "pao de forma integral", inclui: ["pao", "integral"], exclui: ["torrada", "bisnaguinha", "hamburguer", "hot dog"] },
  { nome: "Pão, bisnaguinha", kcal: [250, 340], q: "bisnaguinha", inclui: ["bisnaguinha"] },
  { nome: "Pão, de hambúrguer", kcal: [240, 320], q: "pao de hamburguer", inclui: ["pao", "hamburguer"] },
  { nome: "Torrada, integral", kcal: [350, 430], q: "torrada integral", inclui: ["torrada"], exclui: ["frances"] },
  { nome: "Barra de cereal", kcal: [300, 450], q: "barra de cereal", inclui: ["barra"], algum: ["cereal", "cereais"], exclui: ["protein", "proteina"] },
  { nome: "Barra de proteína", kcal: [300, 450], q: "barra de proteina", inclui: ["barra"], algum: ["protein", "proteina", "whey"] },
  { nome: "Proteína de soja texturizada", kcal: [280, 380], q: "proteina de soja texturizada", inclui: ["soja"], algum: ["texturizada", "pts"] },
  { nome: "Cuscuz, flocão de milho", kcal: [330, 380], q: "flocao de milho", algum: ["flocao", "flocos de milho", "cuscuz"], exclui: ["cereal", "matinal", "acucar", "sucrilhos"] },
  { nome: "Macarrão, integral, cru", kcal: [320, 380], q: "macarrao integral", inclui: ["integral"], algum: ["macarrao", "espaguete", "penne", "parafuso", "massa"] },
  { nome: "Doce de leite", kcal: [250, 350], q: "doce de leite", inclui: ["doce", "leite"], exclui: ["pasta de amendoim", "bombom", "biscoito", "sorvete", "chocolate"] },
  { nome: "Leite, de vaca, sem lactose", kcal: [30, 70], q: "leite zero lactose", inclui: ["leite"], algum: ["zero lactose", "sem lactose"], exclui: ["po", "condensado", "creme", "chocolate", "achocolatado"] },
  { nome: "Bebida vegetal, de amêndoas", kcal: [10, 60], q: "bebida de amendoas", algum: ["amendoa", "amendoas"], inclui: ["bebida"] },
  { nome: "Creatina", kcal: [0, 10], q: "creatina", inclui: ["creatina"], exclui: ["capsula"] },
  { nome: "Hambúrguer, de frango", kcal: [150, 280], q: "hamburguer de frango", inclui: ["hamburguer", "frango"] },
  { nome: "Salsicha", kcal: [150, 330], q: "salsicha", inclui: ["salsicha"], exclui: ["vegana", "vegetal"] },
  { nome: "Biscoito, de arroz", kcal: [350, 420], q: "biscoito de arroz", algum: ["biscoito de arroz", "bolacha de arroz", "arroz tufado"] },
];

const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function rotulo({ nome, q, kcal: [kmin, kmax], inclui = [], exclui = [], algum = [] }) {
  const url = new URL(OFF);
  url.searchParams.set("q", `${q} countries_tags:"en:brazil"`);
  url.searchParams.set("page_size", "100");
  url.searchParams.set("fields", "product_name,nutriments");
  const j = await (await fetch(url, { headers: { "User-Agent": UA } })).json();
  const ok = j.hits.filter((h) => {
    const n = norm(h.product_name ?? "");
    const v = h.nutriments ?? {};
    const kcal = v["energy-kcal_100g"] ?? (v["energy-kj_100g"] != null ? v["energy-kj_100g"] / 4.184 : null);
    return n && inclui.every((w) => n.includes(w)) && !exclui.some((w) => n.includes(w)) && (!algum.length || algum.some((w) => n.includes(w)))
      && kcal != null && kcal >= kmin && kcal <= kmax && [v.proteins_100g, v.carbohydrates_100g, v.fat_100g].every((x) => typeof x === "number" && x >= 0 && x <= 100);
  }).map((h) => { const v = h.nutriments; return [v["energy-kcal_100g"] ?? v["energy-kj_100g"] / 4.184, v.proteins_100g, v.carbohydrates_100g, v.fat_100g]; });
  if (ok.length < 5) { console.log(`  pulei ${nome}: só ${ok.length} rótulos`); return null; }
  const m = [0, 1, 2, 3].map((i) => mediana(ok.map((x) => x[i])));
  console.log(`  ${nome}: ${ok.length} rótulos → ${Math.round(m[0])} kcal, ${r1(m[1])} g prot.`);
  return [nome, Math.round(m[0]), r1(m[1]), r1(m[2]), r1(m[3]), `rótulos (${ok.length})`];
}

// 1. TACO
const lista = (await (await fetch(`${TACO}/foods.json`)).json()).foods;
const linhas = [];
for (const { id } of lista) {
  const f = await (await fetch(`${TACO}/foods/${id}.json`)).json();
  if (f.energy_kcal == null) continue; // sem energia na TACO (leite UHT, sal, coco verde…): leite vem do USDA
  // Na TACO, nulo em proteína/carboidrato/gordura com energia presente é traço ("Tr") ou não se aplica: conta 0.
  linhas.push([f.id, f.description.replace(/\/10minutos/g, "").replace(/\s+/g, " ").trim(), Math.round(f.energy_kcal), r1(f.protein_g) ?? 0, r1(f.carbohydrate_g) ?? 0, r1(f.lipids_g) ?? 0]);
}
console.log(`TACO: ${linhas.length}`);
// 2. USDA (ids 1001+)
USDA.forEach(([nome, kcal, p, c, g], i) => linhas.push([1001 + i, nome, kcal, p, c, g, "USDA"]));
// 3. Rótulos (ids 2001+; o id é fixo pela posição na lista, então só acrescente no fim)
console.log("Rótulos (Open Food Facts):");
for (const [i, r] of ROTULOS.entries()) {
  const l = await rotulo(r).catch((e) => (console.log(`  erro em ${r.nome}: ${e.message}`), null));
  if (l) linhas.push([2001 + i, ...l]);
  await pausa(1200); // gentil com a API pública
}

const saida = path.join(RAIZ, "src/modules/dieta/taco.json");
fs.writeFileSync(saida, JSON.stringify(linhas));
console.log(`${linhas.length} alimentos → ${path.relative(RAIZ, saida)} (${(fs.statSync(saida).size / 1024).toFixed(1)} KB)`);
