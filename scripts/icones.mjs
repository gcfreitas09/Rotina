// Gera os ícones PNG/ICO a partir de web/public/icone.svg. Usa o sharp da instalação compartilhada de QA.
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
const require = createRequire(path.join(os.homedir(), ".claude/tools/qa/package.json"));
const sharp = require("sharp");
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../web/public/", import.meta.url));
const svg = await fs.readFile(dir + "icone.svg");
// Maskable/apple: fundo cheio, sem cantos arredondados (o sistema recorta).
const cheio = Buffer.from(svg.toString().replace('rx="6"', 'rx="0"'));
for (const [nome, t, fonte] of [["icone-192.png", 192, svg], ["icone-512.png", 512, cheio], ["apple-touch-icon.png", 180, cheio]]) {
  await sharp(fonte, { density: 600 }).resize(t, t).png({ compressionLevel: 9 }).toFile(dir + nome);
}
// favicon.ico 48×48 (ICO com PNG embutido)
const png = await sharp(svg, { density: 300 }).resize(48, 48).png().toBuffer();
const cab = Buffer.alloc(22);
cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(1, 4);
cab.writeUInt8(48, 6); cab.writeUInt8(48, 7); cab.writeUInt16LE(1, 10); cab.writeUInt16LE(32, 12);
cab.writeUInt32LE(png.length, 14); cab.writeUInt32LE(22, 18);
await fs.writeFile(dir + "favicon.ico", Buffer.concat([cab, png]));
console.log("ícones gerados");
