/**
 * Regras de notas da escola — ÚNICO lugar com valores máximos e fórmulas.
 * Para mudar a regra, edite só este arquivo; telas e calculadoras leem daqui.
 *
 * Semestre (soma, máx. 10):  P1 (3,5) + P2 (3,5) + Trabalho 1 (2,0) + Trabalho 2 (1,0)
 * Ponto extra (0,5):         soma no semestre, mas o semestre nunca passa de 10.
 * Recuperação (7,0):         bloco das provas = (P1 + P2 + 2 × Rec) / 2,
 *                            limitado ao máximo do bloco (7,0) e nunca abaixo de P1 + P2.
 * Média anual:               (1º semestre + 2º semestre) / 2
 * Exame final (10):          média final = (média anual + exame) / 2
 */

export const MAXIMOS = {
  p1: 3.5,
  p2: 3.5,
  t1: 2,
  t2: 1,
  extra: 0.5,
  rec: 7,
  exame: 10,
} as const;

export type ChaveAvaliacao = keyof typeof MAXIMOS;

/** Avaliações que compõem a soma de cada semestre, na ordem em que aparecem. */
export const AVALIACOES_SEMESTRE = ["p1", "p2", "t1", "t2"] as const;
export type ChaveSemestre = (typeof AVALIACOES_SEMESTRE)[number];

export const ROTULOS: Record<ChaveAvaliacao, string> = {
  p1: "P1",
  p2: "P2",
  t1: "Trabalho 1",
  t2: "Trabalho 2",
  extra: "Ponto extra",
  rec: "Recuperação",
  exame: "Exame final",
};

export const MAX_SEMESTRE = 10;
export const MAX_BLOCO_PROVAS = MAXIMOS.p1 + MAXIMOS.p2; // 7,0

/** Padrões editáveis em Configurações. */
export const PADROES = {
  mediaAprovacao: 7,
  minimoExame: 5,
};

/** Notas lançadas de um semestre. `null` = ainda não lançada. */
export interface NotasSemestre {
  p1: number | null;
  p2: number | null;
  t1: number | null;
  t2: number | null;
  extra: number | null;
  rec: number | null;
}

const n = (v: number | null | undefined) => (typeof v === "number" && isFinite(v) ? v : 0);
const lancada = (v: number | null | undefined): v is number => typeof v === "number" && isFinite(v);
/** Evita 6.999999 por causa de ponto flutuante. */
const r = (v: number) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------- fórmulas

/** Resultado da fórmula da recuperação, sem os limites. */
export function formulaRecuperacao(somaProvas: number, rec: number): number {
  return (somaProvas + 2 * rec) / 2;
}

/** Bloco das provas já com recuperação: nunca abaixo de P1+P2, nunca acima de 7,0. */
export function blocoProvas(s: Pick<NotasSemestre, "p1" | "p2" | "rec">): {
  original: number;
  final: number;
  usouRecuperacao: boolean;
} {
  const original = r(n(s.p1) + n(s.p2));
  if (!lancada(s.rec)) return { original, final: original, usouRecuperacao: false };
  const comRec = r(Math.min(formulaRecuperacao(original, s.rec), MAX_BLOCO_PROVAS));
  const final = Math.max(original, comRec);
  return { original, final, usouRecuperacao: comRec > original };
}

export interface ResultadoSemestre {
  /** Soma sem recuperação e sem ponto extra. */
  somaOriginal: number;
  blocoOriginal: number;
  blocoFinal: number;
  usouRecuperacao: boolean;
  /** Quanto do ponto extra entrou de fato (0 se o semestre já estava em 10). */
  extraAplicado: number;
  nota: number;
  /** Todas as quatro avaliações lançadas. */
  completo: boolean;
  provasLancadas: boolean;
}

export function calcularSemestre(s: NotasSemestre): ResultadoSemestre {
  const bloco = blocoProvas(s);
  const trabalhos = n(s.t1) + n(s.t2);
  const semExtra = r(Math.min(MAX_SEMESTRE, bloco.final + trabalhos));
  const nota = r(Math.min(MAX_SEMESTRE, semExtra + n(s.extra)));
  return {
    somaOriginal: r(bloco.original + trabalhos),
    blocoOriginal: bloco.original,
    blocoFinal: bloco.final,
    usouRecuperacao: bloco.usouRecuperacao,
    extraAplicado: r(nota - semExtra),
    nota,
    completo: AVALIACOES_SEMESTRE.every((k) => lancada(s[k])),
    provasLancadas: lancada(s.p1) && lancada(s.p2),
  };
}

export function mediaAnual(s1: number, s2: number): number {
  return r((s1 + s2) / 2);
}

export function mediaFinalComExame(anual: number, exame: number): number {
  return r((anual + exame) / 2);
}

// ---------------------------------------------------------------- situação

export type Situacao = "Aprovado" | "Em recuperação" | "Em exame" | "Reprovado" | "Cursando";

export interface Regras {
  mediaAprovacao: number;
  minimoExame: number;
}

export interface ResultadoMateria {
  semestres: [ResultadoSemestre, ResultadoSemestre];
  anual: number | null;
  exameDisponivel: boolean;
  mediaFinal: number | null;
  situacao: Situacao;
  abaixoDaMedia: boolean;
}

/** Semestre com provas lançadas, abaixo da média e sem recuperação feita. */
export function precisaRecuperacao(s: NotasSemestre, regras: Regras): boolean {
  const res = calcularSemestre(s);
  if (!res.provasLancadas || lancada(s.rec)) return false;
  // Considera o máximo que os trabalhos ainda pendentes podem dar.
  const potencial = res.nota + (lancada(s.t1) ? 0 : MAXIMOS.t1) + (lancada(s.t2) ? 0 : MAXIMOS.t2);
  return Math.min(MAX_SEMESTRE, potencial) < regras.mediaAprovacao;
}

export function calcularMateria(
  sem: [NotasSemestre, NotasSemestre],
  exame: number | null,
  regras: Regras,
): ResultadoMateria {
  const s1 = calcularSemestre(sem[0]);
  const s2 = calcularSemestre(sem[1]);
  const fechado = s1.completo && s2.completo;
  const anual = fechado ? mediaAnual(s1.nota, s2.nota) : null;

  if (anual === null) {
    const emRec = sem.some((s) => precisaRecuperacao(s, regras));
    const algumAbaixo = [s1, s2].some((s) => s.completo && s.nota < regras.mediaAprovacao);
    return {
      semestres: [s1, s2],
      anual: null,
      exameDisponivel: false,
      mediaFinal: null,
      situacao: emRec ? "Em recuperação" : "Cursando",
      abaixoDaMedia: emRec || algumAbaixo,
    };
  }

  if (anual >= regras.mediaAprovacao) {
    return { semestres: [s1, s2], anual, exameDisponivel: false, mediaFinal: anual, situacao: "Aprovado", abaixoDaMedia: false };
  }
  if (!lancada(exame)) {
    return { semestres: [s1, s2], anual, exameDisponivel: true, mediaFinal: null, situacao: "Em exame", abaixoDaMedia: true };
  }
  const final = mediaFinalComExame(anual, exame);
  return {
    semestres: [s1, s2],
    anual,
    exameDisponivel: true,
    mediaFinal: final,
    situacao: final >= regras.minimoExame ? "Aprovado" : "Reprovado",
    abaixoDaMedia: final < regras.minimoExame,
  };
}

// ---------------------------------------------------------------- "quanto preciso tirar"

export type Necessidade =
  | { tipo: "garantido" }
  | { tipo: "impossivel"; precisa: number; maximo: number }
  | { tipo: "precisa"; valor: number; maximo: number };

/**
 * Quanto falta nas avaliações ainda não lançadas para o semestre chegar à média.
 * `valor` é a soma necessária nelas; `pendentes` lista quais são.
 */
export function faltaNoSemestre(
  s: NotasSemestre,
  media: number,
): Necessidade & { pendentes: ChaveSemestre[] } {
  const pendentes = AVALIACOES_SEMESTRE.filter((k) => !lancada(s[k]));
  const atual = calcularSemestre(s).nota;
  const falta = r(media - atual);
  const maximo = r(pendentes.reduce((t, k) => t + MAXIMOS[k], 0));
  if (falta <= 0) return { tipo: "garantido", pendentes };
  if (pendentes.length === 0 || falta > maximo) return { tipo: "impossivel", precisa: falta, maximo, pendentes };
  return { tipo: "precisa", valor: falta, maximo, pendentes };
}

/** Nota mínima na recuperação para o semestre chegar à média (fórmula invertida). */
export function recuperacaoNecessaria(s: NotasSemestre, media: number): Necessidade {
  const semRec = calcularSemestre({ ...s, rec: null });
  if (semRec.nota >= media) return { tipo: "garantido" };
  const outros = n(s.t1) + n(s.t2) + n(s.extra);
  const blocoAlvo = r(media - outros);
  // (soma + 2·rec) / 2 = blocoAlvo  →  rec = blocoAlvo − soma/2
  const rec = r(blocoAlvo - semRec.blocoOriginal / 2);
  if (blocoAlvo > MAX_BLOCO_PROVAS || rec > MAXIMOS.rec) {
    return { tipo: "impossivel", precisa: Math.max(rec, 0), maximo: MAXIMOS.rec };
  }
  return { tipo: "precisa", valor: Math.max(rec, 0), maximo: MAXIMOS.rec };
}

/** Nota mínima no exame final: 2 × mínimo − média anual. */
export function exameNecessario(anual: number, minimoExame: number): Necessidade {
  const v = r(2 * minimoExame - anual);
  if (v <= 0) return { tipo: "garantido" };
  if (v > MAXIMOS.exame) return { tipo: "impossivel", precisa: v, maximo: MAXIMOS.exame };
  return { tipo: "precisa", valor: v, maximo: MAXIMOS.exame };
}

/** Valida uma nota digitada. Retorna a mensagem de erro ou null. */
export function validarNota(chave: ChaveAvaliacao, valor: number | null): string | null {
  if (valor === null) return null;
  if (!isFinite(valor)) return "Digite um número, como 7,5.";
  if (valor < 0) return "A nota não pode ser negativa.";
  if (valor > MAXIMOS[chave]) {
    return `${ROTULOS[chave]} vale no máximo ${MAXIMOS[chave].toFixed(1).replace(".", ",")}.`;
  }
  return null;
}
