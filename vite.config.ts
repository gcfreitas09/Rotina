import { defineConfig, type Connect } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore módulo JS sem tipos (o mesmo arquivo roda como função do Vercel)
import { responderBusca } from "./api/_off.js";

// /api/alimentos também no `npm run dev` e no `npm run preview` (no Vercel é a função em api/alimentos.js).
const apiLocal: Connect.NextHandleFunction = async (req, res) => {
  const r: Response = await responderBusca("http://local" + (req.originalUrl ?? req.url));
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(await r.text());
};

// Entrada em web/ para a raiz do projeto ter um index.html próprio (reserva do MAMP → dist/).
// base relativo: o mesmo build roda em localhost:8888/rotina/ e na raiz de um domínio.
export default defineConfig({
  root: "web",
  envDir: "..", // .env.local fica na raiz do projeto, não dentro de web/
  base: "./",
  plugins: [
    react(),
    {
      name: "api-alimentos-local",
      configureServer: (s) => { s.middlewares.use("/api/alimentos", apiLocal); },
      configurePreviewServer: (s) => { s.middlewares.use("/api/alimentos", apiLocal); },
    },
  ],
  build: { outDir: "../dist", emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0 },
  server: { port: 5173 },
});
