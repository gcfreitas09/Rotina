/**
 * Anotar rápido: uma linha vira lançamento. A prévia na tela deixa trocar tudo antes de lançar; aqui é só o primeiro palpite.
 *   "lanche 12,50"            gasto, Alimentação, dinheiro, hoje
 *   "va salgado 15 06/11"     gasto, Alimentação, VA, 06/11
 *   "vale alimentação 600"    ENTRADA no VA (cita o vale e nada mais = recebeu o vale)
 *   "+600 vale"               entrada de vale, mas qual? carteira = null (a tela pede para escolher)
 *   "salário 174 31/10"       entrada, Salário, dinheiro, 31/10
 *   "uber 18 ontem"           gasto, Transporte, ontem
 * Categoria: primeiro a da mesma descrição já anotada (aprende), depois palavras conhecidas.
 */
import type { Carteira, Lancamento } from "../../data/types.ts";
import { somarDias } from "../../data/datas.ts";
import { AJUSTE, lerValor } from "./logica.ts";

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const PALAVRAS: Record<string, string[]> = {
  "Alimentação": ["lanche", "almoco", "janta", "jantar", "ifood", "pizza", "hamburguer", "burger", "acai", "cafe", "padaria", "restaurante", "sorvete", "salgado", "refri", "cantina", "marmita", "mc", "comida", "pastel", "esfiha", "sushi", "doce", "chocolate", "bolo", "coxinha", "suco", "agua", "lanchonete"],
  "Mercado": ["mercado", "supermercado", "feira", "atacadao", "hortifruti", "acougue", "compras"],
  "Transporte": ["uber", "99", "onibus", "metro", "gasolina", "combustivel", "passagem", "estacionamento", "bilhete", "moto", "taxi", "brt", "trem", "recarga"],
  "Casa": ["aluguel", "luz", "energia", "internet", "gas", "condominio", "limpeza"],
  "Escola": ["escola", "livro", "apostila", "caderno", "material", "xerox", "curso", "faculdade", "mensalidade", "caneta", "impressao"],
  "Saúde": ["farmacia", "remedio", "medico", "consulta", "academia", "dentista", "suplemento", "whey", "creatina", "exame"],
  "Lazer": ["cinema", "show", "jogo", "bar", "festa", "role", "balada", "futevolei", "ingresso", "viagem", "steam", "parque", "praia"],
  "Roupas": ["roupa", "tenis", "camisa", "camiseta", "calca", "short", "bermuda", "chinelo", "bone", "meia"],
  "Assinaturas": ["netflix", "spotify", "prime", "disney", "youtube", "icloud", "assinatura", "celular", "plano", "hbo", "max", "globoplay", "chatgpt"],
};
const ENTRADAS: Record<string, string[]> = {
  "Salário": ["salario", "pagamento", "adiantamento"],
  "Freela": ["freela", "freelance", "bico", "servico"],
  "Presente": ["presente", "mesada"],
  "Venda": ["venda", "vendi"],
};
/** Palavras que só dizem "entrou dinheiro" (somem da descrição). */
const VERBOS_ENTRADA = ["recebi", "ganhei", "entrou", "caiu"];
const SINAL_ENTRADA = [...VERBOS_ENTRADA, ...Object.values(ENTRADAS).flat()];
const SIGLA: Record<string, Carteira> = { va: "va", vt: "vt", vr: "vr" };
export const NOME_VALE: Record<string, string> = { va: "Vale-alimentação", vt: "Vale-transporte", vr: "Vale-refeição" };
const PREP = ["no", "na", "do", "da", "de", "pelo", "pela", "com", "em", "o", "a"];

export interface Rapido {
  tipo: Lancamento["tipo"];
  valor: number;
  descricao: string;
  categoria: string;
  /** null = é vale, mas a linha não diz qual: a tela pede para escolher antes de lançar. */
  carteira: Carteira | null;
  data: string;
  /** A categoria (ou a carteira) veio de um lançamento anterior com a mesma descrição. */
  aprendeu: boolean;
}

export function lerRapido(texto: string, historico: Lancamento[], hoje: string): Rapido | null {
  let t = texto.trim();
  if (!t) return null;
  let sinal: "+" | "-" | null = null;
  if (t.startsWith("+")) { sinal = "+"; t = t.slice(1); }
  else if (t.startsWith("-")) { sinal = "-"; t = t.slice(1); }

  // 1) data (antes do valor, senão "06/11" viraria dinheiro)
  let data = hoje;
  const dt = lerData(t, hoje);
  if (dt === "invalida") return null;
  if (dt) { data = dt.data; t = corta(t, dt.inicio, dt.fim); }

  // 2) vale por extenso ("vale alimentação", "vale-transporte") vira carteira e sai do texto
  let carteira = null as Carteira | null;
  let valeSemNome = false;
  t = t.replace(/(?:\b(?:no|na|do|da|pelo|pela|com|de)\s+)?\bvale[\s-]*(alimenta[cç][aã]o|refei[cç][aã]o|transporte)\b/giu, (_m, tipoVale: string) => {
    const v = semAcento(tipoVale);
    carteira = v.startsWith("alimenta") ? "va" : v.startsWith("refei") ? "vr" : "vt";
    return " ";
  }).replace(/\s+/g, " ").trim();

  // 3) valor: o último número da linha ("2 coxinhas 9,50" → 9,50)
  const nums = [...t.matchAll(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d.,]*[a-zà-ú])/gi)];
  const m = nums.at(-1);
  if (!m) return null;
  const valor = lerValor(m[1]);
  if (valor === null || Number.isNaN(valor)) return null;
  t = corta(t, m.index ?? 0, (m.index ?? 0) + m[0].length);

  // 4) palavras: ontem/anteontem, siglas de vale, "vale" sem dizer qual
  const palavras = t.split(" ").filter(Boolean).filter((p) => {
    const s = semAcento(p);
    if (s === "ontem") { data = somarDias(hoje, -1); return false; }
    if (s === "anteontem") { data = somarDias(hoje, -2); return false; }
    if (SIGLA[s]) { carteira = SIGLA[s]; return false; }
    if (s === "vale") { valeSemNome = true; return false; }
    return true;
  });
  const chaves = palavras.map(semAcento);
  // tira verbos de entrada e preposições soltas nas pontas ("salgado no va" → "salgado")
  const desc = palavras.filter((_p, i) => !VERBOS_ENTRADA.includes(chaves[i]));
  while (desc.length && PREP.includes(semAcento(desc[desc.length - 1]))) desc.pop();
  while (desc.length && PREP.includes(semAcento(desc[0]))) desc.shift();
  const descricao = desc.join(" ");
  const cita = carteira !== null || valeSemNome;

  // 5) tipo
  let tipo: Lancamento["tipo"] = "saida";
  if (sinal === "+") tipo = "entrada";
  else if (sinal === "-") tipo = "saida";
  else if (chaves.some((p) => SINAL_ENTRADA.includes(p))) tipo = "entrada";
  else if (cita && !descricao) tipo = "entrada"; // "va 600", "vale alimentação 600": recebeu o vale

  // 6) entrada de vale: categoria Vale, sempre num vale (nunca no dinheiro)
  if (tipo === "entrada" && cita && !chaves.some((p) => Object.values(ENTRADAS).flat().includes(p))) {
    return { tipo, valor, descricao: maiuscula(descricao) || (carteira ? NOME_VALE[carteira] : "Vale"), categoria: "Vale", carteira, data, aprendeu: false };
  }

  // 7) categoria e carteira: histórico (mesma descrição ou mesma primeira palavra) → palavras conhecidas
  const d = semAcento(descricao), primeira = d.split(" ")[0];
  const doTipo = historico.filter((l) => l.tipo === tipo && l.categoria !== AJUSTE && l.categoria !== "Vale" && l.descricao).sort((a, b) => b._m - a._m);
  const igual = d ? doTipo.find((l) => semAcento(l.descricao) === d) ?? doTipo.find((l) => semAcento(l.descricao).split(" ")[0] === primeira) : undefined;
  const qualVale: Carteira | null = carteira; // TS: carteira é atribuída dentro de callbacks
  if (igual) {
    return {
      tipo, valor, descricao: maiuscula(descricao), categoria: igual.categoria,
      carteira: qualVale ?? (valeSemNome ? null : igual.carteira), data, aprendeu: true,
    };
  }
  const tabela = tipo === "entrada" ? ENTRADAS : PALAVRAS;
  const categoria = Object.entries(tabela).find(([, ps]) => chaves.some((p) => ps.includes(p)))?.[0]
    ?? (tipo === "saida" && (qualVale === "va" || qualVale === "vr") ? "Alimentação" : tipo === "saida" && qualVale === "vt" ? "Transporte" : "Outros");
  return { tipo, valor, descricao: maiuscula(descricao), categoria, carteira: qualVale ?? (valeSemNome ? null : "conta"), data, aprendeu: false };
}

const corta = (t: string, i: number, f: number) => (t.slice(0, i) + " " + t.slice(f)).replace(/\s+/g, " ").trim();
const maiuscula = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : "");

/**
 * Acha uma data na linha. Sem ano: o ano de hoje, e se cair no futuro, o ano anterior (em janeiro, "28/12" é do ano passado).
 * "dia 6": este mês; se o dia 6 ainda não chegou, o mês anterior. "invalida" = parece data mas não existe (31/02).
 */
export function lerData(t: string, hoje: string): { data: string; inicio: number; fim: number } | "invalida" | null {
  const [ah, mh, dh] = hoje.split("-").map(Number);
  const existe = (a: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(a, m, 0).getDate();
  const fmt = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const m1 = /(?<![\d,.])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/.exec(t);
  if (m1) {
    const d = Number(m1[1]), m = Number(m1[2]);
    let a = m1[3] ? Number(m1[3].length === 2 ? `20${m1[3]}` : m1[3]) : ah;
    if (!m1[3] && fmt(a, m, d) > hoje) a -= 1;
    if (!existe(a, m, d)) return "invalida";
    return { data: fmt(a, m, d), inicio: m1.index, fim: m1.index + m1[0].length };
  }
  const m2 = /\bdia\s+(\d{1,2})\b/i.exec(t);
  if (m2) {
    const d = Number(m2[1]);
    let a = ah, m = mh;
    if (d > dh) { m -= 1; if (m === 0) { m = 12; a -= 1; } }
    if (!existe(a, m, d)) return "invalida";
    return { data: fmt(a, m, d), inicio: m2.index, fim: m2.index + m2[0].length };
  }
  return null;
}
