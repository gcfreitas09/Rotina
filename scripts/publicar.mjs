// Gera rotina-site.zip só com o conteúdo de dist/ (o que sobe para a hospedagem).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zip = path.join(raiz, "rotina-site.zip");
if (fs.existsSync(zip)) fs.unlinkSync(zip);
execFileSync("zip", ["-rq9X", zip, ".", "-x", ".DS_Store", "*.map"], { cwd: path.join(raiz, "dist") });
console.log(`rotina-site.zip: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB — suba só este zip (conteúdo de dist/).`);
