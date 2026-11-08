import type { Dia } from "./types.ts";

/** Datas trafegam como texto aaaa-mm-dd, no fuso local. */

export const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
export const DIAS_LONGOS = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
] as const;
export const DIAS: Dia[] = [0, 1, 2, 3, 4, 5, 6];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const p2 = (v: number) => String(v).padStart(2, "0");

export function iso(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function deIso(s: string): Date {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function hoje(): string {
  return iso(new Date());
}

export function somarDias(s: string, n: number): string {
  const d = deIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Diferença em dias inteiros (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((deIso(b).getTime() - deIso(a).getTime()) / 86400000);
}

/** Segunda = 0 … domingo = 6. */
export function diaDaSemana(s: string | Date): Dia {
  const d = typeof s === "string" ? deIso(s) : s;
  return ((d.getDay() + 6) % 7) as Dia;
}

export function inicioDaSemana(s: string): string {
  return somarDias(s, -diaDaSemana(s));
}

/** dd/mm/aaaa */
export function br(s: string | null | undefined): string {
  if (!s) return "";
  const [a, m, d] = s.split("-");
  return `${d}/${m}/${a}`;
}

/** dd/mm */
export function brCurta(s: string): string {
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
}

export function porExtenso(s: string): string {
  const d = deIso(s);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function duracao(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function contagem(dias: number): string {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias < 0) return dias === -1 ? "ontem" : `há ${-dias} dias`;
  return `em ${dias} dias`;
}
