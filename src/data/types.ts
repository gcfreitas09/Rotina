import type { NotasSemestre } from "../config/gradingRules.ts";

/**
 * Todo registro sincronizável carrega:
 *  _m = momento da última alteração (ms) — decide quem vence na sincronia
 *  _x = excluído (lápide), para a exclusão chegar ao outro aparelho
 */
export interface Base {
  id: string;
  _m: number;
  _x?: boolean;
}

/** Dia da semana com a segunda-feira como 0 … domingo como 6. */
export type Dia = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Prioridade = "baixa" | "media" | "alta";

export interface Subtarefa {
  id: string;
  texto: string;
  feita: boolean;
}

export type Recorrencia =
  | { tipo: "nenhuma" }
  | { tipo: "diaria" }
  | { tipo: "semanal" }
  | { tipo: "dias"; dias: Dia[] };

export interface Tarefa extends Base {
  titulo: string;
  descricao: string;
  /** Data de entrega (aaaa-mm-dd). Em recorrentes, o primeiro dia. */
  data: string;
  prioridade: Prioridade;
  categoria: string;
  subtarefas: Subtarefa[];
  recorrencia: Recorrencia;
  /** Tarefa simples: concluída ou não. */
  concluida: boolean;
  concluidaEm: string | null;
  /** Recorrente: datas (aaaa-mm-dd) em que a ocorrência foi concluída. */
  feitasEm: string[];
}

export interface Categoria extends Base {
  nome: string;
}

export interface Avaliacao {
  nota: number | null;
  data: string | null;
}

export type ChaveNota = keyof NotasSemestre;

export interface Semestre {
  p1: Avaliacao;
  p2: Avaliacao;
  t1: Avaliacao;
  t2: Avaliacao;
  extra: Avaliacao;
  rec: Avaliacao;
}

export interface Materia extends Base {
  nome: string;
  semestres: [Semestre, Semestre];
  exame: Avaliacao;
}

export type TipoBloco = "aula" | "trabalho" | "academia" | "futevolei" | "estudo" | "livre";

/**
 * Um bloco por dia. Blocos criados com "Repetir" compartilham `grupo`,
 * para editar só um dia ou todos de uma vez.
 */
export interface Bloco extends Base {
  grupo: string;
  nome: string;
  tipo: TipoBloco;
  dia: Dia;
  inicio: string; // HH:MM
  fim: string;
  local: string;
}

export type TipoRefeicao = "cafe" | "almoco" | "lanche" | "janta" | "pre" | "pos" | "outra";

export interface Alimento {
  id: string;
  nome: string;
  quantidade: string;
  kcal: number | null;
  proteina: number | null;
  /** Alimento da TACO usado no cálculo (id em modules/dieta/taco.json). */
  ref?: number;
  /** Produto de marca (Open Food Facts) usado no cálculo: guarda os valores, que não estão na tabela local. */
  base?: { id: string; nome: string; kcal100: number; prot100: number; fonte: string; marca?: string; porcao?: number };
  /** Calculados pelo app (ausente = digitado à mão ou vazio). */
  autoKcal?: boolean;
  autoProt?: boolean;
}

/** Refeição de um dia do plano. Mesma lógica de `grupo` dos blocos. */
export interface Refeicao extends Base {
  grupo: string;
  nome: string;
  tipo: TipoRefeicao;
  dia: Dia;
  horario: string;
  alimentos: Alimento[];
}

/** Registro diário da dieta. id = aaaa-mm-dd. */
export interface DiaDieta extends Base {
  /** Refeições comidas inteiras. */
  feitas: string[];
  aguaMl: number;
  /** Alimentos do plano comidos (refeição comida em parte), como "refeicaoId/alimentoId". Ver modules/dieta/diario.ts. */
  comidos?: string[];
  /** Comido fora do plano neste dia. */
  extras?: Alimento[];
}

export interface Exercicio {
  id: string;
  nome: string;
  series: number;
  /** Repetições (ou o início da faixa, em "8–10"). */
  reps: number;
  /** Fim da faixa de repetições, quando é faixa. */
  repsMax?: number;
  carga: number;
  /** Descanso depois de cada série deste exercício, em segundos (ou o mínimo da faixa, em "120–190"). Sem: o padrão. */
  descanso?: number;
  /** Máximo da faixa de descanso. */
  descansoMax?: number;
}

export interface Ficha extends Base {
  nome: string;
  dias: Dia[];
  exercicios: Exercicio[];
}

export interface SerieFeita {
  reps: number;
  carga: number;
  feita: boolean;
}

export interface Sessao extends Base {
  data: string;
  fichaId: string;
  fichaNome: string;
  exercicios: { exercicioId: string; nome: string; series: SerieFeita[] }[];
  concluida: boolean;
  /** Descanso em andamento (salvo: sair do app, voltar ou trocar de exercício não zera). Ver treino/descanso.ts. */
  descanso?: { inicio: number; minMs: number; maxMs: number } | null;
  /** Início e fim do treino (ms), para a duração. Sessões antigas não têm. */
  inicio?: number;
  fim?: number;
}

export interface Peso extends Base {
  data: string;
  kg: number;
}

/** Pasta de flashcards de uma matéria (ex.: Biologia → "Citologia"). */
export interface Baralho extends Base {
  materia: string;
  nome: string;
}

/** Cartão: pergunta na frente, resposta no verso. Repetição espaçada por caixas (Leitner). */
export interface Cartao extends Base {
  baralhoId: string;
  frente: string;
  verso: string;
  /** 1 a 5. Acertou sobe; errou volta para 1. */
  caixa: number;
  /** Data (aaaa-mm-dd) da próxima revisão. */
  proxima: string;
  acertos: number;
  erros: number;
  /** Dificuldade escolhida por quem estuda. Cartão antigo, sem o campo, vale "medio". */
  dificuldade?: Dificuldade;
  /** Imagem da pergunta e da resposta (JPEG reduzido, como data URL). Ver modules/flashcards/imagem.ts. */
  imagem?: string;
  imagemVerso?: string;
  /** Resposta em forma de comparação: o que se compara (colunas) e as respostas por aspecto (linhas). */
  comparacao?: Comparacao;
}

export interface Comparacao {
  itens: string[];
  linhas: { criterio: string; valores: string[] }[];
}

export type Dificuldade = "facil" | "medio" | "dificil";

export type Tema = "claro" | "escuro" | "sistema";

export interface Config extends Base {
  nome: string;
  mediaAprovacao: number;
  minimoExame: number;
  metaAguaMl: number;
  tema: Tema;
  descansoSeg: number;
  /** Metas diárias de leitura. */
  metaPaginasDia: number;
  metaMinutosLeitura: number;
  /** Nome do atalho do iPhone que liga o Foco "Leitura" ("" = não usar). Ver modules/leitura. */
  atalhoLeitura: string;
  /** Liga o Foco sem sair do app: o Rotina copia os minutos e a pessoa aciona o atalho (Toque Duplo, Botão de Ação…). */
  focoSemSair: boolean;
}

/** Livro na estante de leitura. */
export interface Livro extends Base {
  titulo: string;
  autor: string;
  /** Total de páginas. */
  paginas: number;
  /** Página onde parou. */
  pagina: number;
  estado: "lendo" | "lido";
  concluidoEm?: string | null;
}

/** Uma sessão de leitura com tempo. fim = null enquanto está lendo. */
export interface Leitura extends Base {
  livroId: string;
  data: string;
  inicio: number;
  /** Minutos escolhidos ao iniciar. */
  planejadoMin: number;
  fim: number | null;
  paginaInicio: number;
  paginaFim: number | null;
  /** Ligou o Foco do iPhone pelo atalho ao começar (aí, encerrar antes do tempo desliga). */
  focoIphone?: boolean;
}

/** Onde o dinheiro está: conta/dinheiro ou um dos vales (que só servem para aquilo). */
export type Carteira = "conta" | "vr" | "va" | "vt";

/** Entrada ou gasto. Valor em centavos (> 0). */
export interface Lancamento extends Base {
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  categoria: string;
  carteira: Carteira;
  data: string;
  /** Lançado a partir de um fixo do mês ("Recebi"/"Paguei"). */
  fixoId?: string | null;
}

/** Entrada ou gasto que se repete todo mês (salário, vale, aluguel, assinatura). */
export interface Fixo extends Base {
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  categoria: string;
  carteira: Carteira;
  /** Dia do mês (1 a 31; no mês mais curto vira o último dia). */
  dia: number;
  /** Primeiro mês em que vale (aaaa-mm). */
  desde: string;
}

export interface Colecoes {
  config: Config;
  tarefas: Tarefa;
  categorias: Categoria;
  materias: Materia;
  blocos: Bloco;
  refeicoes: Refeicao;
  diasDieta: DiaDieta;
  fichas: Ficha;
  sessoes: Sessao;
  pesos: Peso;
  baralhos: Baralho;
  cartoes: Cartao;
  livros: Livro;
  leituras: Leitura;
  lancamentos: Lancamento;
  fixos: Fixo;
}

export type NomeColecao = keyof Colecoes;

export const COLECOES: NomeColecao[] = [
  "config",
  "tarefas",
  "categorias",
  "materias",
  "blocos",
  "refeicoes",
  "diasDieta",
  "fichas",
  "sessoes",
  "pesos",
  "baralhos",
  "cartoes",
  "livros",
  "leituras",
  "lancamentos",
  "fixos",
];
