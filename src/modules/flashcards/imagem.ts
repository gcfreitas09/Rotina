import { LIMITE_LOCAL, usoLocal } from "../../data/storage.ts";

/** Lado maior da imagem guardada: nítida no celular e no desktop, leve para o localStorage e a sincronia. */
export const LADO_MAXIMO = 900;
const QUALIDADE = 0.76;

/** Reduz a imagem (fundo branco para PNG transparente) e devolve um JPEG em data URL. */
export async function comprimirImagem(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem (JPG, PNG, WebP).");
  const bmp = await createImageBitmap(arquivo).catch(() => {
    throw new Error("Não consegui abrir essa imagem. Tente outra.");
  });
  const f = Math.min(1, LADO_MAXIMO / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * f));
  const h = Math.max(1, Math.round(bmp.height * f));
  const tela = document.createElement("canvas");
  tela.width = w;
  tela.height = h;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("O navegador não conseguiu preparar a imagem.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const url = tela.toDataURL("image/jpeg", QUALIDADE);
  if (usoLocal() + url.length > LIMITE_LOCAL) throw new Error("Sem espaço no aparelho para mais imagens. Apague alguma de outro cartão.");
  return url;
}
