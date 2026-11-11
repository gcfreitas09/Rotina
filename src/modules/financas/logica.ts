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

/** Data do fixo naquele mês; dia 31 em mês de 30 dias vira o último dia. */
export function dataDoFixo(f: Pick<Fixo, "dia">, mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return `${mes}-${String(Math.min(Math.max(1, f.dia), ultimo)).padStart(2, "0")}`;
}

export interface FixoNoMes { fixo: Fixo; data: string; lancamento: Lancamento | null }

/** Fixos que valem no mês (desde o mês em que foram criados), com o lançamento feito a partir deles, se houver. */
export function fixosDoMes(fixos: Fixo[], lancs: Lancamento[], mes: string): FixoNoMes[] {
  return fixos
    .filter((f) => f.desde <= mes)
    .map((f) => ({ fixo: f, data: dataDoFixo(f, mes), lancamento: lancs.find((l) => l.fixoId === f.id && mesDe(l.data) === mes) ?? null }))
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
  /** Saldo de cada vale no mês (entrou − saiu), só os que tiveram movimento ou fixo. */
  vales: { carteira: Carteira; entrou: number; saiu: number; saldo: number }[];
}

export function resumoMes(lancs: Lancamento[], fixos: Fixo[], mes: string): ResumoMes {
  const doMes = lancs.filter((l) => mesDe(l.data) === mes);
  const soma = (c: Carteira, tipo: Lancamento["tipo"]) => doMes.filter((l) => l.carteira === c && l.tipo === tipo).reduce((t, l) => t + l.valor, 0);
  const entrou = soma("conta", "entrada"), saiu = soma("conta", "saida");
  const pend = fixosDoMes(fixos, lancs, mes).filter((x) => !x.lancamento);
  const aReceber = pend.filter((x) => x.fixo.carteira === "conta" && x.fixo.tipo === "entrada").reduce((t, x) => t + x.fixo.valor, 0);
  const aPagar = pend.filter((x) => x.fixo.carteira === "conta" && x.fixo.tipo === "saida").reduce((t, x) => t + x.fixo.valor, 0);
  const comVale = new Set<Carteira>([...doMes.map((l) => l.carteira), ...fixosDoMes(fixos, lancs, mes).map((x) => x.fixo.carteira)]);
  const vales = CARTEIRAS.filter((c) => c.id !== "conta" && comVale.has(c.id)).map(({ id }) => {
    const e = soma(id, "entrada"), s = soma(id, "saida");
    return { carteira: id, entrou: e, saiu: s, saldo: e - s };
  });
  return { entrou, saiu, saldo: entrou - saiu, previsto: entrou - saiu + aReceber - aPagar, aReceber, aPagar, vales };
}

/** Gastos do mês por categoria (todas as carteiras), do maior para o menor, com a fração do total. */
export function porCategoria(lancs: Lancamento[], mes: string): { categoria: string; total: number; fracao: number }[] {
  const m = new Map<string, number>();
  for (const l of lancs) if (l.tipo === "saida" && mesDe(l.data) === mes) m.set(l.categoria, (m.get(l.categoria) ?? 0) + l.valor);
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
  const gasto = (m: string) => lancs.filter((l) => l.tipo === "saida" && mesDe(l.data) === m).reduce((t, l) => t + l.valor, 0);
  const antes = gasto(somarMes(mes, -1));
  return antes ? gasto(mes) / antes - 1 : null;
}
