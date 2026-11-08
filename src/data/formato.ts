/** Nota com vírgula e uma casa: 7,5 */
export function nota(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
}

/** Número com vírgula, sem casas desnecessárias: 12,5 · 40 */
export function num(v: number, casas = 1): string {
  const f = Math.pow(10, casas);
  return String(Math.round(v * f) / f).replace(".", ",");
}

/** Aceita "7,5", "7.5", " 7 ". Vazio vira null; inválido vira NaN. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "") return null;
  return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}

export function litros(ml: number): string {
  return num(ml / 1000, 2);
}

export function novoId(prefixo = ""): string {
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefixo}${Date.now().toString(36)}${r}`;
}
