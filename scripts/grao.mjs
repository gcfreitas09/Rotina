// Gera os dois ladrilhos de granulação (papel claro e giz) em src/assets/. Rode de novo só se quiser mudar o grão.
// Por que PNG e não filtro SVG: filtro SVG, camada fixa em tela cheia e mix-blend-mode repintam a tela inteira
// a cada rolagem no celular. Ladrilho PNG pequeno vira só uma imagem de fundo (custo ~zero).
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const require = createRequire(path.join(os.homedir(), ".claude/tools/qa/package.json"));
const sharp = require("sharp");
const dir = fileURLToPath(new URL("../src/assets/", import.meta.url));
await fs.mkdir(dir, { recursive: true });
const T = 96;
const svg = (r, g, b, a) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${a} 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
// claro: grão marrom escuro, opacidade final ~4,5%. escuro/giz: grão branco, ~4%.
for (const [nome, [r, g, b, a]] of Object.entries({ "grao-claro.png": [0.2, 0.18, 0.12, 0.045], "grao-escuro.png": [1, 1, 1, 0.04] })) {
  await sharp(Buffer.from(svg(r, g, b, a)), { density: 72 }).png({ compressionLevel: 9, palette: false }).toFile(dir + nome);
  console.log(nome, (await fs.stat(dir + nome)).size, "bytes");
}
