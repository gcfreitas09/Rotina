import "./fontes.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { carregarExemplosSePrimeiraVez } from "./data/exemplos.ts";
import { iniciarSync } from "./data/sync.ts";

carregarExemplosSePrimeiraVez();

// Sem zoom no app (pedido do Guilherme). O iPhone ignora maximum-scale/user-scalable para a pinça, então o gesto é barrado aqui;
// o toque duplo já é barrado pelo touch-action do html (styles.css).
const semZoom = (e: Event) => e.preventDefault();
document.addEventListener("gesturestart", semZoom, { passive: false });
document.addEventListener("gesturechange", semZoom, { passive: false });
document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
void iniciarSync();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
