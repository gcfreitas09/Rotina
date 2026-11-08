/**
 * Estado em memória + assinatura para o React. Toda escrita passa por aqui,
 * carimba `_m` e grava via storage.ts. A sincronia é avisada a cada mudança.
 */
import { useSyncExternalStore } from "react";
import { COLECOES, type Colecoes, type Config, type NomeColecao } from "./types.ts";
import { CONFIG_PADRAO, gravar, ler, mesclar } from "./storage.ts";

type Estado = { [C in NomeColecao]: Colecoes[C][] };

let estado: Estado = carregar();
const ouvintes = new Set<() => void>();
const visiveis = new Map<NomeColecao, unknown[]>();
let aoMudar: (() => void) | null = null;

function carregar(): Estado {
  return Object.fromEntries(COLECOES.map((c) => [c, ler(c)])) as Estado;
}

function emitir(c: NomeColecao | null) {
  if (c) visiveis.delete(c);
  else visiveis.clear();
  ouvintes.forEach((f) => f());
}

/** sync.ts registra aqui para empurrar mudanças ao servidor. */
export function aoAlterarLocal(f: () => void) {
  aoMudar = f;
}

/** Relê tudo do storage (após importar backup ou apagar). */
export function recarregar() {
  estado = carregar();
  emitir(null);
}

export function todos<C extends NomeColecao>(c: C): Colecoes[C][] {
  return estado[c];
}

export function lista<C extends NomeColecao>(c: C): Colecoes[C][] {
  let v = visiveis.get(c) as Colecoes[C][] | undefined;
  if (!v) {
    v = estado[c].filter((r) => !r._x);
    visiveis.set(c, v);
  }
  return v;
}

function substituir<C extends NomeColecao>(c: C, nova: Colecoes[C][], local = true) {
  if (!gravar(c, nova)) {
    // Sem espaço: não finge que salvou.
    window.dispatchEvent(new Event("rotina:sem-espaco"));
    return;
  }
  estado = { ...estado, [c]: nova };
  emitir(c);
  if (local) aoMudar?.();
}

export function salvar<C extends NomeColecao>(c: C, item: Omit<Colecoes[C], "_m"> & { _m?: number }) {
  const novo = { ...item, _m: Date.now() } as Colecoes[C];
  const atual = estado[c] as Colecoes[C][];
  const i = atual.findIndex((r) => r.id === novo.id);
  substituir(c, i >= 0 ? atual.map((r, j) => (j === i ? novo : r)) : [...atual, novo]);
}

export function salvarVarios<C extends NomeColecao>(c: C, itens: Colecoes[C][]) {
  const agora = Date.now();
  const mapa = new Map(estado[c].map((r) => [r.id, r]));
  for (const it of itens) mapa.set(it.id, { ...it, _m: agora });
  substituir(c, [...mapa.values()]);
}

/** Exclui (lápide) e devolve a função de desfazer. */
export function excluir<C extends NomeColecao>(c: C, ids: string | string[]): () => void {
  const alvo = new Set(Array.isArray(ids) ? ids : [ids]);
  const antes = estado[c].filter((r) => alvo.has(r.id));
  const agora = Date.now();
  substituir(
    c,
    estado[c].map((r) => (alvo.has(r.id) ? { ...r, _x: true, _m: agora } : r)),
  );
  return () => {
    const t = Date.now();
    const mapa = new Map(antes.map((r) => [r.id, { ...r, _x: false, _m: t }]));
    substituir(
      c,
      estado[c].map((r) => mapa.get(r.id) ?? r),
    );
  };
}

/** Junta registros vindos de fora (servidor ou backup). */
export function incorporar<C extends NomeColecao>(c: C, vindos: Colecoes[C][], local = false): boolean {
  const { lista: nova, mudou } = mesclar(estado[c], vindos);
  if (mudou) substituir(c, nova, local);
  return mudou;
}

/** Marca tudo como excluído — a exclusão chega também ao outro aparelho. */
export function excluirTudo() {
  const agora = Date.now();
  for (const c of COLECOES) {
    estado = { ...estado, [c]: estado[c].map((r) => ({ ...r, _x: true, _m: agora })) };
    gravar(c, estado[c]); // só lápides: ficam menores, não estouram o espaço
  }
  emitir(null);
  aoMudar?.();
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function useColecao<C extends NomeColecao>(c: C): Colecoes[C][] {
  return useSyncExternalStore(assinar, () => lista(c));
}

let configCache: { base: unknown; valor: Config } | null = null;
export function config(): Config {
  const r = lista("config").find((x) => x.id === "config");
  if (configCache && configCache.base === r) return configCache.valor;
  const valor = { ...CONFIG_PADRAO, ...(r ?? {}) };
  configCache = { base: r, valor };
  return valor;
}

export function useConfig(): Config {
  return useSyncExternalStore(assinar, config);
}

export function salvarConfig(parcial: Partial<Config>) {
  salvar("config", { ...config(), ...parcial, id: "config", _x: false });
}
