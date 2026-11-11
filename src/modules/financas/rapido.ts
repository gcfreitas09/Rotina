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
  let data = hoje;
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
