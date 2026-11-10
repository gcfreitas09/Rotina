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
// Volta ao app instalado no iPhone (saiu e entrou): às vezes a tela fica preta até um toque, porque o WebKit não repinta as
// camadas da página. Força uma pintura nova ao voltar.
const repintar = () => {
  if (document.visibilityState !== "visible") return;
  const el = document.documentElement;
  el.style.transform = "translateZ(0)";
  void el.offsetHeight;
  requestAnimationFrame(() => { el.style.transform = ""; window.dispatchEvent(new Event("resize")); });
};
document.addEventListener("visibilitychange", repintar);
window.addEventListener("pageshow", (e) => { if (e.persisted) repintar(); });
createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
void iniciarSync();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
