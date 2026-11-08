import type { Cartao, Comparacao, Dificuldade } from "../../data/types.ts";
import { somarDias } from "../../data/datas.ts";

/** Dias até a próxima revisão em cada caixa (Leitner). Caixa 1 = revisar de novo hoje. */
export const INTERVALO_CAIXA = [0, 0, 1, 3, 7, 14] as const;
export const ULTIMA_CAIXA = 5;

export function responder(c: Cartao, acertou: boolean, hoje: string): Cartao {
  if (!acertou) return { ...c, caixa: 1, proxima: hoje, erros: c.erros + 1 };
  const caixa = Math.min(ULTIMA_CAIXA, c.caixa + 1);
  return { ...c, caixa, proxima: somarDias(hoje, INTERVALO_CAIXA[caixa]), acertos: c.acertos + 1 };
}

export function paraRevisar(c: Cartao, hoje: string): boolean {
  return c.proxima <= hoje;
}

export const DIFICULDADES: { id: Dificuldade; nome: string }[] = [
  { id: "facil", nome: "Fácil" },
  { id: "medio", nome: "Médio" },
  { id: "dificil", nome: "Difícil" },
];
const PESO_DIF: Record<Dificuldade, number> = { dificil: 0, medio: 1, facil: 2 };

/** Cartão antigo, sem dificuldade, conta como médio. */
export function dificuldadeDe(c: Cartao): Dificuldade {
  return c.dificuldade ?? "medio";
}

export type OrdemEstudo = "caixa" | "aleatoria";
export interface OpcoesEstudo {
  ordem: OrdemEstudo;
  /** null = todas as dificuldades. */
  dificuldade: Dificuldade | null;
}
export const OPCOES_PADRAO: OpcoesEstudo = { ordem: "caixa", dificuldade: null };

/** Embaralha de verdade (Fisher-Yates), sem alterar a lista original. */
export function embaralhar<T>(lista: T[], sorteio: () => number = Math.random): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Fila de estudo. Ordem "caixa": vencidos primeiro, caixa menor antes, difíceis antes dos fáceis,
 * embaralhados no empate. Ordem "aleatoria": tudo misturado, sem prioridade.
 */
export function fila(cartoes: Cartao[], hoje: string, todos = false, opcoes: OpcoesEstudo = OPCOES_PADRAO, sorteio: () => number = Math.random): Cartao[] {
  let base = todos ? cartoes : cartoes.filter((c) => paraRevisar(c, hoje));
  if (opcoes.dificuldade) base = base.filter((c) => dificuldadeDe(c) === opcoes.dificuldade);
  if (opcoes.ordem === "aleatoria") return embaralhar(base, sorteio);
  return embaralhar(base, sorteio)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.caixa - b.c.caixa || PESO_DIF[dificuldadeDe(a.c)] - PESO_DIF[dificuldadeDe(b.c)] || a.i - b.i)
    .map((x) => x.c);
}

/** Domínio da pasta: 0 a 1, pela caixa média. */
export function dominio(cartoes: Cartao[]): number {
  if (!cartoes.length) return 0;
  return cartoes.reduce((t, c) => t + (c.caixa - 1), 0) / (cartoes.length * (ULTIMA_CAIXA - 1));
}

const MARCA_ITEM = /^(\s*)[-*•]\s+(.*)$/;

/** Divide o texto do cartão em linhas; linha que começa com "- " (ou "* ") vira item de lista com bolinha. */
export function linhasDoTexto(texto: string): { item: boolean; texto: string }[] {
  return texto.split("\n").map((l) => {
    const m = l.match(MARCA_ITEM);
    return m ? { item: true, texto: m[2] } : { item: false, texto: l };
  });
}

/**
 * Enter numa linha de lista continua a lista ("- " na linha de baixo); Enter numa linha de lista vazia encerra a lista.
 * Devolve o novo texto e a posição do cursor, ou null quando o Enter deve agir normalmente.
 */
export function continuarLista(valor: string, cursor: number): { valor: string; cursor: number } | null {
  const ini = valor.lastIndexOf("\n", cursor - 1) + 1;
  const linha = valor.slice(ini, cursor);
  const m = linha.match(/^(\s*[-*•]\s+)(.*)$/);
  if (!m) return null;
  if (m[2] === "") {
    // lista vazia: apaga a marca e sai da lista
    return { valor: valor.slice(0, ini) + valor.slice(cursor), cursor: ini };
  }
  const ins = "\n" + m[1];
  return { valor: valor.slice(0, cursor) + ins + valor.slice(cursor), cursor: cursor + ins.length };
}

export const MAX_ITENS_COMPARACAO = 3;

/**
 * Prepara a comparação para salvar: tira colunas sem nome (e os valores delas) e linhas totalmente vazias.
 * Devolve undefined se sobrar menos de 2 itens ou nenhuma linha preenchida.
 */
export function limparComparacao(c: Comparacao): Comparacao | undefined {
  const manter = c.itens.map((n) => n.trim()).map((n, i) => ({ n, i })).filter((x) => x.n);
  if (manter.length < 2) return undefined;
  const linhas = c.linhas
    .map((l) => ({ criterio: l.criterio.trim(), valores: manter.map((x) => (l.valores[x.i] ?? "").trim()) }))
    .filter((l) => l.criterio || l.valores.some(Boolean));
  if (!linhas.length) return undefined;
  return { itens: manter.map((x) => x.n), linhas };
}

export function comparacaoVazia(): Comparacao {
  return { itens: ["", ""], linhas: [{ criterio: "", valores: ["", ""] }] };
}
