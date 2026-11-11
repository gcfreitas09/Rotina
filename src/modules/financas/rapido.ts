/**
 * "Lançar rápido": uma linha vira lançamento. "lanche 12,50", "uber 18 ontem", "+800 salário", "almoço 32,50 vr".
 * Categoria: primeiro o que a pessoa já usou para a mesma descrição (aprende com o histórico), depois palavras conhecidas.
 */
import type { Carteira, Lancamento } from "../../data/types.ts";
import { somarDias } from "../../data/datas.ts";
import { AJUSTE, lerValor } from "./logica.ts";

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const PALAVRAS: Record<string, string[]> = {
  "Alimentação": ["lanche", "almoco", "janta", "jantar", "ifood", "pizza", "hamburguer", "burger", "acai", "cafe", "padaria", "restaurante", "sorvete", "salgado", "refri", "cantina", "marmita", "mc", "comida", "pastel", "esfiha", "sushi", "doce", "chocolate", "bolo"],
  "Mercado": ["mercado", "supermercado", "feira", "atacadao", "hortifruti", "acougue"],
  "Transporte": ["uber", "99", "onibus", "metro", "gasolina", "combustivel", "passagem", "estacionamento", "bilhete", "moto", "taxi", "brt", "trem"],
  "Casa": ["aluguel", "luz", "energia", "agua", "internet", "gas", "condominio", "limpeza"],
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
  "Vale": ["vale"],
};
const SINAL_ENTRADA = ["recebi", "ganhei", "entrou", "caiu", ...Object.values(ENTRADAS).flat()];
const CARTEIRA: Record<string, Carteira> = { vr: "vr", va: "va", vt: "vt" };
const NOME_VALE: Record<string, string> = { vr: "Vale-refeição", va: "Vale-alimentação", vt: "Vale-transporte" };

export interface Rapido { tipo: Lancamento["tipo"]; valor: number; descricao: string; categoria: string; carteira: Carteira; data: string; aprendeu: boolean }

export function lerRapido(texto: string, historico: Lancamento[], hoje: string): Rapido | null {
  let t = texto.trim();
  if (!t) return null;
  let tipo: Lancamento["tipo"] = "saida";
  if (/^\+/.test(t)) { tipo = "entrada"; t = t.slice(1); }
  else if (/^-/.test(t)) t = t.slice(1);
  // data: "06/11", "6/11/2026", "06/11/26" ou "dia 6" (tirada antes do valor, senão "06/11" viraria dinheiro)
  let data = hoje;
  const dt = lerData(t, hoje);
  if (dt === "invalida") return null;
  if (dt) { data = dt.data; t = (t.slice(0, dt.inicio) + " " + t.slice(dt.fim)).replace(/\s+/g, " ").trim(); }
  // valor: o último número da linha ("2 coxinhas 9,50" → 9,50)
  const nums = [...t.matchAll(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?!\S*[a-z])/gi)];
  const m = nums.at(-1);
  if (!m) return null;
  const valor = lerValor(m[1]);
  if (valor === null || Number.isNaN(valor)) return null;
  t = (t.slice(0, m.index) + t.slice((m.index ?? 0) + m[0].length)).replace(/\s+/g, " ").trim();
  // vale por extenso ("vale alimentação", "vale-transporte", "VR") vira a carteira e sai do texto, antes de "vale" virar entrada
  let carteira = "conta" as Carteira;
  t = t.replace(/\b(?:no|na|do|da|pelo|pela|com|de)?\s*vale[\s-]*(alimenta[cç][aã]o|refei[cç][aã]o|transporte)\b/giu, (_m, tipoVale: string) => {
    const v = semAcento(tipoVale);
    carteira = v.startsWith("alimenta") ? "va" : v.startsWith("refei") ? "vr" : "vt";
    return " ";
  }).replace(/\s+/g, " ").trim();
  const palavras = t.split(" ").filter((p) => {
    const s = semAcento(p);
    if (s === "ontem") { data = somarDias(hoje, -1); return false; }
    if (s === "anteontem") { data = somarDias(hoje, -2); return false; }
    if (CARTEIRA[s]) { carteira = CARTEIRA[s]; return false; }
    return true;
  });
  // "salgado 15 no va" → tira a preposição que sobrou nas pontas
  const PREP = ["no", "na", "do", "da", "de", "pelo", "pela", "com", "em"];
  while (palavras.length && PREP.includes(semAcento(palavras[palavras.length - 1]))) palavras.pop();
  while (palavras.length > 1 && PREP.includes(semAcento(palavras[0]))) palavras.shift();
  const chave = palavras.map(semAcento);
  if (tipo === "saida" && chave.some((p) => SINAL_ENTRADA.includes(p))) tipo = "entrada";
  const descricao = palavras.filter((_p, i) => !(tipo === "entrada" && ["recebi", "ganhei", "entrou", "caiu"].includes(chave[i]))).join(" ");
  const desc = descricao ? descricao[0].toUpperCase() + descricao.slice(1) : tipo === "entrada" && carteira !== "conta" ? NOME_VALE[carteira] : "";
  // 1) histórico: mesma descrição (ou mesma primeira palavra), mesmo tipo, mais recente
  const d = semAcento(descricao), primeira = d.split(" ")[0];
  const doTipo = historico.filter((l) => l.tipo === tipo && l.categoria !== AJUSTE && l.descricao).sort((a, b) => b._m - a._m);
  const igual = doTipo.find((l) => semAcento(l.descricao) === d) ?? (primeira ? doTipo.find((l) => semAcento(l.descricao).split(" ")[0] === primeira) : undefined);
  if (igual && d) return { tipo, valor, descricao: desc, categoria: igual.categoria, carteira: carteira === "conta" ? igual.carteira : carteira, data, aprendeu: true };
  // 2) palavras conhecidas
  const tabela = tipo === "entrada" ? ENTRADAS : PALAVRAS;
  const categoria = Object.entries(tabela).find(([, ps]) => chave.some((p) => ps.includes(p)))?.[0]
    ?? (tipo === "entrada" && carteira !== "conta" ? "Vale" : carteira === "vr" || carteira === "va" ? "Alimentação" : carteira === "vt" ? "Transporte" : "Outros");
  return { tipo, valor, descricao: desc, categoria, carteira, data, aprendeu: false };
}

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
