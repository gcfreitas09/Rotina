// Busca de produtos brasileiros na Open Food Facts (tabela nutricional dos rótulos, por 100 g).
// Usado pela função do Vercel (api/alimentos.js) e pelo servidor local do Vite (vite.config.ts).
// A API pública não manda cabeçalho CORS, por isso o navegador não chama direto: passa por aqui.
const OFF = "https://search.openfoodfacts.org/search";
const UA = "Rotina/1.0 (app pessoal de organização; https://rotina-gcf.vercel.app)";

const limpo = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const r1 = (v) => Math.round(v * 10) / 10;

/** Converte um produto da Open Food Facts; null se faltar kcal ou proteína por 100 g, ou se os valores forem impossíveis. */
export function converterOFF(h) {
  const v = h?.nutriments ?? {};
  const kcal = typeof v["energy-kcal_100g"] === "number" ? v["energy-kcal_100g"] : typeof v["energy-kj_100g"] === "number" ? v["energy-kj_100g"] / 4.184 : null;
  const prot = v.proteins_100g;
  const nome = limpo(h?.product_name_pt || h?.product_name);
  if (!nome || kcal === null || typeof prot !== "number") return null;
  if (kcal < 0 || kcal > 900 || prot < 0 || prot > 100) return null;
  const marca = limpo(Array.isArray(h.brands) ? h.brands[0] : String(h.brands ?? "").split(",")[0]);
  const porcao = typeof h.serving_quantity === "number" && h.serving_quantity > 0 && h.serving_quantity < 2000 ? r1(h.serving_quantity) : undefined;
  return { codigo: String(h.code ?? ""), nome, marca: marca || undefined, kcal100: Math.round(kcal), prot100: r1(prot), porcao };
}

export async function buscarOFF(q, limite = 8) {
  const url = new URL(OFF);
  url.searchParams.set("q", `${q} countries_tags:"en:brazil"`);
  url.searchParams.set("page_size", "30");
  url.searchParams.set("langs", "pt");
  url.searchParams.set("fields", "code,product_name,product_name_pt,brands,nutriments,serving_quantity");
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`Open Food Facts respondeu ${r.status}`);
  const j = await r.json();
  const vistos = new Set();
  const itens = [];
  for (const h of j.hits ?? []) {
    const c = converterOFF(h);
    if (!c) continue;
    const chave = `${c.nome}|${c.marca}`.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    itens.push(c);
    if (itens.length >= limite) break;
  }
  return itens;
}

/** Resposta HTTP da busca (mesma no Vercel e no servidor local). */
export async function responderBusca(url) {
  const q = limpo(new URL(url).searchParams.get("q"));
  if (q.length < 2 || q.length > 80) return Response.json({ itens: [] }, { status: 400 });
  try {
    const itens = await buscarOFF(q);
    return Response.json({ itens }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ itens: [], erro: "indisponivel" }, { status: 502 });
  }
}
