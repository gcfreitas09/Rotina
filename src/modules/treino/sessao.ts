import type { Ficha, Sessao, SerieFeita } from "../../data/types.ts";

/**
 * Sessão nova a partir da ficha: uma série por linha da ficha, reps do começo da faixa e, em cada série, **o peso usado
 * nela no último treino** (`anteriores`); sem histórico, o peso da ficha.
 */
export function novaSessao(ficha: Ficha, data: string, inicio: number, anteriores: Sessao[] = []): Sessao {
  const base: Sessao = { id: `ses-${data}-${ficha.id}`, _m: 0, data, fichaId: ficha.id, fichaNome: ficha.nome, concluida: false, inicio, exercicios: [] };
  return {
    ...base,
    exercicios: ficha.exercicios.map((e) => ({
      exercicioId: e.id, nome: e.nome,
      series: Array.from({ length: e.series }, (_, i) => ({ reps: e.reps, carga: ultimaVez(anteriores, base, e.id, e.nome, i)?.carga ?? e.carga, feita: false })),
    })),
  };
}

export type Posicao = { ei: number; si: number };

/** Primeira série ainda não feita (na ordem da ficha). null = tudo feito. */
export function proximaSerie(s: Sessao, depoisDe?: Posicao): Posicao | null {
  const ordem: Posicao[] = s.exercicios.flatMap((e, ei) => e.series.map((_, si) => ({ ei, si })));
  const inicio = depoisDe ? ordem.findIndex((p) => p.ei === depoisDe.ei && p.si === depoisDe.si) + 1 : 0;
  // primeiro procura adiante; se não houver, volta ao começo (série pulada antes)
  for (const p of [...ordem.slice(inicio), ...ordem.slice(0, inicio)]) if (!s.exercicios[p.ei].series[p.si].feita) return p;
  return null;
}

/** Primeira série não feita de um exercício (ou a última, se todas feitas). */
export function serieDoExercicio(s: Sessao, ei: number): Posicao {
  const series = s.exercicios[ei].series;
  const si = series.findIndex((x) => !x.feita);
  return { ei, si: si === -1 ? Math.max(0, series.length - 1) : si };
}

function trocarSerie(s: Sessao, p: Posicao, nova: Partial<SerieFeita>): Sessao {
  return { ...s, exercicios: s.exercicios.map((e, i) => (i !== p.ei ? e : { ...e, series: e.series.map((x, j) => (j === p.si ? { ...x, ...nova } : x)) })) };
}

export function concluirSerie(s: Sessao, p: Posicao, reps: number, carga: number): Sessao {
  return trocarSerie(s, p, { reps, carga, feita: true });
}

export function desfazerSerie(s: Sessao, p: Posicao): Sessao {
  return trocarSerie(s, p, { feita: false });
}

/** Série a mais no exercício, com a carga e as reps da última. */
export function adicionarSerie(s: Sessao, ei: number): Sessao {
  return {
    ...s,
    exercicios: s.exercicios.map((e, i) => {
      if (i !== ei) return e;
      const ult = e.series.at(-1) ?? { reps: 10, carga: 0, feita: false };
      return { ...e, series: [...e.series, { reps: ult.reps, carga: ult.carga, feita: false }] };
    }),
  };
}

/** Carga que a série deve começar: a da série anterior já feita no exercício (o que você acabou de usar); senão, a da ficha. */
export function cargaSugerida(s: Sessao, p: Posicao): number {
  const series = s.exercicios[p.ei].series;
  for (let j = p.si - 1; j >= 0; j--) if (series[j].feita) return series[j].carga;
  return series[p.si].carga;
}

/** O que foi feito nessa mesma série no último treino com o exercício (séries concluídas). */
export function ultimaVez(sessoes: Sessao[], atual: Sessao, exercicioId: string, nome: string, si: number): (SerieFeita & { data: string }) | null {
  const ant = sessoes
    .filter((x) => x.id !== atual.id && x.data <= atual.data) // toda série concluída vale, com ou sem "Salvar treino"
    .sort((a, b) => b.data.localeCompare(a.data));
  for (const x of ant) {
    const e = x.exercicios.find((y) => y.exercicioId === exercicioId) ?? x.exercicios.find((y) => y.nome === nome);
    const feitas = e?.series.filter((y) => y.feita) ?? [];
    if (feitas.length) return { ...(feitas[si] ?? feitas.at(-1)!), data: x.data };
  }
  return null;
}

export interface ResumoSessao {
  seriesFeitas: number;
  seriesTotal: number;
  /** Soma de carga × repetições das séries feitas (kg). */
  volume: number;
  /** Milissegundos entre o início e o fim (ou agora). */
  duracao: number | null;
  exercicios: { nome: string; feitas: number; total: number; melhor: SerieFeita | null }[];
}

export function resumoSessao(s: Sessao, agora: number): ResumoSessao {
  let seriesFeitas = 0, seriesTotal = 0, volume = 0;
  const exercicios = s.exercicios.map((e) => {
    const feitas = e.series.filter((x) => x.feita);
    seriesFeitas += feitas.length;
    seriesTotal += e.series.length;
    volume += feitas.reduce((t, x) => t + x.carga * x.reps, 0);
    const melhor = feitas.reduce<SerieFeita | null>((m, x) => (!m || x.carga > m.carga || (x.carga === m.carga && x.reps > m.reps) ? x : m), null);
    return { nome: e.nome, feitas: feitas.length, total: e.series.length, melhor };
  });
  return { seriesFeitas, seriesTotal, volume: Math.round(volume * 10) / 10, duracao: s.inicio !== undefined ? (s.fim ?? agora) - s.inicio : null, exercicios };
}

/** "47 min", "1 h 05 min", "0:42" (menos de 1 minuto vira m:ss). */
export function formatarDuracao(ms: number): string {
  const seg = Math.max(0, Math.floor(ms / 1000));
  if (seg < 60) return `0:${String(seg).padStart(2, "0")}`;
  const min = Math.floor(seg / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

/** Relógio do treino: "12:05" (m:ss) ou "1:02:05". */
export function relogio(ms: number): string {
  const seg = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
