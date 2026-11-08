import type { Alimento, DiaDieta, Refeicao } from "../../data/types.ts";

/**
 * Diário da dieta: o que foi comido do plano (por alimento) e o que foi comido fora dele.
 * Refeição inteira comida fica em `feitas` (como sempre foi); comida em parte, os alimentos ficam em `comidos`
 * como "refeição/alimento". Assim registros antigos (só `feitas`) continuam valendo.
 */
export const chave = (refId: string, alimentoId: string) => `${refId}/${alimentoId}`;

export function comeu(reg: DiaDieta, r: Refeicao, alimentoId: string): boolean {
  return reg.feitas.includes(r.id) || (reg.comidos ?? []).includes(chave(r.id, alimentoId));
}

export type EstadoRefeicao = "toda" | "parte" | "nada";

export function estadoRefeicao(reg: DiaDieta, r: Refeicao): EstadoRefeicao {
  if (reg.feitas.includes(r.id)) return "toda";
  const n = r.alimentos.filter((a) => comeu(reg, r, a.id)).length;
  return n === 0 ? "nada" : n === r.alimentos.length ? "toda" : "parte";
}

const semDaRefeicao = (comidos: string[] | undefined, refId: string) => (comidos ?? []).filter((k) => !k.startsWith(refId + "/"));

/** Marca/desmarca a refeição inteira (comida em parte → passa a toda). */
export function alternarRefeicaoNoDia(reg: DiaDieta, refId: string): DiaDieta {
  const toda = reg.feitas.includes(refId);
  return { ...reg, feitas: toda ? reg.feitas.filter((x) => x !== refId) : [...reg.feitas, refId], comidos: semDaRefeicao(reg.comidos, refId) };
}

/** Marca/desmarca um alimento. Comeu todos → a refeição vira "feita"; desmarcou um de uma feita → os outros continuam comidos. */
export function alternarAlimentoNoDia(reg: DiaDieta, r: Refeicao, alimentoId: string): DiaDieta {
  const comidosAgora = new Set(r.alimentos.filter((a) => comeu(reg, r, a.id)).map((a) => a.id));
  if (comidosAgora.has(alimentoId)) comidosAgora.delete(alimentoId);
  else comidosAgora.add(alimentoId);
  const outras = semDaRefeicao(reg.comidos, r.id);
  const feitas = reg.feitas.filter((x) => x !== r.id);
  if (r.alimentos.length > 0 && r.alimentos.every((a) => comidosAgora.has(a.id))) return { ...reg, feitas: [...feitas, r.id], comidos: outras };
  return { ...reg, feitas, comidos: [...outras, ...r.alimentos.filter((a) => comidosAgora.has(a.id)).map((a) => chave(r.id, a.id))] };
}

const soma = (as: Alimento[]) => ({
  kcal: as.reduce((t, a) => t + (a.kcal ?? 0), 0),
  proteina: Math.round(as.reduce((t, a) => t + (a.proteina ?? 0), 0) * 10) / 10,
});

export interface ResumoDia {
  /** Alimentos do plano: comidos / total (refeição sem alimentos conta como 1 item). */
  itensComidos: number;
  itensTotal: number;
  /** 0 a 1. null se o dia não tem plano. */
  seguido: number | null;
  plano: { kcal: number; proteina: number };
  doPlano: { kcal: number; proteina: number };
  fora: { kcal: number; proteina: number };
  total: { kcal: number; proteina: number };
}

export function resumoDia(reg: DiaDieta, refs: Refeicao[]): ResumoDia {
  let itensTotal = 0, itensComidos = 0;
  const comidos: Alimento[] = [];
  for (const r of refs) {
    if (r.alimentos.length === 0) {
      itensTotal++;
      if (reg.feitas.includes(r.id)) itensComidos++;
      continue;
    }
    for (const a of r.alimentos) {
      itensTotal++;
      if (comeu(reg, r, a.id)) { itensComidos++; comidos.push(a); }
    }
  }
  const plano = soma(refs.flatMap((r) => r.alimentos));
  const doPlano = soma(comidos);
  const fora = soma(reg.extras ?? []);
  return {
    itensComidos, itensTotal,
    seguido: itensTotal ? itensComidos / itensTotal : null,
    plano, doPlano, fora,
    total: { kcal: doPlano.kcal + fora.kcal, proteina: Math.round((doPlano.proteina + fora.proteina) * 10) / 10 },
  };
}
