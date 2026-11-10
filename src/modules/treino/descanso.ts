/**
 * Descanso entre séries. Na ficha, cada exercício pode ter o seu: "90" (segundos) ou faixa "120-190" (mínimo e máximo).
 * Na sessão, o descanso em andamento fica salvo (`Sessao.descanso`), então sair do app, voltar ou trocar de exercício não zera.
 */

/** Lê "90", "120-190", "120 a 190", "2:00", "2:00-3:10". Segundos de 10 a 900. null se não entender. */
export function lerDescanso(texto: string): { descanso: number; descansoMax?: number } | null {
  const t = texto.trim().toLowerCase().replace(/\s*s(eg)?$/, "");
  if (!t || /(?:-|–|—|\ba|até|ate)$/.test(t) || /^(?:-|–|—)/.test(t)) return null; // faixa pela metade ("60-")
  const seg = (x: string): number | null => {
    const m = x.trim().match(/^(\d+):([0-5]\d)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    return /^\d+$/.test(x.trim()) ? Number(x.trim()) : null;
  };
  const partes = t.split(/\s*(?:-|–|—|\ba\b|até|ate)\s*/).filter(Boolean);
  if (partes.length < 1 || partes.length > 2) return null;
  let min = seg(partes[0]);
  let max = partes[1] !== undefined ? seg(partes[1]) : min;
  if (min === null || max === null) return null;
  if (min > max) [min, max] = [max, min];
  if (min < 10 || max > 900) return null;
  return max > min ? { descanso: min, descansoMax: max } : { descanso: min };
}

/** "90 s" ou "120–190 s". */
export function formatarDescanso(e: { descanso?: number; descansoMax?: number }): string {
  if (!e.descanso) return "";
  return e.descansoMax && e.descansoMax > e.descanso ? `${e.descanso}–${e.descansoMax} s` : `${e.descanso} s`;
}

/** Descanso de um exercício em ms (mínimo e máximo); sem descanso próprio, o padrão das configurações. */
export function duracaoDescanso(e: { descanso?: number; descansoMax?: number } | undefined, padraoSeg: number): { minMs: number; maxMs: number } {
  const min = e?.descanso ?? padraoSeg;
  const max = e?.descansoMax && e.descansoMax > min ? e.descansoMax : min;
  return { minMs: min * 1000, maxMs: max * 1000 };
}

export interface DescansoAtivo { inicio: number; minMs: number; maxMs: number }

export type Fase =
  /** Ainda no mínimo: contagem regressiva. */
  | { fase: "descansando"; restanteMs: number; fracao: number }
  /** Passou do mínimo, dentro da faixa: já pode começar (até o máximo). */
  | { fase: "pode"; passouMs: number; ateMaxMs: number; fracao: number }
  | { fase: "fim" };

export function faseDescanso(d: DescansoAtivo, agora: number): Fase {
  const t = agora - d.inicio;
  if (t < d.minMs) return { fase: "descansando", restanteMs: d.minMs - t, fracao: 1 - t / d.minMs };
  if (d.maxMs > d.minMs && t < d.maxMs) return { fase: "pode", passouMs: t - d.minMs, ateMaxMs: d.maxMs - t, fracao: 1 - (t - d.minMs) / (d.maxMs - d.minMs) };
  return { fase: "fim" };
}

/** m:ss */
export const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
