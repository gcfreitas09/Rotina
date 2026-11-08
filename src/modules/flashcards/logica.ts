import type { Cartao } from "../../data/types.ts";
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

/** Fila de estudo: os vencidos primeiro (os de caixa menor antes), embaralhados dentro da caixa. */
export function fila(cartoes: Cartao[], hoje: string, todos = false): Cartao[] {
  const base = todos ? cartoes : cartoes.filter((c) => paraRevisar(c, hoje));
  return [...base]
    .map((c) => ({ c, r: Math.random() }))
    .sort((a, b) => a.c.caixa - b.c.caixa || a.r - b.r)
    .map((x) => x.c);
}

/** Domínio da pasta: 0 a 1, pela caixa média. */
export function dominio(cartoes: Cartao[]): number {
  if (!cartoes.length) return 0;
  return cartoes.reduce((t, c) => t + (c.caixa - 1), 0) / (cartoes.length * (ULTIMA_CAIXA - 1));
}
