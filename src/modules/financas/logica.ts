/**
 * Finanças: dinheiro sempre em CENTAVOS (inteiro), para a soma não errar (0,1 + 0,2 em reais dá 0,30000000000000004).
 * Mês = "aaaa-mm". Vales (refeição, alimentação, transporte) são carteiras à parte: não somam no saldo da conta,
 * porque só servem para aquilo.
 */
import type { Carteira, Fixo, Lancamento } from "../../data/types.ts";

export const CARTEIRAS: { id: Carteira; nome: string; curto: string }[] = [
  { id: "conta", nome: "Conta", curto: "Conta" },
  { id: "vr", nome: "Vale-refeição", curto: "VR" },
  { id: "va", nome: "Vale-alimentação", curto: "VA" },
  { id: "vt", nome: "Vale-transporte", curto: "VT" },
];
export const nomeCarteira = (c: Carteira) => CARTEIRAS.find((x) => x.id === c)?.nome ?? c;
export const curtoCarteira = (c: Carteira) => CARTEIRAS.find((x) => x.id === c)?.curto ?? c;

/** Categoria do "Ajustar saldo": mexe no acumulado, mas não conta como entrada/gasto do mês nem nos gráficos de gasto. */
export const AJUSTE = "Ajuste de saldo";
const real = (l: Lancamento) => l.categoria !== AJUSTE;

export const CATEGORIAS_SAIDA = ["Alimentação", "Mercado", "Transporte", "Casa", "Escola", "Saúde", "Lazer", "Roupas", "Assinaturas", "Outros"];
export const CATEGORIAS_ENTRADA = ["Salário", "Vale", "Freela", "Presente", "Venda", "Outros"];

/**
 * Lê valor em reais e devolve centavos. Aceita "1.234,56", "1234,56", "12,5", "12.50", "R$ 30", "1.234".
 * Vazio = null; inválido ou zero/negativo = NaN.
 */
export function lerValor(texto: string): number | null {
  let t = texto.trim().replace(/^r\$\s*/i, "").replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (!/\.\d{1,2}$/.test(t)) t = t.replace(/\./g, ""); // sem vírgula: ponto com 3 dígitos é milhar ("1.234")
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  const c = Math.round(Number(t) * 100);
  return c > 0 ? c : NaN;
}

const FORMATO = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "R$ 1.234,56" (negativo: "−R$ 12,00"). */
export function reais(centavos: number): string {
  const s = `R$ ${FORMATO.format(Math.abs(centavos) / 100)}`;
  return centavos < 0 ? `−${s}` : s;
}
/** Para preencher o campo de valor: "1234,56". */
export const valorCampo = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

// ------------------------------------------------------------------ meses
export const mesDe = (data: string) => data.slice(0, 7);
export function somarMes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const nomeMes = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1] ?? mes;
export const nomeMesAno = (mes: string) => `${nomeMes(mes)} de ${mes.slice(0, 4)}`;

/** Lê o dia do fixo: "5", "05", "05-10", "5 a 10" (faixa: cai entre um e outro). Dias de 1 a 31. null se não entender. */
export function lerDias(texto: string): { dia: number; diaMax?: number } | null {
  const m = texto.trim().toLowerCase().match(/^(\d{1,2})(?:\s*(?:-|–|—|a|até|ate)\s*(\d{1,2}))?$/);
  if (!m) return null;
  let a = Number(m[1]), b = m[2] !== undefined ? Number(m[2]) : a;
  if (a > b) [a, b] = [b, a];
  if (a < 1 || b > 31) return null;
  return b > a ? { dia: a, diaMax: b } : { dia: a };
}
/** "05" ou "05–10". */
export const formatarDias = (f: Pick<Fixo, "dia" | "diaMax">) => {
  const d = (n: number) => String(n).padStart(2, "0");
  return f.diaMax && f.diaMax > f.dia ? `${d(f.dia)}–${d(f.diaMax)}` : d(f.dia);
};

/** Data do fixo naquele mês; dia 31 em mês de 30 dias vira o último dia. */
export function dataDoFixo(f: Pick<Fixo, "dia">, mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return `${mes}-${String(Math.min(Math.max(1, f.dia), ultimo)).padStart(2, "0")}`;
}

export interface FixoNoMes { fixo: Fixo; data: string; /** Último dia da faixa (igual a `data` sem faixa). */ ate: string; lancamento: Lancamento | null }

/** Fixos que valem no mês (desde o mês em que foram criados), com o lançamento feito a partir deles, se houver. */
export function fixosDoMes(fixos: Fixo[], lancs: Lancamento[], mes: string): FixoNoMes[] {
  return fixos
    .filter((f) => f.desde <= mes)
    .map((f) => ({ fixo: f, data: dataDoFixo(f, mes), ate: dataDoFixo({ dia: f.diaMax ?? f.dia }, mes), lancamento: lancs.find((l) => l.fixoId === f.id && mesDe(l.data) === mes) ?? null }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.fixo.descricao.localeCompare(b.fixo.descricao));
}

export interface ResumoMes {
  /** Só a conta (os vales ficam em `vales`). */
  entrou: number;
  saiu: number;
  saldo: number;
  /** Saldo somando os fixos da conta que ainda não foram lançados no mês. */
  previsto: number;
  aReceber: number;
  aPagar: number;
  /** Quanto tem na conta no fim do mês: tudo o que entrou menos tudo o que saiu até ele (a sobra passa de mês para mês). */
  acumulado: number;
  /** O que veio do mês anterior (acumulado até o fim dele). */
  anterior: number;
  /** Acumulado no fim do mês contando os fixos da conta que faltam. */
  previstoAcumulado: number;
  /** Vales: entrou e usou no mês; saldo = acumulado (sobra de vale também passa de mês). */
  vales: { carteira: Carteira; entrou: number; saiu: number; saldo: number }[];
}

/** Saldo de uma carteira somando todos os meses até `mes` (inclusive). */
export function saldoAte(lancs: Lancamento[], carteira: Carteira, mes: string): number {
  let t = 0;
  for (const l of lancs) if (l.carteira === carteira && mesDe(l.data) <= mes) t += l.tipo === "entrada" ? l.valor : -l.valor;
  return t;
}

export function resumoMes(lancs: Lancamento[], fixos: Fixo[], mes: string): ResumoMes {
  const doMes = lancs.filter((l) => mesDe(l.data) === mes && real(l));
  const soma = (c: Carteira, tipo: Lancamento["tipo"]) => doMes.filter((l) => l.carteira === c && l.tipo === tipo).reduce((t, l) => t + l.valor, 0);
  const entrou = soma("conta", "entrada"), saiu = soma("conta", "saida");
  const pend = fixosDoMes(fixos, lancs, mes).filter((x) => !x.lancamento);
  const aReceber = pend.filter((x) => x.fixo.carteira === "conta" && x.fixo.tipo === "entrada").reduce((t, x) => t + x.fixo.valor, 0);
  const aPagar = pend.filter((x) => x.fixo.carteira === "conta" && x.fixo.tipo === "saida").reduce((t, x) => t + x.fixo.valor, 0);
  const comVale = new Set<Carteira>([...lancs.filter((l) => mesDe(l.data) <= mes).map((l) => l.carteira), ...fixosDoMes(fixos, lancs, mes).map((x) => x.fixo.carteira)]);
  const vales = CARTEIRAS.filter((c) => c.id !== "conta" && comVale.has(c.id)).map(({ id }) => {
    const e = soma(id, "entrada"), s = soma(id, "saida");
    return { carteira: id, entrou: e, saiu: s, saldo: saldoAte(lancs, id, mes) };
  });
  const acumulado = saldoAte(lancs, "conta", mes);
  return { entrou, saiu, saldo: entrou - saiu, previsto: entrou - saiu + aReceber - aPagar, aReceber, aPagar, acumulado, anterior: saldoAte(lancs, "conta", somarMes(mes, -1)), previstoAcumulado: acumulado + aReceber - aPagar, vales };
}

/** Gastos do mês por categoria (todas as carteiras), do maior para o menor, com a fração do total. */
export function porCategoria(lancs: Lancamento[], mes: string): { categoria: string; total: number; fracao: number }[] {
  const m = new Map<string, number>();
  for (const l of lancs) if (l.tipo === "saida" && mesDe(l.data) === mes && real(l)) m.set(l.categoria, (m.get(l.categoria) ?? 0) + l.valor);
  const total = [...m.values()].reduce((t, v) => t + v, 0);
  return [...m].map(([categoria, v]) => ({ categoria, total: v, fracao: total ? v / total : 0 })).sort((a, b) => b.total - a.total);
}

/** Lançamentos do mês agrupados por dia, do mais recente para o mais antigo. */
export function porDia(lancs: Lancamento[], mes: string): { data: string; itens: Lancamento[]; saldo: number }[] {
  const m = new Map<string, Lancamento[]>();
  for (const l of lancs) if (mesDe(l.data) === mes) m.set(l.data, [...(m.get(l.data) ?? []), l]);
  return [...m]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([data, itens]) => ({
      data,
      itens: itens.sort((a, b) => b._m - a._m),
      saldo: itens.filter((l) => l.carteira === "conta").reduce((t, l) => t + (l.tipo === "entrada" ? l.valor : -l.valor), 0),
    }));
}

/** Diferença de gasto (conta + vales) contra o mês anterior, em fração. null sem gasto no mês anterior. */
export function comparaMesAnterior(lancs: Lancamento[], mes: string): number | null {
  const gasto = (m: string) => lancs.filter((l) => l.tipo === "saida" && mesDe(l.data) === m && real(l)).reduce((t, l) => t + l.valor, 0);
  const antes = gasto(somarMes(mes, -1));
  return antes ? gasto(mes) / antes - 1 : null;
}

// ------------------------------------------------------------------ gráficos

export interface PontoMes { mes: string; entrou: number; saiu: number; acumulado: number }

/** Os `n` meses até `mes` (conta): entrou, saiu e o acumulado no fim de cada um. */
export function serieMeses(lancs: Lancamento[], mes: string, n: number): PontoMes[] {
  return Array.from({ length: n }, (_, i) => {
    const m = somarMes(mes, i - n + 1);
    let entrou = 0, saiu = 0;
    for (const l of lancs) if (l.carteira === "conta" && mesDe(l.data) === m && real(l)) l.tipo === "entrada" ? (entrou += l.valor) : (saiu += l.valor);
    return { mes: m, entrou, saiu, acumulado: saldoAte(lancs, "conta", m) };
  });
}

export const diasNoMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return new Date(a, m, 0).getDate(); };

/** Gasto acumulado dia a dia no mês (todas as carteiras): posição i = total gasto até o dia i+1. */
export function gastoPorDia(lancs: Lancamento[], mes: string): number[] {
  const n = diasNoMes(mes), dia = new Array(n).fill(0);
  for (const l of lancs) if (l.tipo === "saida" && mesDe(l.data) === mes && real(l)) dia[Number(l.data.slice(8)) - 1] += l.valor;
  for (let i = 1; i < n; i++) dia[i] += dia[i - 1];
  return dia;
}

export interface Ritmo {
  /** Gasto até hoje e no mesmo dia do mês anterior (comparar no mesmo ponto do mês, não o mês inteiro). */
  ateHoje: number;
  mesmoDiaAntes: number | null;
  /** No ritmo de agora, quanto o mês fecha gastando. */
  projecao: number;
  /** Dias que faltam (com hoje). */
  diasRestantes: number;
  /** Quanto dá para gastar por dia até o fim do mês sem ficar negativo (acumulado + a receber − a pagar), 0 se já não sobra. */
  porDia: number;
}

/** Só faz sentido no mês corrente (`hoje` dentro de `mes`). */
export function ritmoDoMes(lancs: Lancamento[], fixos: Fixo[], mes: string, hoje: string): Ritmo | null {
  if (mesDe(hoje) !== mes) return null;
  const d = Number(hoje.slice(8)), n = diasNoMes(mes);
  const atual = gastoPorDia(lancs, mes), antes = gastoPorDia(lancs, somarMes(mes, -1));
  const ateHoje = atual[d - 1];
  const temAntes = antes[antes.length - 1] > 0;
  const r = resumoMes(lancs, fixos, mes);
  const diasRestantes = n - d + 1;
  return {
    ateHoje,
    mesmoDiaAntes: temAntes ? antes[Math.min(d, antes.length) - 1] : null,
    projecao: Math.round((ateHoje / d) * n),
    diasRestantes,
    porDia: Math.max(0, Math.floor(r.previstoAcumulado / diasRestantes)),
  };
}

/** Lançamento que leva o saldo da conta (até hoje) ao valor informado. null se já está igual. */
export function ajusteDeSaldo(lancs: Lancamento[], carteira: Carteira, valorReal: number, data: string): Omit<Lancamento, "id" | "_m"> | null {
  const atual = lancs.filter((l) => l.carteira === carteira && l.data <= data).reduce((t, l) => t + (l.tipo === "entrada" ? l.valor : -l.valor), 0);
  const dif = valorReal - atual;
  if (!dif) return null;
  return { tipo: dif > 0 ? "entrada" : "saida", valor: Math.abs(dif), descricao: "Ajuste de saldo", categoria: AJUSTE, carteira, data, fixoId: null };
}

/** Rótulo curto para eixo: "R$ 850", "R$ 1,2 mil", "−R$ 40". */
export function reaisCurto(c: number): string {
  const v = Math.abs(c) / 100;
  const t = v >= 1000 ? `${(Math.round(v / 100) / 10).toString().replace(".", ",")} mil` : String(Math.round(v));
  return `${c < 0 ? "−" : ""}R$ ${t}`;
}
export const mesCurto = (mes: string) => nomeMes(mes).slice(0, 3);

// ------------------------------------------------------------------ limites por categoria

export interface EstadoLimite { categoria: string; gasto: number; limite: number; fracao: number }

/** Categorias com limite no mês: quanto já foi (todas as carteiras), do mais apertado para o mais folgado. */
export function limitesDoMes(lancs: Lancamento[], mes: string, limites: Record<string, number> = {}): EstadoLimite[] {
  const gastos = new Map(porCategoria(lancs, mes).map((c) => [c.categoria, c.total]));
  return Object.entries(limites)
    .filter(([, v]) => v > 0)
    .map(([categoria, limite]) => { const gasto = gastos.get(categoria) ?? 0; return { categoria, gasto, limite, fracao: gasto / limite }; })
    .sort((a, b) => b.fracao - a.fracao || a.categoria.localeCompare(b.categoria));
}

/** O lançamento fez a categoria passar de 80% ou de 100% do limite? (só avisa ao cruzar, não toda vez). */
export function cruzouLimite(antes: number, depois: number, limite: number): 80 | 100 | null {
  if (!limite) return null;
  if (antes < limite && depois >= limite) return 100;
  if (antes < limite * 0.8 && depois >= limite * 0.8) return 80;
  return null;
}

// ------------------------------------------------------------------ contas do dia

/** Fixos do mês de `hoje` ainda não lançados cuja data já chegou (o dia, ou o começo da faixa). `atrasado` = passou do último dia. */
export function contasDoDia(fixos: Fixo[], lancs: Lancamento[], hoje: string): (FixoNoMes & { atrasado: boolean })[] {
  return fixosDoMes(fixos, lancs, mesDe(hoje))
    .filter((x) => !x.lancamento && x.data <= hoje)
    .map((x) => ({ ...x, atrasado: x.ate < hoje }));
}

// ------------------------------------------------------------------ 50/30/20

export const GRUPOS = {
  necessidades: ["Alimentação", "Mercado", "Transporte", "Casa", "Escola", "Saúde"],
  desejos: ["Lazer", "Roupas", "Assinaturas", "Outros"],
} as const;
export const grupoDe = (categoria: string): "necessidades" | "desejos" =>
  (GRUPOS.necessidades as readonly string[]).includes(categoria) ? "necessidades" : "desejos";

export interface Regra { base: number; necessidades: number; desejos: number; guardou: number; fracoes: { necessidades: number; desejos: number; guardou: number } }

/** Regra 50/30/20 do mês: base = tudo que entrou (conta e vales); gastos de todas as carteiras; guardou = o que sobrou (mínimo 0). */
export function regra503020(lancs: Lancamento[], mes: string): Regra | null {
  let base = 0, necessidades = 0, desejos = 0;
  for (const l of lancs) {
    if (mesDe(l.data) !== mes || !real(l)) continue;
    if (l.tipo === "entrada") base += l.valor;
    else if (grupoDe(l.categoria) === "necessidades") necessidades += l.valor;
    else desejos += l.valor;
  }
  if (!base) return null;
  const guardou = Math.max(0, base - necessidades - desejos);
  return { base, necessidades, desejos, guardou, fracoes: { necessidades: necessidades / base, desejos: desejos / base, guardou: guardou / base } };
}

// ------------------------------------------------------------------ resumo de fechamento do mês

export interface Fechamento {
  mes: string;
  entrou: number;
  saiu: number;
  /** entrou − saiu na conta (pode ser negativo). */
  sobrou: number;
  acumulado: number;
  maior: { categoria: string; total: number } | null;
  /** Categoria que mais mudou contra o mês anterior (só com gasto no anterior). */
  mudou: { categoria: string; antes: number; agora: number } | null;
  diaMaisCaro: { data: string; total: number } | null;
  lancamentos: number;
  regra: Regra | null;
}

export function fechamento(lancs: Lancamento[], fixos: Fixo[], mes: string): Fechamento | null {
  const doMes = lancs.filter((l) => mesDe(l.data) === mes && real(l));
  if (!doMes.length) return null;
  const r = resumoMes(lancs, fixos, mes);
  const cats = porCategoria(lancs, mes);
  const antes = new Map(porCategoria(lancs, somarMes(mes, -1)).map((c) => [c.categoria, c.total]));
  let mudou: Fechamento["mudou"] = null;
  for (const c of new Set([...cats.map((c) => c.categoria), ...antes.keys()])) {
    const a = antes.get(c) ?? 0, d = cats.find((x) => x.categoria === c)?.total ?? 0;
    if (!a) continue;
    if (!mudou || Math.abs(d - a) > Math.abs(mudou.agora - mudou.antes)) mudou = { categoria: c, antes: a, agora: d };
  }
  if (mudou && mudou.agora === mudou.antes) mudou = null;
  const porData = new Map<string, number>();
  for (const l of doMes) if (l.tipo === "saida") porData.set(l.data, (porData.get(l.data) ?? 0) + l.valor);
  const caro = [...porData].sort((a, b) => b[1] - a[1])[0];
  return {
    mes, entrou: r.entrou, saiu: r.saiu, sobrou: r.saldo, acumulado: r.acumulado,
    maior: cats[0] ? { categoria: cats[0].categoria, total: cats[0].total } : null,
    mudou, diaMaisCaro: caro ? { data: caro[0], total: caro[1] } : null, lancamentos: doMes.length, regra: regra503020(lancs, mes),
  };
}
