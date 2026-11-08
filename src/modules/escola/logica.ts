import type { Avaliacao, Materia, Semestre } from "../../data/types.ts";
import { calcularMateria, ROTULOS, type NotasSemestre, type Regras, type ResultadoMateria } from "../../config/gradingRules.ts";

export const CHAVES_SEMESTRE = ["p1", "p2", "t1", "t2", "extra", "rec"] as const;
export type ChaveLinha = (typeof CHAVES_SEMESTRE)[number];

export function notas(s: Semestre): NotasSemestre {
  return { p1: s.p1.nota, p2: s.p2.nota, t1: s.t1.nota, t2: s.t2.nota, extra: s.extra.nota, rec: s.rec.nota };
}

export function resultado(m: Materia, regras: Regras): ResultadoMateria {
  return calcularMateria([notas(m.semestres[0]), notas(m.semestres[1])], m.exame.nota, regras);
}

const vazia = (): Avaliacao => ({ nota: null, data: null });
export function semestreVazio(): Semestre {
  return { p1: vazia(), p2: vazia(), t1: vazia(), t2: vazia(), extra: vazia(), rec: vazia() };
}

export interface Agendada {
  materiaId: string;
  materia: string;
  rotulo: string;
  data: string;
  prova: boolean;
}

/** Avaliações com data de hoje em diante, em ordem. */
export function agendadas(materias: Materia[], desde: string): Agendada[] {
  const l: Agendada[] = [];
  for (const m of materias) {
    m.semestres.forEach((s, i) => {
      for (const k of CHAVES_SEMESTRE) {
        const a = s[k];
        if (a.data && a.data >= desde && a.nota === null) {
          l.push({ materiaId: m.id, materia: m.nome, rotulo: `${ROTULOS[k]} · ${i + 1}º sem.`, data: a.data, prova: k === "p1" || k === "p2" || k === "rec" });
        }
      }
    });
    if (m.exame.data && m.exame.data >= desde && m.exame.nota === null) {
      l.push({ materiaId: m.id, materia: m.nome, rotulo: "Exame final", data: m.exame.data, prova: true });
    }
  }
  return l.sort((a, b) => a.data.localeCompare(b.data));
}

/** Nota que resume a matéria agora: final, anual, ou o último semestre fechado. Null se nada fechou ainda. */
export function notaAtual(r: ResultadoMateria): number | null {
  if (r.mediaFinal !== null) return r.mediaFinal;
  if (r.anual !== null) return r.anual;
  if (r.semestres[1].completo) return r.semestres[1].nota;
  if (r.semestres[0].completo) return r.semestres[0].nota;
  return null;
}
