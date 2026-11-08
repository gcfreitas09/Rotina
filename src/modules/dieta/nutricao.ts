/**
 * Cálculo automático de calorias e proteína de um alimento a partir do nome e da quantidade escrita
 * ("2 ovos", "3 colheres de sopa", "1/2 xícara", "150 g"). Valores por 100 g vêm da TACO
 * (taco.json, gerado por scripts/taco.mjs). Medidas caseiras são aproximações (tabela abaixo).
 */

/** [id, nome TACO, kcal, proteína g, carboidrato g, gordura g] por 100 g. */
export type LinhaTaco = [number, string, number, number, number, number, string?];

/** Alimento escolhido para o cálculo: da tabela local (id numérico) ou um produto da Open Food Facts (id "off:…"). */
export interface Encontrado {
  id: number | string;
  nome: string;
  kcal100: number;
  prot100: number;
  /** "TACO", "USDA", "rótulos (14)" ou "Open Food Facts". */
  fonte: string;
  marca?: string;
  /** Porção do rótulo em g (produtos de marca). */
  porcao?: number;
}

const daLinha = (l: LinhaTaco): Encontrado => ({ id: l[0], nome: l[1], kcal100: l[2], prot100: l[3], fonte: (l[6] ?? "TACO").replace(/^rótulos \((\d+)\)$/, "mediana de $1 rótulos") });

// ------------------------------------------------------------------ texto

export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9/.,½¼¾ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Singular simples, para "ovos" casar com "ovo" e "bananas" com "banana". */
function radical(p: string): string {
  if (p.length > 4 && p.endsWith("oes")) return p.slice(0, -3) + "ao";
  if (p.length > 4 && p.endsWith("aes")) return p.slice(0, -3) + "ao";
  if (p.length > 4 && p.endsWith("es") && /[rsz]es$/.test(p)) return p.slice(0, -2);
  if (p.length > 3 && p.endsWith("s")) return p.slice(0, -1);
  return p;
}

const IGNORAR = new Set(["de", "da", "do", "das", "dos", "e", "com", "a", "o", "em", "tipo", "no", "na"]);

/** Como as pessoas escrevem → como a TACO escreve. */
const SINONIMOS: Record<string, string> = {
  mussarela: "mozarela", mucarela: "mozarela", muzarela: "mozarela",
  mignon: "mingnon", desfiado: "cozido", desfiada: "cozido", mexido: "frito", mexidos: "frito",
  file: "file", bife: "bovina", carne: "carne", patinho: "patinho",
  macarrao: "macarrao", espaguete: "macarrao", massa: "macarrao",
  whey: "whey", proteina: "whey", aipim: "mandioca", macaxeira: "mandioca",
  cha: "cha", suco: "suco", tapioca: "tapioca", goma: "goma",
};

function palavras(t: string): string[] {
  return normalizar(t)
    .replace(/[0-9/.,½¼¾]+/g, " ")
    .split(" ")
    .filter((p) => p && !IGNORAR.has(p))
    .map((p) => SINONIMOS[p] ?? (p.length >= 6 ? SINONIMOS[Object.keys(SINONIMOS).find((k) => k.length >= 6 && quaseIgual(k, p)) ?? ""] : undefined) ?? radical(p));
}

/**
 * Quando o nome é genérico ("ovo", "arroz", "frango"), qual linha da TACO usar: a forma mais comum de comer.
 * Chave = palavras do que a pessoa escreveu, já normalizadas (sem acento, singular, sem "de/do").
 * Valor = nome exato na tabela (tests/nutricao.test.ts confere que todos existem).
 */
export const PREFERIDO: Record<string, string> = {
  ovo: "Ovo, de galinha, inteiro, cozido", "ovo cozido": "Ovo, de galinha, inteiro, cozido",
  "ovo frito": "Ovo, de galinha, inteiro, frito", clara: "Ovo, de galinha, clara, cozida",
  "clara ovo": "Ovo, de galinha, clara, cozida", gema: "Ovo, de galinha, gema, cozida",
  "ovo codorna": "Ovo, de codorna, inteiro, cru",
  arroz: "Arroz, tipo 1, cozido", "arroz branco": "Arroz, tipo 1, cozido", "arroz integral": "Arroz, integral, cozido",
  feijao: "Feijão, carioca, cozido", "feijao carioca": "Feijão, carioca, cozido", "feijao preto": "Feijão, preto, cozido",
  frango: "Frango, peito, sem pele, grelhado", "peito frango": "Frango, peito, sem pele, grelhado",
  "file frango": "Frango, peito, sem pele, grelhado", "frango grelhado": "Frango, peito, sem pele, grelhado",
  "frango cozido": "Frango, peito, sem pele, cozido", "coxa frango": "Frango, coxa, sem pele, cozida",
  sobrecoxa: "Frango, sobrecoxa, sem pele, assada",
  carne: "Carne, bovina, patinho, sem gordura, grelhado", "carne moida": "Carne, bovina, acém, moído, cozido",
  patinho: "Carne, bovina, patinho, sem gordura, grelhado", alcatra: "Carne, bovina, miolo de alcatra, sem gordura, grelhado",
  picanha: "Carne, bovina, picanha, sem gordura, grelhada", "contra file": "Carne, bovina, contra-filé, sem gordura, grelhado",
  "file mingnon": "Carne, bovina, filé mingnon, sem gordura, grelhado",
  pao: "Pão, trigo, francês", "pao frances": "Pão, trigo, francês", "pao forma": "Pão, de forma, tradicional",
  "pao integral": "Pão, trigo, forma, integral", "pao queijo": "Pão, de queijo, assado",
  leite: "Leite, de vaca, integral", "leite integral": "Leite, de vaca, integral",
  "leite desnatado": "Leite, de vaca, desnatado", "leite semidesnatado": "Leite, de vaca, semidesnatado",
  banana: "Banana, prata, crua", "banana prata": "Banana, prata, crua", "banana nanica": "Banana, nanica, crua",
  maca: "Maçã, Fuji, com casca, crua", laranja: "Laranja, pêra, crua", "suco laranja": "Laranja, pêra, suco",
  mamao: "Mamão, Papaia, cru", manga: "Manga, Tommy Atkins, crua", uva: "Uva, Itália, crua", pera: "Pêra, Williams, crua",
  batata: "Batata, inglesa, cozida", "batata doce": "Batata, doce, cozida", "batata frita": "Batata, inglesa, frita",
  mandioca: "Mandioca, cozida",
  queijo: "Queijo, mozarela", "queijo minas": "Queijo, minas, frescal", requeijao: "Queijo, requeijão, cremoso",
  iogurte: "Iogurte, natural", "iogurte grego": "Iogurte, grego, tradicional", cottage: "Queijo, cottage",
  cafe: "Café, infusão 10%", acucar: "Açúcar, refinado", mel: "Mel, de abelha",
  azeite: "Azeite, de oliva, extra virgem", oleo: "Óleo, de soja", manteiga: "Manteiga, com sal",
  tapioca: "Goma de tapioca, hidratada", "goma tapioca": "Goma de tapioca, hidratada",
  macarrao: "Macarrão, trigo, cozido", cuscuz: "Cuscuz, de milho, cozido com sal",
  atum: "Atum, conserva em óleo", sardinha: "Sardinha, conserva em óleo", salmao: "Salmão, sem pele, fresco, grelhado",
  tilapia: "Tilápia, filé, grelhada", peixe: "Tilápia, filé, grelhada", camarao: "Camarão, Rio Grande, grande, cozido",
  whey: "Whey protein, concentrado", "pasta amendoim": "Pasta de amendoim, tradicional", "pasta amendoim integral": "Pasta de amendoim, integral", amendoim: "Amendoim, torrado, salgado",
  presunto: "Presunto, sem capa de gordura",
  "agua coco": "Coco, água de", "creme leite": "Creme de Leite", granola: "Granola, tradicional",
  tomate: "Tomate, com semente, cru", cenoura: "Cenoura, crua", brocoli: "Brócolis, cozido", chocolate: "Chocolate, ao leite",
};

const COMUNS = new Set(Object.values(PREFERIDO));

/** Diferença de no máximo uma letra (trocada, faltando ou sobrando). */
export function quaseIgual(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, dif = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++dif > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return dif + (a.length - i) + (b.length - j) <= 1;
}

/** Acha a linha da TACO mais provável para o nome escrito. */
export function buscarAlimentos(tabela: LinhaTaco[], texto: string, max = 6): Encontrado[] {
  const q = palavras(texto);
  if (!q.length) return [];
  const exato = PREFERIDO[q.join(" ")];
  const doPrimeiro = PREFERIDO[q[0]];
  const pontuados: { l: LinhaTaco; s: number }[] = [];
  for (const l of tabela) {
    const ps = palavras(l[1]);
    let s = 0;
    q.forEach((w, i) => {
      if (ps.includes(w)) s += i === 0 ? 3 : 2;
      else if (ps.some((p) => p.startsWith(w) && w.length >= 3)) s += i === 0 ? 2 : 1;
      else if (w.length >= 5 && ps.some((p) => quaseIgual(p, w))) s += i === 0 ? 2 : 1; // "amendoin", "mussarella"
      else s -= 3; // palavra digitada que o alimento não tem pesa mais que qualquer preferência
    });
    if (s <= 0) continue;
    if (ps[0] === q[0]) s += 1; // "Ovo, ..." quando a pessoa escreveu "ovo"
    if (l[1] === exato) s += 6;
    else if (l[1] === doPrimeiro) s += 3;
    if (COMUNS.has(l[1])) s += 1.5; // formas comuns antes das raras (pão de forma antes de pão de glúten)
    // sem preferência: pronto para comer antes do cru
    if (/cozid|grelhad|assad/.test(normalizar(l[1]))) s += 0.3;
    s -= ps.length * 0.05; // nome mais curto = mais genérico
    pontuados.push({ l, s });
  }
  return pontuados
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map(({ l }) => daLinha(l));
}

export function porId(tabela: LinhaTaco[], id: number | string): Encontrado | undefined {
  const l = tabela.find((x) => x[0] === id);
  return l && daLinha(l);
}

// ------------------------------------------------------------------ quantidade

export type Medida = "g" | "ml" | "unidade" | "porcao" | "colher-sopa" | "colher-sobremesa" | "colher-cha" | "xicara" | "copo" | "concha" | "escumadeira" | "fatia" | "scoop" | "pote" | "lata" | "bife";

export const NOME_MEDIDA: Record<Medida, [string, string]> = {
  g: ["g", "g"], ml: ["ml", "ml"], unidade: ["unidade", "unidades"], porcao: ["porção", "porções"],
  "colher-sopa": ["colher de sopa", "colheres de sopa"], "colher-sobremesa": ["colher de sobremesa", "colheres de sobremesa"],
  "colher-cha": ["colher de chá", "colheres de chá"], xicara: ["xícara", "xícaras"], copo: ["copo", "copos"],
  concha: ["concha", "conchas"], escumadeira: ["escumadeira", "escumadeiras"], fatia: ["fatia", "fatias"],
  scoop: ["scoop", "scoops"], pote: ["pote", "potes"], lata: ["lata", "latas"], bife: ["bife/filé", "bifes/filés"],
};

const NUMEROS: Record<string, number> = {
  meio: 0.5, meia: 0.5, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12, duzia: 12,
};

/** Lê "2 colheres de sopa", "1/2 xícara", "150g", "1,5 copo", "meia xícara", "2 ovos". */
export function lerQuantidade(texto: string): { n: number; medida: Medida | null } | null {
  const t = normalizar(texto).replace(/½/g, " 1/2").replace(/¼/g, " 1/4").replace(/¾/g, " 3/4");
  if (!t) return null;
  let n: number | null = null;
  let resto = t;
  // "1 1/2", "1/2", "1,5", "150"
  const m = t.match(/^(\d+)\s+(\d+)\/(\d+)\b|^(\d+)\/(\d+)|^(\d+(?:[.,]\d+)?)/);
  if (m) {
    if (m[1]) n = Number(m[1]) + Number(m[2]) / Number(m[3]);
    else if (m[4]) n = Number(m[4]) / Number(m[5]);
    else n = Number(m[6].replace(",", "."));
    resto = t.slice(m[0].length).trim();
    // "1 e meio", "2 e meia"
    if (/^e mei[oa]\b/.test(resto)) { n += 0.5; resto = resto.replace(/^e mei[oa]\b/, "").trim(); }
  } else {
    const w = t.split(" ")[0];
    if (w in NUMEROS) { n = NUMEROS[w]; resto = t.slice(w.length).trim(); }
  }
  if (n === null || !Number.isFinite(n) || n <= 0) return null;
  const r = resto;
  let medida: Medida | null = null;
  if (/^(kg|quilo)/.test(r)) { n *= 1000; medida = "g"; }
  else if (/^(g|gr|grama)s?\b/.test(r) || /^g\b/.test(r)) medida = "g";
  else if (/^(ml|mililitro)/.test(r)) medida = "ml";
  else if (/^(l|lt|litro)s?\b/.test(r)) { n *= 1000; medida = "ml"; }
  else if (/^colher(es)?( de)? (cha|chazinho)/.test(r) || /^colherzinha/.test(r)) medida = "colher-cha";
  else if (/^colher(es)?( de)? sobremesa/.test(r)) medida = "colher-sobremesa";
  else if (/^colher/.test(r) || /^cs\b/.test(r)) medida = "colher-sopa";
  else if (/^(xicara|xic)/.test(r)) medida = "xicara";
  else if (/^copo/.test(r)) medida = "copo";
  else if (/^concha/.test(r)) medida = "concha";
  else if (/^escumadeira/.test(r)) medida = "escumadeira";
  else if (/^fatia/.test(r)) medida = "fatia";
  else if (/^(scoop|dosador|medida)/.test(r)) medida = "scoop";
  else if (/^pote/.test(r)) medida = "pote";
  else if (/^lata/.test(r)) medida = "lata";
  else if (/^(bife|file|posta)/.test(r)) medida = "bife";
  else if (/^(porcao|porcoes)/.test(r)) medida = "porcao";
  else if (/^(unidade|un\b|und|peca|pedaco)/.test(r) || r) medida = "unidade"; // "2 ovos", "1 banana", "3 pães"
  // só número: decide depois, conforme o alimento
  return { n, medida };
}

/** Peso padrão (g) de cada medida quando o alimento não tem uma própria. Colher de sopa = 15 ml. */
const PADRAO: Partial<Record<Medida, number>> = {
  "colher-sopa": 15, "colher-sobremesa": 10, "colher-cha": 5, xicara: 240, copo: 200, concha: 100, escumadeira: 80,
  fatia: 25, scoop: 30, pote: 170, lata: 120, bife: 100,
};

/**
 * Medidas caseiras por alimento (g), aproximadas (base: tabelas de medidas caseiras usadas por nutricionistas).
 * Primeiro padrão que casar com o nome normalizado da TACO vence.
 */
const MEDIDAS: [RegExp, Partial<Record<Medida, number>>][] = [
  [/^ovo de codorna/, { unidade: 10 }],
  [/^ovo de galinha clara/, { unidade: 30 }],
  [/^ovo de galinha gema/, { unidade: 17 }],
  [/^ovo/, { unidade: 50 }],
  [/^arroz .*cozido/, { "colher-sopa": 25, escumadeira: 90, xicara: 160, concha: 120 }],
  [/^feijao .*cozido/, { concha: 100, "colher-sopa": 20, escumadeira: 90 }],
  [/^macarrao .*cozido/, { escumadeira: 110, xicara: 140, "colher-sopa": 25 }],
  [/^aveia/, { "colher-sopa": 15, xicara: 80, "colher-cha": 4 }],
  [/^granola/, { "colher-sopa": 12, xicara: 100 }],
  [/^(acucar|acucar mascavo)/, { "colher-sopa": 12, "colher-cha": 4, xicara: 180 }],
  [/^mel/, { "colher-sopa": 20, "colher-cha": 7 }],
  [/^(azeite|oleo)/, { "colher-sopa": 13, "colher-cha": 4 }],
  [/^(manteiga|margarina)/, { "colher-sopa": 15, "colher-cha": 5, "colher-sobremesa": 10 }],
  [/^queijo requeijao/, { "colher-sopa": 25 }],
  [/^pasta de amendoim/, { "colher-sopa": 16, "colher-cha": 5 }],
  [/^whey/, { scoop: 30, "colher-sopa": 10 }],
  [/^goma de tapioca/, { "colher-sopa": 15, unidade: 60 }],
  [/^(farinha|polvilho|cuscuz)/, { "colher-sopa": 12, xicara: 120 }],
  [/^cafe po/, { "colher-sopa": 6, "colher-cha": 2 }],
  [/^cafe/, { xicara: 50, copo: 150 }],
  [/^leite .*po/, { "colher-sopa": 15 }],
  [/^(leite|agua de coco|iogurte|.*suco)/, { copo: 200, xicara: 240 }],
  [/^iogurte/, { pote: 170 }],
  [/^pao trigo frances/, { unidade: 50 }],
  [/^pao de queijo/, { unidade: 25 }],
  [/^pao/, { fatia: 25, unidade: 50 }],
  [/^biscoito .*cream cracker/, { unidade: 7 }],
  [/^biscoito .*maisena/, { unidade: 5 }],
  [/^biscoito .*recheado/, { unidade: 15 }],
  [/^biscoito/, { unidade: 8 }],
  [/^banana nanica/, { unidade: 90 }],
  [/^banana/, { unidade: 60 }],
  [/^maca/, { unidade: 130 }],
  [/^laranja .*suco/, { copo: 200 }],
  [/^laranja/, { unidade: 140 }],
  [/^mamao papaia/, { unidade: 300, fatia: 150 }],
  [/^mamao/, { fatia: 170 }],
  [/^manga/, { unidade: 250 }],
  [/^abacate/, { "colher-sopa": 30, unidade: 400 }],
  [/^morango/, { unidade: 12, xicara: 150 }],
  [/^uva/, { unidade: 6, xicara: 150 }],
  [/^(melancia|melao|abacaxi)/, { fatia: 200 }],
  [/^pera/, { unidade: 140 }],
  [/^kiwi/, { unidade: 75 }],
  [/^batata doce/, { unidade: 150, "colher-sopa": 40 }],
  [/^batata inglesa frita/, { "colher-sopa": 15 }],
  [/^batata/, { unidade: 130, "colher-sopa": 30 }],
  [/^mandioca/, { "colher-sopa": 30, unidade: 100 }],
  [/^queijo (mozarela|prato|pasteurizado)/, { fatia: 20 }],
  [/^queijo minas/, { fatia: 30 }],
  [/^queijo parmesao/, { "colher-sopa": 6 }],
  [/^queijo (ricota|cottage)/, { "colher-sopa": 25, fatia: 30 }],
  [/^(presunto|peito de peru|mortadela)/, { fatia: 15 }],
  [/^frango .*(peito|file)/, { bife: 120, unidade: 120 }],
  [/^frango .*(coxa|sobrecoxa)/, { unidade: 90 }],
  [/^frango .*asa/, { unidade: 40 }],
  [/^carne bovina .*moido/, { "colher-sopa": 25, concha: 100 }],
  [/^carne/, { bife: 100, unidade: 100 }],
  [/^(tilapia|salmao|pescada)/, { bife: 120, unidade: 120 }],
  [/^atum/, { lata: 120, "colher-sopa": 20 }],
  [/^sardinha .*conserva/, { lata: 125, unidade: 30 }],
  [/^sardinha/, { unidade: 50 }],
  [/^amendoim/, { "colher-sopa": 17, unidade: 1 }],
  [/^castanha/, { unidade: 4 }],
  [/^creme de leite/, { "colher-sopa": 15, lata: 200 }],
];

export function gramasDe(nomeTaco: string, n: number, medida: Medida | null, porcao?: number): { g: number; medida: Medida } | null {
  const k = normalizar(nomeTaco).replace(/,/g, "");
  const proprias: Partial<Record<Medida, number>> = { ...(MEDIDAS.find(([re]) => re.test(k))?.[1] ?? {}) };
  if (porcao) {
    proprias.porcao = porcao; // "1 porção" = porção do rótulo
    proprias.unidade ??= porcao; // "1 barra", "1 pote" de um produto: a porção do rótulo
  }
  if (medida === null) {
    // Só número: até 12 com unidade conhecida = unidades ("2" ovos); senão, gramas ("150" de arroz).
    if (n <= 12 && proprias.unidade) return { g: n * proprias.unidade, medida: "unidade" };
    return { g: n, medida: "g" };
  }
  if (medida === "g" || medida === "ml") return { g: n, medida };
  const peso = proprias[medida] ?? PADRAO[medida];
  if (!peso) return null; // "1 unidade" de arroz: não dá para saber
  return { g: n * peso, medida };
}

// ------------------------------------------------------------------ cálculo

export interface Calculo {
  alimento: Encontrado;
  gramas: number;
  kcal: number;
  proteina: number;
  /** Explicação curta: "2 unidades ≈ 100 g". */
  como: string;
}

export type ResultadoCalculo = { ok: true; calculo: Calculo } | { ok: false; motivo: "sem-alimento" | "sem-quantidade" | "medida-desconhecida"; alimento?: Encontrado };

const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString("pt-BR");

/** escolha = alimento escolhido na lista (id da tabela local ou o produto inteiro, da busca online); vence a busca pelo nome. */
export function calcular(tabela: LinhaTaco[], nome: string, quantidade: string, escolha?: number | Encontrado): ResultadoCalculo {
  const alimento = (typeof escolha === "object" ? escolha : escolha !== undefined && porId(tabela, escolha)) || buscarAlimentos(tabela, nome, 1)[0];
  if (!alimento) return { ok: false, motivo: "sem-alimento" };
  const q = lerQuantidade(quantidade);
  if (!q) return { ok: false, motivo: "sem-quantidade", alimento };
  const r = gramasDe(alimento.nome, q.n, q.medida, alimento.porcao);
  if (!r) return { ok: false, motivo: "medida-desconhecida", alimento };
  const f = r.g / 100;
  const [um, varios] = NOME_MEDIDA[r.medida];
  const como = r.medida === "g" || r.medida === "ml" ? `${fmt(r.g)} ${r.medida}` : `${fmt(q.n)} ${q.n > 1 ? varios : um} ≈ ${fmt(r.g)} g`;
  return {
    ok: true,
    calculo: {
      alimento,
      gramas: r.g,
      kcal: Math.round(alimento.kcal100 * f),
      proteina: Math.round(alimento.prot100 * f * 10) / 10,
      como,
    },
  };
}
