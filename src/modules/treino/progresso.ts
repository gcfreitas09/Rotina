import type { Sessao } from "../../data/types.ts";

/**
 * Progresso por exercício a partir das sessões salvas. Conta **toda série concluída**, com ou sem "Salvar treino" no fim
 * (antes só contavam os treinos salvos, e quem saía antes perdia o registro).
 */
export interface Serie { carga: number; reps: number }

export interface DiaExercicio {
  data: string;
  series: Serie[];
  /** Melhor série do dia (maior 1RM estimado). */
  melhor: Serie;
  /** 1RM estimado da melhor série (Epley), para comparar dias com pesos e repetições diferentes. */
  e1rm: number;
  /** Soma de carga × repetições do dia (kg). */
  volume: number;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Força estimada para 1 repetição (Epley): 20 kg × 10 ≈ 26,7. Serve para ver evolução quando muda o peso ou as repetições. */
export function e1rm(s: Serie): number {
  return s.reps <= 1 ? s.carga : r1(s.carga * (1 + s.reps / 30));
}

const chave = (t: string) => t.trim().toLowerCase();

/** Histórico de um exercício (pelo nome), do mais antigo ao mais novo. Treinos do mesmo dia viram um dia só. */
export function historico(sessoes: Sessao[], nome: string): DiaExercicio[] {
  const porDia = new Map<string, Serie[]>();
  for (const s of sessoes) {
    for (const e of s.exercicios) {
      if (chave(e.nome) !== chave(nome)) continue;
      const feitas = e.series.filter((x) => x.feita).map((x) => ({ carga: x.carga, reps: x.reps }));
      if (feitas.length) porDia.set(s.data, [...(porDia.get(s.data) ?? []), ...feitas]);
    }
  }
  return [...porDia.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, series]) => {
      const melhor = series.reduce((m, x) => (e1rm(x) > e1rm(m) || (e1rm(x) === e1rm(m) && x.carga > m.carga) ? x : m));
      return { data, series, melhor, e1rm: e1rm(melhor), volume: r1(series.reduce((t, x) => t + x.carga * x.reps, 0)) };
    });
}

export type TipoTendencia = "subindo" | "estavel" | "caindo" | "inicio";

export interface Tendencia {
  tipo: TipoTendencia;
  /** Carga da melhor série: último treino menos o primeiro (kg). */
  variacao: number;
  desde: string;
  /** Quantos treinos seguidos (contando o último) com a mesma carga na melhor série. */
  mesmaCargaHa: number;
  recorde: DiaExercicio;
}

/**
 * Subindo / estável / caindo: compara o 1RM estimado do último treino com a média dos até 3 anteriores
 * (sobe com +2 %, cai com −3 %). Um treino só = "inicio".
 */
export function tendencia(h: DiaExercicio[]): Tendencia | null {
  if (!h.length) return null;
  const ult = h[h.length - 1];
  const recorde = h.reduce((m, d) => (d.e1rm > m.e1rm ? d : m));
  let mesmaCargaHa = 1;
  for (let i = h.length - 2; i >= 0 && h[i].melhor.carga === ult.melhor.carga; i--) mesmaCargaHa++;
  const base = { variacao: r1(ult.melhor.carga - h[0].melhor.carga), desde: h[0].data, mesmaCargaHa, recorde };
  if (h.length < 2) return { tipo: "inicio", ...base };
  const ant = h.slice(-4, -1);
  const media = ant.reduce((t, d) => t + d.e1rm, 0) / ant.length;
  const dif = (ult.e1rm - media) / media;
  return { tipo: dif >= 0.02 ? "subindo" : dif <= -0.03 ? "caindo" : "estavel", ...base };
}

export interface ProgressoExercicio { nome: string; hist: DiaExercicio[]; tendencia: Tendencia }

/** Todos os exercícios com algum registro, do treinado mais recentemente para o mais antigo. */
export function resumoProgresso(sessoes: Sessao[]): ProgressoExercicio[] {
  const nomes = new Map<string, string>();
  for (const s of sessoes) for (const e of s.exercicios) if (e.series.some((x) => x.feita) && !nomes.has(chave(e.nome))) nomes.set(chave(e.nome), e.nome.trim());
  return [...nomes.values()]
    .map((nome) => { const hist = historico(sessoes, nome); return { nome, hist, tendencia: tendencia(hist)! }; })
    .filter((p) => p.hist.length)
    .sort((a, b) => b.hist[b.hist.length - 1].data.localeCompare(a.hist[a.hist.length - 1].data) || a.nome.localeCompare(b.nome, "pt-BR"));
}
