/**
 * Sincronia entre aparelhos via Supabase (tabela rotina_registros, ver supabase/schema.sql).
 * Cada registro vira uma linha; vence a versão alterada por último (_m).
 * Funciona sem internet: tudo continua no localStorage e sobe quando voltar.
 */
import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLECOES, type Base, type NomeColecao } from "./types.ts";
import { gravarMeta, lerMeta } from "./storage.ts";
import { aoAlterarLocal, incorporar, todos } from "./store.ts";

export type StatusSync = "desligado" | "sem-login" | "sincronizando" | "ok" | "erro" | "offline";

interface EstadoSync {
  status: StatusSync;
  email: string | null;
  ultimaVez: number | null;
  erro: string | null;
}

let est: EstadoSync = { status: "desligado", email: null, ultimaVez: null, erro: null };
const ouvintes = new Set<() => void>();
function definir(p: Partial<EstadoSync>) {
  est = { ...est, ...p };
  ouvintes.forEach((f) => f());
}
export function useSync(): EstadoSync {
  return useSyncExternalStore(
    (f) => (ouvintes.add(f), () => ouvintes.delete(f)),
    () => est,
  );
}

const TABELA = "rotina_registros";
let cliente: SupabaseClient | null = null;
let clienteChave = "";

export function credenciais(): { url: string; chave: string } | null {
  const meta = lerMeta();
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || meta.supabaseUrl || "";
  const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || meta.supabaseChave || "";
  return url && chave ? { url, chave } : null;
}

export function credenciaisVemDoBuild(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

async function obterCliente(): Promise<SupabaseClient | null> {
  const c = credenciais();
  if (!c) return null;
  const chave = c.url + c.chave;
  if (cliente && clienteChave === chave) return cliente;
  const { createClient } = await import("@supabase/supabase-js");
  cliente = createClient(c.url, c.chave, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "rotina:auth" },
  });
  clienteChave = chave;
  return cliente;
}

export function conectarServidor(url: string, chave: string) {
  gravarMeta({ supabaseUrl: url.trim().replace(/\/+$/, ""), supabaseChave: chave.trim(), ultimoPull: undefined, ultimoPush: 0 });
  cliente = null;
  return iniciarSync();
}

function traduzirErro(e: unknown): string {
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(msg)) return "Confirme o e-mail pelo link que o Supabase enviou e tente de novo.";
  if (/User already registered/i.test(msg)) return "Este e-mail já tem conta. Use Entrar.";
  if (/Password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/relation .* does not exist|Could not find the table/i.test(msg))
    return "A tabela rotina_registros não existe no Supabase. Rode o arquivo supabase/schema.sql no SQL Editor.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Sem conexão com o servidor.";
  return msg;
}

export async function entrar(email: string, senha: string, criar: boolean): Promise<string | null> {
  const sb = await obterCliente();
  if (!sb) return "Configure a URL e a chave do Supabase primeiro.";
  try {
    const r = criar
      ? await sb.auth.signUp({ email, password: senha })
      : await sb.auth.signInWithPassword({ email, password: senha });
    if (r.error) return traduzirErro(r.error);
    if (criar && !r.data.session) return "Conta criada. Abra o e-mail de confirmação e depois toque em Entrar.";
    gravarMeta({ ultimoPull: undefined, ultimoPush: 0 });
    definir({ email: r.data.user?.email ?? email });
    await iniciarSync(true);
    return null;
  } catch (e) {
    return traduzirErro(e);
  }
}

export async function sair() {
  const sb = await obterCliente();
  await sb?.auth.signOut();
  gravarMeta({ ultimoPull: undefined, ultimoPush: 0 });
  definir({ status: "sem-login", email: null, erro: null });
}

let rodando: Promise<void> | null = null;
let deNovo = false;

/** Baixa o que mudou no servidor, junta, e sobe o que mudou aqui. */
export function sincronizar(): Promise<void> {
  if (rodando) {
    deNovo = true;
    return rodando;
  }
  rodando = (async () => {
    try {
      do {
        deNovo = false;
        await umaRodada();
      } while (deNovo);
    } finally {
      rodando = null;
    }
  })();
  return rodando;
}

async function umaRodada() {
  const sb = await obterCliente();
  if (!sb) return definir({ status: "desligado" });
  const { data: sessao } = await sb.auth.getSession();
  if (!sessao.session) return definir({ status: "sem-login", email: null });
  if (typeof navigator !== "undefined" && navigator.onLine === false) return definir({ status: "offline" });

  definir({ status: "sincronizando", email: sessao.session.user.email ?? null, erro: null });
  try {
    // 1. Baixar
    let meta = lerMeta();
    let desde = meta.ultimoPull ?? "1970-01-01T00:00:00Z";
    for (;;) {
      const { data, error } = await sb
        .from(TABELA)
        .select("colecao,id,dados,servidor_em")
        .gt("servidor_em", desde)
        .order("servidor_em", { ascending: true })
        .limit(1000);
      if (error) throw error;
      if (!data?.length) break;
      const porColecao = new Map<NomeColecao, Base[]>();
      for (const linha of data) {
        if (!COLECOES.includes(linha.colecao)) continue;
        const l = porColecao.get(linha.colecao) ?? [];
        l.push(linha.dados as Base);
        porColecao.set(linha.colecao, l);
      }
      for (const [c, regs] of porColecao) incorporar(c, regs as never[]);
      desde = data[data.length - 1].servidor_em;
      gravarMeta({ ultimoPull: desde });
      if (data.length < 1000) break;
    }

    // 2. Subir
    meta = lerMeta();
    const desdePush = meta.ultimoPush ?? 0;
    let maior = desdePush;
    const uid = sessao.session.user.id;
    const linhas: { user_id: string; colecao: string; id: string; dados: Base; alterado_em: number }[] = [];
    for (const c of COLECOES) {
      for (const r of todos(c)) {
        if (r._m > desdePush) {
          linhas.push({ user_id: uid, colecao: c, id: r.id, dados: r, alterado_em: r._m });
          if (r._m > maior) maior = r._m;
        }
      }
    }
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await sb.from(TABELA).upsert(linhas.slice(i, i + 500), { onConflict: "user_id,colecao,id" });
      if (error) throw error;
    }
    gravarMeta({ ultimoPush: maior });
    definir({ status: "ok", ultimaVez: Date.now() });
  } catch (e) {
    const msg = traduzirErro(e);
    definir({ status: msg === "Sem conexão com o servidor." ? "offline" : "erro", erro: msg });
  }
}

/** Força baixar e subir tudo de novo (útil se um aparelho ficou para trás). */
export function sincronizarTudo() {
  gravarMeta({ ultimoPull: undefined, ultimoPush: 0 });
  return sincronizar();
}

let timer: ReturnType<typeof setTimeout> | undefined;
let iniciado = false;

/** Há sessão salva neste aparelho? (chave usada pelo supabase-js em `createClient`) */
function temSessaoSalva(): boolean {
  try {
    return Boolean(localStorage.getItem("rotina:auth"));
  } catch {
    return false;
  }
}

/**
 * Liga a sincronia. Sem sessão salva, nem carrega o código do Supabase (~56 KB): só mostra "entre na conta".
 * `forcar` = acabou de entrar, então carrega e sincroniza.
 */
export async function iniciarSync(forcar = false) {
  if (!credenciais()) return definir({ status: "desligado" });
  if (!forcar && !temSessaoSalva()) return definir({ status: "sem-login", email: null });
  const sb = await obterCliente();
  if (!sb) return definir({ status: "desligado" });
  if (!iniciado) {
    iniciado = true;
    aoAlterarLocal(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void sincronizar(), 1500);
    });
    const talvez = () => document.visibilityState === "visible" && void sincronizar();
    document.addEventListener("visibilitychange", talvez);
    window.addEventListener("online", talvez);
    setInterval(talvez, 60_000);
  }
  await sincronizar();
}
