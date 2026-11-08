import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Entrada em web/ para a raiz do projeto ter um index.html próprio (reserva do MAMP → dist/).
// base relativo: o mesmo build roda em localhost:8888/rotina/ e na raiz de um domínio.
export default defineConfig({
  root: "web",
  envDir: "..", // .env.local fica na raiz do projeto, não dentro de web/
  base: "./",
  plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0 },
  server: { port: 5173 },
});
