import type { Tarefa } from "../../data/types.ts";
import { diaDaSemana, diasEntre, somarDias } from "../../data/datas.ts";

export const CATEGORIAS_FIXAS = ["Escola", "Trabalho", "Pessoal", "Freela"];

export function recorrente(t: Tarefa): boolean {
  return t.recorrencia.tipo !== "nenhuma";
}

/** A tarefa tem uma ocorrência nesta data? */
export function ocorreEm(t: Tarefa, data: string): boolean {
  const r = t.recorrencia;
  if (r.tipo === "nenhuma") return t.data === data;
  if (data < t.data) return false;
  if (r.tipo === "diaria") return true;
  if (r.tipo === "semanal") return diaDaSemana(data) === diaDaSemana(t.data);
  return r.dias.includes(diaDaSemana(data));
}

export function feitaEm(t: Tarefa, data: string): boolean {
  return recorrente(t) ? t.feitasEm.includes(data) : t.concluida;
}

/** Próxima data (a partir de `desde`, inclusive) em que a tarefa ainda está pendente. */
export function proximaData(t: Tarefa, desde: string): string | null {
  if (!recorrente(t)) return t.concluida ? null : t.data;
  for (let i = 0; i < 400; i++) {
    const d = somarDias(desde, i);
    if (ocorreEm(t, d) && !t.feitasEm.includes(d)) return d;
  }
  return null;
}

export function atrasada(t: Tarefa, hoje: string): boolean {
  return !recorrente(t) && !t.concluida && t.data < hoje;
}

export type Urgencia = "urgente" | "alta" | "media" | "tranquila";

export const ROTULO_URGENCIA: Record<Urgencia, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  tranquila: "Tranquila",
};

/**
 * Urgência = prazo + prioridade.
 *  prazo:      atrasada 4 · hoje 3 · amanhã 2 · até 7 dias 1 · depois 0
 *  prioridade: alta +1 · média 0 · baixa −1
 *  4 ou mais urgente · 3 alta · 2 média · menos que isso tranquila.
 *  Atrasada é sempre urgente, qualquer que seja a prioridade.
 */
export function urgencia(prioridade: Tarefa["prioridade"], data: string, hojeIso: string): Urgencia {
  const dias = diasEntre(hojeIso, data);
  if (dias < 0) return "urgente";
  const prazo = dias === 0 ? 3 : dias === 1 ? 2 : dias <= 7 ? 1 : 0;
  const pontos = prazo + (prioridade === "alta" ? 1 : prioridade === "baixa" ? -1 : 0);
  return pontos >= 4 ? "urgente" : pontos === 3 ? "alta" : pontos === 2 ? "media" : "tranquila";
}

/** Marca/desmarca como feita na data (recorrente) ou de vez (simples). */
export function alternar(t: Tarefa, data: string, hojeIso: string): Tarefa {
  if (recorrente(t)) {
    const feitas = t.feitasEm.includes(data) ? t.feitasEm.filter((d) => d !== data) : [...t.feitasEm, data];
    return { ...t, feitasEm: feitas };
  }
  return { ...t, concluida: !t.concluida, concluidaEm: t.concluida ? null : hojeIso };
}

export type Filtro = "hoje" | "semana" | "atrasadas" | "concluidas" | "todas";

export interface Linha {
  tarefa: Tarefa;
  /** Data mostrada: entrega ou a ocorrência relevante. */
  data: string;
}

const PESO = { alta: 0, media: 1, baixa: 2 } as const;

export function filtrar(tarefas: Tarefa[], filtro: Filtro, hoje: string, categoria: string | null): Linha[] {
  // "Semana" = hoje e os próximos 6 dias, não a semana de calendário: aos domingos a de calendário acabava hoje e
  // a tarefa de amanhã (segunda) sumia do filtro.
  const dom = somarDias(hoje, 6);
  const linhas: Linha[] = [];
  for (const t of tarefas) {
    if (categoria && t.categoria !== categoria) continue;
    if (filtro === "concluidas") {
      if (!recorrente(t) && t.concluida) linhas.push({ tarefa: t, data: t.concluidaEm ?? t.data });
      else if (recorrente(t) && t.feitasEm.length) linhas.push({ tarefa: t, data: [...t.feitasEm].sort().at(-1)! });
      continue;
    }
    if (recorrente(t)) {
      if (filtro === "atrasadas") continue;
      const prox = proximaData(t, hoje);
      if (!prox) continue;
      if (filtro === "hoje" && prox !== hoje) continue;
      if (filtro === "semana" && prox > dom) continue;
      linhas.push({ tarefa: t, data: prox });
      continue;
    }
    if (t.concluida) continue;
    if (filtro === "hoje" && t.data > hoje) continue; // hoje inclui atrasadas
    if (filtro === "atrasadas" && t.data >= hoje) continue;
    if (filtro === "semana" && t.data > dom) continue;
    linhas.push({ tarefa: t, data: t.data });
  }
  const ordem = filtro === "concluidas" ? -1 : 1;
  return linhas.sort(
    (a, b) => ordem * a.data.localeCompare(b.data) || PESO[a.tarefa.prioridade] - PESO[b.tarefa.prioridade],
  );
}

export function descreverRecorrencia(t: Tarefa): string {
  const r = t.recorrencia;
  if (r.tipo === "diaria") return "Todo dia";
  if (r.tipo === "semanal") return "Toda semana";
  if (r.tipo === "dias") {
    const n = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
    return [...r.dias].sort().map((d) => n[d]).join(", ");
  }
  return "";
}
