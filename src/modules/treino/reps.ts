/** Repetições de um exercício: número ("10") ou faixa ("8-10", "8 a 10", "8–10"). */
export function lerReps(texto: string): { reps: number; repsMax?: number } | null {
  const t = texto.trim().toLowerCase();
  const m = t.match(/^(\d+)(?:\s*(?:-|–|—|a|até|ate|\/)\s*(\d+))?$/);
  if (!m) return null;
  let min = Number(m[1]);
  let max = m[2] ? Number(m[2]) : min;
  if (min > max) [min, max] = [max, min]; // "10-8" vira 8–10
  if (min < 1 || max > 100) return null;
  return max > min ? { reps: min, repsMax: max } : { reps: min };
}

/** "10" ou "8–10". */
export function formatarReps(e: { reps: number; repsMax?: number }): string {
  return e.repsMax && e.repsMax > e.reps ? `${e.reps}–${e.repsMax}` : String(e.reps);
}
