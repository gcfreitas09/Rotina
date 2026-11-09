import { useEffect, useState } from "react";

/**
 * Catálogo de livros para o campo "Livro": Open Library (openlibrary.org), que libera o acesso pelo navegador.
 * (A API do Google Livros está sem cota sem chave.) Os resultados vêm sujos — resumos, trabalhos acadêmicos,
 * edições repetidas — então `ranquear` filtra, ordena e tira as repetições.
 */
export interface DocOL {
  key?: string;
  title?: string;
  author_name?: string[];
  number_of_pages_median?: number;
  first_publish_year?: number;
  language?: string[];
  edition_count?: number;
  cover_i?: number;
}

export interface SugestaoLivro {
  chave: string;
  titulo: string;
  autor: string;
  /** Páginas da edição mediana (pode não ser a sua edição). */
  paginas?: number;
  ano?: number;
  capa?: string;
}

export const normalizar = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const IGNORAR = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "um", "uma", "em", "no", "na"]);

/** Palavras que contam na busca (sem "de", "o"…). */
export const palavras = (t: string) => normalizar(t).split(" ").filter((p) => p && !IGNORAR.has(p));

/** Consulta da Open Library: título com a última palavra como prefixo ("dom casmu" acha Dom Casmurro). */
export function montarConsulta(texto: string): string | null {
  const ps = palavras(texto).filter((p) => /^[a-z0-9]+$/.test(p));
  if (!ps.length || ps.join("").length < 3) return null;
  return `title:(${ps.map((p, i) => (i === ps.length - 1 ? `${p}*` : p)).join(" ")})`;
}

const RUIM = /\b(resumo|resumen|summary|workbook|libro de trabajo|livro de trabalho|study guide|guia de estudo|analise|analisis|comentad[oa]|cuaderno|libreta|notebook|journal|diario de|caderno|colecao|box set)\b/;

/** Filtra, ordena e tira repetições. `texto` é o que a pessoa digitou. */
export function ranquear(docs: DocOL[], texto: string, max = 6): SugestaoLivro[] {
  const q = palavras(texto);
  const vistos = new Set<string>();
  const pontuados: { s: SugestaoLivro; p: number }[] = [];
  docs.forEach((d, i) => {
    const titulo = (d.title ?? "").replace(/\s+/g, " ").trim().replace(/\s*[:/]\s*$/, "");
    if (!titulo) return;
    const t = normalizar(titulo);
    const tp = t.split(" ");
    // todas as palavras digitadas precisam aparecer no título (a última, como começo de palavra)
    const bate = q.every((w, k) => tp.some((x) => (k === q.length - 1 ? x.startsWith(w) : x === w || x.startsWith(w))));
    if (!bate) return;
    const autor = (d.author_name ?? []).find((a) => a.trim()) ?? "";
    const chave = `${t}|${normalizar(autor).split(" ").slice(-1)[0] ?? ""}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    let p = 12 - i * 0.6; // a ordem de relevância da própria API ainda vale
    p += Math.log2(1 + (d.edition_count ?? 0)) * 1.6; // obra conhecida tem muitas edições
    if (d.language?.includes("por")) p += 2;
    if (d.number_of_pages_median) p += 1;
    if (autor) p += 1.5;
    if (t.startsWith(q.join(" "))) p += 3;
    if (RUIM.test(t)) p -= 8;
    if (tp.length > q.length + 6) p -= 2; // título comprido demais costuma ser trabalho acadêmico
    pontuados.push({
      p,
      s: {
        chave: d.key ?? chave, titulo, autor: autor.replace(/\s+/g, " ").trim(),
        paginas: d.number_of_pages_median && d.number_of_pages_median > 0 ? Math.round(d.number_of_pages_median) : undefined,
        ano: d.first_publish_year,
        capa: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : undefined,
      },
    });
  });
  return pontuados.sort((a, b) => b.p - a.p).slice(0, max).map((x) => x.s);
}

const cache = new Map<string, Promise<SugestaoLivro[]>>();

export function buscarLivros(texto: string): Promise<SugestaoLivro[]> {
  const consulta = montarConsulta(texto);
  if (!consulta) return Promise.resolve([]);
  let p = cache.get(consulta);
  if (!p) {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", consulta);
    url.searchParams.set("limit", "30");
    url.searchParams.set("lang", "pt");
    url.searchParams.set("fields", "key,title,author_name,number_of_pages_median,first_publish_year,language,edition_count,cover_i");
    p = fetch(url, { signal: AbortSignal.timeout(9000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { docs?: DocOL[] }) => ranquear(j.docs ?? [], texto));
    p.catch(() => cache.delete(consulta)); // falhou: tenta de novo na próxima digitação
    cache.set(consulta, p);
  }
  return p;
}

export type EstadoBusca = "parada" | "buscando" | "ok" | "erro";

/** Busca com espera de 450 ms depois da última tecla. */
export function useBuscaLivros(texto: string, ativa: boolean): { itens: SugestaoLivro[]; estado: EstadoBusca } {
  const [res, setRes] = useState<{ q: string; itens: SugestaoLivro[]; estado: EstadoBusca }>({ q: "", itens: [], estado: "parada" });
  const termo = texto.trim();
  const valida = ativa && montarConsulta(termo) !== null;
  useEffect(() => {
    if (!valida) return;
    let vivo = true;
    const t = setTimeout(() => {
      setRes((r) => ({ ...r, q: termo, estado: "buscando" }));
      buscarLivros(termo).then(
        (itens) => vivo && setRes({ q: termo, itens, estado: "ok" }),
        () => vivo && setRes({ q: termo, itens: [], estado: "erro" }),
      );
    }, 450);
    return () => { vivo = false; clearTimeout(t); };
  }, [termo, valida]);
  if (!valida) return { itens: [], estado: "parada" };
  return res.q === termo ? res : { itens: [], estado: "buscando" };
}
