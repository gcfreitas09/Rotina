/**
 * Dados de exemplo da primeira abertura. Todo id começa com "ex-",
 * assim "Limpar exemplos" remove exatamente estes registros (e a remoção sincroniza).
 */
import type {
  Alimento, Avaliacao, Bloco, Colecoes, Dia, Ficha, Materia, NomeColecao, Peso, Refeicao, Semestre, Sessao, Tarefa,
  TipoBloco, TipoRefeicao,
} from "./types.ts";
import { hoje, somarDias } from "./datas.ts";
import { excluir, lista, salvarVarios } from "./store.ts";
import { COLECOES } from "./types.ts";
import { gravarMeta, lerMeta } from "./storage.ts";

const PFX = "ex-";
const av = (nota: number | null, data: string | null = null): Avaliacao => ({ nota, data });
const sem = (p1: number | null, p2: number | null, t1: number | null, t2: number | null, extra: number | null = null, rec: number | null = null, datas: Partial<Record<keyof Semestre, string>> = {}): Semestre => ({
  p1: av(p1, datas.p1 ?? null),
  p2: av(p2, datas.p2 ?? null),
  t1: av(t1, datas.t1 ?? null),
  t2: av(t2, datas.t2 ?? null),
  extra: av(extra),
  rec: av(rec, datas.rec ?? null),
});

function gerar(): { [C in NomeColecao]?: Colecoes[C][] } {
  const h = hoje();
  const d = (n: number) => somarDias(h, n);
  const base = { _m: 0 };

  const materias: Materia[] = [
    { ...base, id: PFX + "mat", nome: "Matemática", semestres: [sem(3.0, 3.2, 1.8, 1.0), sem(3.3, null, 1.5, null, null, null, { p2: d(9) })], exame: av(null) },
    { ...base, id: PFX + "por", nome: "Português", semestres: [sem(2.8, 2.5, 1.7, 0.8, 0.5), sem(1.0, 1.0, null, null, null, null, { rec: d(12), t1: d(5) })], exame: av(null) },
    { ...base, id: PFX + "his", nome: "História", semestres: [sem(1.5, 2.0, 1.0, 0.5, null, 5.0), sem(2.5, 2.0, 1.2, 0.6)], exame: av(null, d(26)) },
    { ...base, id: PFX + "fis", nome: "Física", semestres: [sem(1.5, 1.5, 2.0, 1.0, null, 4.0), sem(2.9, 3.1, 1.6, 0.9)], exame: av(null) },
    { ...base, id: PFX + "bio", nome: "Biologia", semestres: [sem(3.4, 3.0, 2.0, 0.9), sem(3.1, null, null, null, null, null, { p2: d(3), t1: d(16) })], exame: av(null) },
  ];

  const t = (id: string, titulo: string, data: string, prioridade: Tarefa["prioridade"], categoria: string, extra: Partial<Tarefa> = {}): Tarefa => ({
    ...base, id: PFX + id, titulo, descricao: "", data, prioridade, categoria, subtarefas: [], recorrencia: { tipo: "nenhuma" },
    concluida: false, concluidaEm: null, feitasEm: [], ...extra,
  });
  const tarefas: Tarefa[] = [
    t("t1", "Lista de exercícios de funções", d(-1), "alta", "Escola", {
      subtarefas: [{ id: "s1", texto: "Questões 1 a 10", feita: true }, { id: "s2", texto: "Questões 11 a 20", feita: false }],
    }),
    t("t2", "Resumo do capítulo 7 de História", h, "media", "Escola"),
    t("t3", "Fechar planilha de estoque", h, "alta", "Trabalho", { descricao: "Mandar para a Carla até as 17h." }),
    t("t4", "Revisar vocabulário de inglês", h, "baixa", "Pessoal", { recorrencia: { tipo: "dias", dias: [0, 2, 4] } }),
    t("t5", "Entregar arte do cardápio", d(4), "media", "Freela"),
    t("t6", "Trabalho de Biologia: célula", d(16), "alta", "Escola", {
      subtarefas: [{ id: "s3", texto: "Escolher o modelo", feita: false }, { id: "s4", texto: "Comprar isopor", feita: false }],
    }),
    t("t7", "Pagar a mensalidade da academia", d(-6), "media", "Pessoal", { concluida: true, concluidaEm: d(-6) }),
  ];

  let n = 0;
  const blocosDe = (nome: string, tipo: TipoBloco, dias: Dia[], inicio: string, fim: string, local = ""): Bloco[] => {
    const grupo = PFX + "g" + ++n;
    return dias.map((dia) => ({ ...base, id: `${grupo}-${dia}`, grupo, nome, tipo, dia, inicio, fim, local }));
  };
  const blocos: Bloco[] = [
    ...blocosDe("Aula", "aula", [0, 1, 2, 3, 4], "07:30", "12:00", "Escola Estadual"),
    ...blocosDe("Trabalho", "trabalho", [0, 1, 2, 3, 4], "13:30", "18:00", "Loja"),
    ...blocosDe("Academia", "academia", [0, 1, 2, 3, 4], "18:30", "19:45"),
    ...blocosDe("Inglês", "estudo", [2], "18:00", "19:00", "Online"),
    ...blocosDe("Estudo", "estudo", [1, 3], "20:15", "21:30"),
    ...blocosDe("Futebol com a turma", "livre", [5], "16:00", "18:00", "Quadra do bairro"),
  ];

  const al = (nome: string, quantidade: string, kcal: number | null, proteina: number | null): Alimento => ({ id: PFX + "a" + ++n, nome, quantidade, kcal, proteina });
  const todosDias: Dia[] = [0, 1, 2, 3, 4, 5, 6];
  const ref = (nome: string, tipo: TipoRefeicao, horario: string, alimentos: () => Alimento[], dias: Dia[] = todosDias): Refeicao[] => {
    const grupo = PFX + "r" + ++n;
    return dias.map((dia) => ({ ...base, id: `${grupo}-${dia}`, grupo, nome, tipo, dia, horario, alimentos: alimentos() }));
  };
  const refeicoes: Refeicao[] = [
    ...ref("Café da manhã", "cafe", "06:45", () => [al("Pão francês", "2 unidades", 270, 8), al("Ovo mexido", "3 ovos", 230, 18), al("Banana", "1 unidade", 90, 1)]),
    ...ref("Almoço", "almoco", "12:20", () => [al("Arroz", "150 g", 195, 4), al("Feijão", "1 concha", 140, 9), al("Frango grelhado", "150 g", 250, 46), al("Salada", "à vontade", null, null)]),
    ...ref("Lanche", "lanche", "16:00", () => [al("Iogurte natural", "1 pote", 110, 7), al("Aveia", "30 g", 115, 4)], [0, 1, 2, 3, 4]),
    ...ref("Pré-treino", "pre", "18:10", () => [al("Banana com pasta de amendoim", "1 + 1 colher", 190, 5)], [0, 1, 2, 3, 4]),
    ...ref("Pós-treino", "pos", "20:00", () => [al("Whey", "30 g", 120, 24), al("Leite", "200 ml", 120, 6)], [0, 1, 2, 3, 4]),
    ...ref("Janta", "janta", "21:00", () => [al("Macarrão", "120 g", 190, 7), al("Carne moída", "120 g", 260, 30)]),
  ];

  const ex = (id: string, nome: string, series: number, reps: number, carga: number) => ({ id: PFX + id, nome, series, reps, carga });
  const fichas: Ficha[] = [
    { ...base, id: PFX + "push", nome: "Push", dias: [0, 3], exercicios: [ex("e1", "Supino reto", 4, 8, 40), ex("e2", "Desenvolvimento com halteres", 3, 10, 14), ex("e3", "Tríceps na polia", 3, 12, 25)] },
    { ...base, id: PFX + "pull", nome: "Pull", dias: [1, 4], exercicios: [ex("e4", "Puxada frontal", 4, 10, 45), ex("e5", "Remada curvada", 3, 10, 30), ex("e6", "Rosca direta", 3, 12, 10)] },
    { ...base, id: PFX + "legs", nome: "Legs", dias: [2], exercicios: [ex("e7", "Agachamento livre", 4, 8, 50), ex("e8", "Leg press", 3, 12, 120), ex("e9", "Panturrilha em pé", 4, 15, 40)] },
  ];

  const cargas = [32, 34, 34, 36, 36, 38, 38, 40];
  const sessoes: Sessao[] = cargas.map((c, i) => ({
    ...base, id: PFX + "ses" + i, data: d(-7 * (cargas.length - i)), fichaId: PFX + "push", fichaNome: "Push", concluida: true,
    exercicios: [
      { exercicioId: PFX + "e1", nome: "Supino reto", series: Array.from({ length: 4 }, () => ({ reps: 8, carga: c, feita: true })) },
      { exercicioId: PFX + "e2", nome: "Desenvolvimento com halteres", series: Array.from({ length: 3 }, () => ({ reps: 10, carga: 10 + Math.floor(i / 2), feita: true })) },
    ],
  }));

  const pesos: Peso[] = [68.2, 68.6, 68.5, 69.1, 69.4, 69.8].map((kg, i) => ({ ...base, id: PFX + "p" + i, data: d(-10 * (5 - i)), kg }));

  return { materias, tarefas, blocos, refeicoes, fichas, sessoes, pesos };
}

/** Carrega exemplos só na primeiríssima abertura deste aparelho. */
export function carregarExemplosSePrimeiraVez() {
  if (lerMeta().exemplosCarregados) return;
  gravarMeta({ exemplosCarregados: true });
  const vazio = COLECOES.every((c) => lista(c).length === 0);
  if (!vazio) return;
  const dados = gerar();
  for (const c of Object.keys(dados) as NomeColecao[]) salvarVarios(c, dados[c] as never[]);
}

export function temExemplos(): boolean {
  return COLECOES.some((c) => lista(c).some((r) => r.id.startsWith(PFX)));
}

export function limparExemplos(): () => void {
  const desfazer: (() => void)[] = [];
  for (const c of COLECOES) {
    const ids = lista(c).filter((r) => r.id.startsWith(PFX)).map((r) => r.id);
    if (ids.length) desfazer.push(excluir(c, ids));
  }
  return () => desfazer.forEach((f) => f());
}
