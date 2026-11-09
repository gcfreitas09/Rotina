import type { Leitura, Livro } from "../../data/types.ts";
import { somarDias } from "../../data/datas.ts";

/** Sessão em andamento (só pode haver uma). */
export function sessaoAtiva(leituras: Leitura[]): Leitura | undefined {
  return leituras.find((l) => l.fim === null);
}

export const minutosDe = (l: Leitura) => (l.fim === null ? 0 : Math.max(0, Math.round((l.fim - l.inicio) / 60000)));
export const paginasDe = (l: Leitura) => (l.paginaFim === null ? 0 : Math.max(0, l.paginaFim - l.paginaInicio));

/** Páginas e minutos lidos num dia (sessões encerradas). */
export function lidoNoDia(leituras: Leitura[], data: string): { paginas: number; minutos: number } {
  const doDia = leituras.filter((l) => l.data === data && l.fim !== null);
  return { paginas: doDia.reduce((t, l) => t + paginasDe(l), 0), minutos: doDia.reduce((t, l) => t + minutosDe(l), 0) };
}

/** Dias seguidos com alguma leitura, contando até hoje (se hoje ainda não leu, conta até ontem). */
export function sequencia(leituras: Leitura[], hoje: string): number {
  const dias = new Set(leituras.filter((l) => l.fim !== null && (paginasDe(l) > 0 || minutosDe(l) > 0)).map((l) => l.data));
  let d = dias.has(hoje) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (dias.has(d)) { n++; d = somarDias(d, -1); }
  return n;
}

/** Encerra a sessão: guarda a página onde parou e devolve o livro atualizado (lido quando chega ao fim). */
export function encerrar(l: Leitura, livro: Livro, paginaFim: number, agora: number, hoje: string): { leitura: Leitura; livro: Livro } {
  const pagina = Math.max(0, Math.min(livro.paginas, Math.round(paginaFim)));
  const terminou = pagina >= livro.paginas;
  return {
    leitura: { ...l, fim: agora, paginaFim: Math.max(pagina, l.paginaInicio) },
    livro: { ...livro, pagina, estado: terminou ? "lido" : livro.estado, concluidoEm: terminou ? hoje : livro.concluidoEm ?? null },
  };
}

/** Ritmo médio (páginas por minuto) das últimas sessões, para estimar quanto falta. null sem histórico. */
export function ritmo(leituras: Leitura[]): number | null {
  const ok = leituras.filter((l) => l.fim !== null && minutosDe(l) >= 3 && paginasDe(l) > 0).slice(-10);
  if (!ok.length) return null;
  return ok.reduce((t, l) => t + paginasDe(l), 0) / ok.reduce((t, l) => t + minutosDe(l), 0);
}

/** Quanto falta no livro: páginas e, com a meta diária, em quantos dias termina. */
export function previsao(livro: Livro, metaPaginasDia: number): { faltam: number; dias: number | null } {
  const faltam = Math.max(0, livro.paginas - livro.pagina);
  return { faltam, dias: metaPaginasDia > 0 ? Math.ceil(faltam / metaPaginasDia) : null };
}

/**
 * Link que roda o atalho do iPhone e volta para o app (x-callback-url do app Atalhos).
 * O atalho recebe o número de minutos como texto ("0" = desligar o foco).
 */
export function linkAtalho(nome: string, minutos: number, volta: string): string {
  const q = new URLSearchParams({ name: nome, input: "text", text: String(Math.max(0, Math.round(minutos))), "x-success": volta, "x-cancel": volta, "x-error": volta });
  return `shortcuts://x-callback-url/run-shortcut?${q.toString().replace(/\+/g, "%20")}`;
}
