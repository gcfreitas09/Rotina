import { useEffect, useState } from "react";
import type { Encontrado } from "./nutricao.ts";

/**
 * Produtos de marca (Open Food Facts) via /api/alimentos — função do Vercel em api/alimentos.js
 * (no `npm run dev`/`preview`, o mesmo código roda no Vite). Sem internet ou fora do Vercel (MAMP), só a tabela local.
 */
type ItemOFF = { codigo: string; nome: string; marca?: string; kcal100: number; prot100: number; porcao?: number };

const cache = new Map<string, Promise<Encontrado[]>>();

export function buscarOnline(q: string): Promise<Encontrado[]> {
  const chave = q.trim().toLowerCase();
  let p = cache.get(chave);
  if (!p) {
    p = fetch(`/api/alimentos?q=${encodeURIComponent(chave)}`, { signal: AbortSignal.timeout(9000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { itens?: ItemOFF[] }) =>
        (j.itens ?? []).map((i) => ({ id: `off:${i.codigo || i.nome}`, nome: i.nome, kcal100: i.kcal100, prot100: i.prot100, fonte: "Open Food Facts", marca: i.marca, porcao: i.porcao })),
      );
    p.catch(() => cache.delete(chave)); // falhou: tenta de novo na próxima
    cache.set(chave, p);
  }
  return p;
}

export type EstadoBusca = "parada" | "buscando" | "ok" | "erro";

/** Busca com espera de 450 ms depois da última tecla (não chama a API a cada letra). */
export function useBuscaOnline(q: string, ativa: boolean): { itens: Encontrado[]; estado: EstadoBusca } {
  const [res, setRes] = useState<{ q: string; itens: Encontrado[]; estado: EstadoBusca }>({ q: "", itens: [], estado: "parada" });
  const termo = q.trim();
  const valida = ativa && termo.length >= 3;
  useEffect(() => {
    if (!valida) return;
    let vivo = true;
    const t = setTimeout(() => {
      setRes((r) => ({ ...r, q: termo, estado: "buscando" }));
      buscarOnline(termo).then(
        (itens) => vivo && setRes({ q: termo, itens, estado: "ok" }),
        () => vivo && setRes({ q: termo, itens: [], estado: "erro" }),
      );
    }, 450);
    return () => { vivo = false; clearTimeout(t); };
  }, [termo, valida]);
  if (!valida) return { itens: [], estado: "parada" };
  return res.q === termo ? res : { itens: [], estado: "buscando" };
}
