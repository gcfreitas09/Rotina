import "./fontes.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { carregarExemplosSePrimeiraVez } from "./data/exemplos.ts";
import { iniciarSync } from "./data/sync.ts";

carregarExemplosSePrimeiraVez();
createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
void iniciarSync();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
