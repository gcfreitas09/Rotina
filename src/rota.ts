import { useSyncExternalStore } from "react";

/** Rotas por hash (#/escola), para funcionar em qualquer pasta do servidor sem configurar nada. */
export function rotaAtual(): string[] {
  const h = location.hash.replace(/^#\/?/, "");
  return h ? h.split("/") : ["hoje"];
}

let cache = location.hash;
let partes = rotaAtual();
function ler() {
  if (location.hash !== cache) {
    cache = location.hash;
    partes = rotaAtual();
  }
  return partes;
}

export function useRota(): string[] {
  return useSyncExternalStore(
    (f) => (window.addEventListener("hashchange", f), () => window.removeEventListener("hashchange", f)),
    ler,
  );
}

export function navegar(caminho: string) {
  location.hash = "/" + caminho.replace(/^\//, "");
}
