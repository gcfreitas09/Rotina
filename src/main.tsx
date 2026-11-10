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
// Campo de número: tocar seleciona o valor inteiro, então é só digitar o novo (pedido do Guilherme, 09/11/2026).
// Vale para inputMode numeric/decimal, type=number e campos com a classe "num". O iPhone posiciona o cursor depois do foco,
// por isso a seleção é refeita no fim do toque; o mouseup do desktop é anulado uma vez para não desfazer a seleção.
const campoNumero = (el: EventTarget | null): el is HTMLInputElement =>
  el instanceof HTMLInputElement && !el.readOnly && !el.disabled &&
  (el.inputMode === "numeric" || el.inputMode === "decimal" || el.type === "number" || el.classList.contains("num"));
document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (!campoNumero(el) || !el.value) return;
  const selecionar = () => { if (document.activeElement === el) { try { el.setSelectionRange(0, el.value.length); } catch { el.select(); } } };
  selecionar();
  setTimeout(selecionar, 0);
  const segurar = (ev: Event) => { ev.preventDefault(); selecionar(); };
  el.addEventListener("mouseup", segurar, { once: true });
  const toque = () => setTimeout(selecionar, 0);
  el.addEventListener("touchend", toque, { once: true });
  el.addEventListener("blur", () => { el.removeEventListener("mouseup", segurar); el.removeEventListener("touchend", toque); }, { once: true });
});

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
