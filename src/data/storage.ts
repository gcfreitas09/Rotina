/**
 * Camada de dados isolada. Só este arquivo conhece o localStorage.
 * Para trocar por um banco, reescreva `ler`/`gravar` mantendo as assinaturas.
 * (A sincronia com o Supabase fica em sync.ts e usa `mesclar` daqui.)
 */
import { COLECOES, type Base, type Colecoes, type Config, type NomeColecao } from "./types.ts";
import { PADROES } from "../config/gradingRules.ts";

const PREFIXO = "rotina:";

export const CONFIG_PADRAO: Config = {
  id: "config",
  _m: 0,
  nome: "",
  mediaAprovacao: PADROES.mediaAprovacao,
  minimoExame: PADROES.minimoExame,
  metaAguaMl: 2500,
  tema: "sistema",
  descansoSeg: 90,
};

function disponivel(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Lê a coleção inteira, incluindo registros excluídos (lápides). */
export function ler<C extends NomeColecao>(c: C): Colecoes[C][] {
  const ls = disponivel();
  if (!ls) return [];
  try {
    const bruto = ls.getItem(PREFIXO + c);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function gravar<C extends NomeColecao>(c: C, lista: Colecoes[C][]): void {
  disponivel()?.setItem(PREFIXO + c, JSON.stringify(lista));
}

/** get/save por módulo, como pedido: storage.tarefas.get(), storage.materias.save(lista)… */
export const storage = Object.fromEntries(
  COLECOES.map((c) => [c, { get: () => ler(c), save: (lista: never[]) => gravar(c, lista) }]),
) as { [C in NomeColecao]: { get: () => Colecoes[C][]; save: (lista: Colecoes[C][]) => void } };

// ---------------------------------------------------------------- metadados locais (não sincronizam)

export interface Meta {
  exemplosCarregados?: boolean;
  /** Maior `servidor_em` já recebido do Supabase (ISO). */
  ultimoPull?: string;
  /** Último _m enviado ao Supabase. */
  ultimoPush?: number;
  supabaseUrl?: string;
  supabaseChave?: string;
}

export function lerMeta(): Meta {
  try {
    return JSON.parse(disponivel()?.getItem(PREFIXO + "_meta") || "{}");
  } catch {
    return {};
  }
}

export function gravarMeta(parcial: Partial<Meta>): Meta {
  const m = { ...lerMeta(), ...parcial };
  disponivel()?.setItem(PREFIXO + "_meta", JSON.stringify(m));
  return m;
}

// ---------------------------------------------------------------- mescla (último a alterar vence)

/** Junta duas listas pelo id; em conflito fica a versão com `_m` maior. */
export function mesclar<T extends Base>(local: T[], remoto: T[]): { lista: T[]; mudou: boolean } {
  const mapa = new Map(local.map((r) => [r.id, r]));
  let mudou = false;
  for (const r of remoto) {
    const atual = mapa.get(r.id);
    if (!atual || r._m > atual._m) {
      mapa.set(r.id, r);
      mudou = true;
    }
  }
  return { lista: [...mapa.values()], mudou };
}

// ---------------------------------------------------------------- backup

export interface Backup {
  app: "rotina";
  versao: 1;
  exportadoEm: string;
  dados: { [C in NomeColecao]?: Colecoes[C][] };
}

export function exportar(): Backup {
  const dados: Backup["dados"] = {};
  for (const c of COLECOES) (dados as Record<string, unknown>)[c] = ler(c);
  return { app: "rotina", versao: 1, exportadoEm: new Date().toISOString(), dados };
}

/**
 * Importa um backup juntando com o que já existe (não apaga nada:
 * em conflito fica a versão alterada por último). Lança erro se o arquivo não for do Rotina.
 */
export function validarBackup(json: unknown): Backup {
  const b = json as Backup;
  if (!b || typeof b !== "object" || b.app !== "rotina" || typeof b.dados !== "object" || !b.dados) {
    throw new Error("Este arquivo não é um backup do Rotina.");
  }
  for (const c of COLECOES) {
    const lista = b.dados[c];
    if (lista === undefined) continue;
    if (!Array.isArray(lista) || lista.some((r) => !r || typeof r.id !== "string" || typeof r._m !== "number")) {
      throw new Error(`O backup está corrompido na parte "${c}".`);
    }
  }
  return b;
}

export function apagarTudoLocal(): void {
  const ls = disponivel();
  if (!ls) return;
  for (const c of COLECOES) ls.removeItem(PREFIXO + c);
  const meta = lerMeta();
  ls.removeItem(PREFIXO + "_meta");
  // Mantém a conexão com o Supabase configurada neste aparelho.
  gravarMeta({ supabaseUrl: meta.supabaseUrl, supabaseChave: meta.supabaseChave, exemplosCarregados: true });
}
