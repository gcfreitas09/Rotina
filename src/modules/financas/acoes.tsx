/**
 * Peças das Finanças usadas também no Hoje: valor formatado, salvar (com validação e aviso de limite), pagar/receber fixo
 * e o Anotar (lançar rápido com prévia editável).
 */
import { useRef, useState } from "react";
import type { Carteira, Fixo, Lancamento } from "../../data/types.ts";
import { config, excluir, lista, salvar, useColecao } from "../../data/store.ts";
import { br, brCurta, hoje, somarDias } from "../../data/datas.ts";
import { novoId } from "../../data/formato.ts";
import { mostrarAviso } from "../../components/ui.tsx";
import {
  CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, carteirasEmUso, cruzouLimite, curtoCarteira, mesDe, porCategoria, reais, saldoAgora, validarLancamento,
} from "./logica.ts";
import { lerRapido } from "./rapido.ts";

/** "R$" pequeno, reais grandes, centavos menores: o número que importa salta primeiro. */
export function Dinheiro({ c, sinal = false }: { c: number; sinal?: boolean }) {
  const [r, cent] = reais(Math.abs(c)).replace("R$", "").trim().split(",");
  return (
    <span className="dinheiro num">
      {c < 0 ? "−" : sinal && c > 0 ? "+" : ""}<span className="unidade">R$</span>{r}<span className="centavos">,{cent}</span>
    </span>
  );
}

/** Nome da carteira na tela: Dinheiro, VA, VT, VR (curto) ou Dinheiro, Vale-alimentação… (longo). */
export const chipCarteira = (c: Carteira) => (c === "conta" ? "Dinheiro" : curtoCarteira(c));
export const nomeLongo = (c: Carteira) => ({ conta: "Dinheiro", va: "Vale-alimentação", vt: "Vale-transporte", vr: "Vale-refeição" })[c];

/** Valida e salva. Devolve o erro (nada foi salvo) ou o aviso de limite (salvo; cruzou 80% ou 100% da categoria no mês). */
export function salvarLancamento(l: Omit<Lancamento, "_m">): { erro: string } | { aviso: string | null } {
  const erro = validarLancamento(l);
  if (erro) return { erro };
  const limite = config().limitesGasto?.[l.categoria] ?? 0;
  const gastoEm = (ls: Lancamento[]) => porCategoria(ls, mesDe(l.data)).find((c) => c.categoria === l.categoria)?.total ?? 0;
  const antes = gastoEm(lista("lancamentos").filter((x) => x.id !== l.id));
  salvar("lancamentos", l);
  if (l.tipo !== "saida" || !limite) return { aviso: null };
  const depois = gastoEm(lista("lancamentos"));
  const c = cruzouLimite(antes, depois, limite);
  return {
    aviso: c === 100 ? `${l.categoria} passou do limite do mês (${reais(depois)} de ${reais(limite)}).`
      : c === 80 ? `${l.categoria}: já foi 80% do limite (${reais(depois)} de ${reais(limite)}).` : null,
  };
}

/** "Recebi"/"Paguei" num fixo: lança na carteira do fixo, com a data de hoje (no mês atual) ou a do fixo (em outro mês). */
export function lancarFixo(f: Fixo, data: string) {
  const id = novoId("fn");
  const h = hoje();
  const r = salvarLancamento({ id, tipo: f.tipo, valor: f.valor, descricao: f.descricao, categoria: f.categoria, carteira: f.carteira, data: mesDe(data) === mesDe(h) ? h : data, fixoId: f.id });
  if ("erro" in r) return mostrarAviso(`${f.descricao}: ${r.erro} Toque no lápis do fixo para escolher.`);
  mostrarAviso(r.aviso ?? `${f.descricao}: ${reais(f.valor)} ${f.tipo === "entrada" ? "recebido" : "pago"} (${chipCarteira(f.carteira)}).`, () => excluir("lancamentos", id)());
}

type Ajustes = { tipo?: Lancamento["tipo"]; carteira?: Carteira; categoria?: string; data?: string };

/**
 * Anotar: uma linha ("va salgado 15 06/11") e uma prévia em que dá para trocar tipo, carteira, categoria e data antes de lançar,
 * com o saldo da carteira antes → depois. O que a pessoa toca na prévia vale mais que o palpite da linha.
 */
export function Anotar({ compacto = false }: { compacto?: boolean }) {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const [t, setT] = useState("");
  const [aj, setAj] = useState<Ajustes>({});
  const [erro, setErro] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const h = hoje();
  const p = t.trim() ? lerRapido(t, lancs, h) : null;
  const carteiras = carteirasEmUso(lancs, fixos);

  const tipo = aj.tipo ?? p?.tipo ?? "saida";
  const carteira: Carteira | null = aj.carteira ?? p?.carteira ?? null;
  const ehVale = carteira !== null && carteira !== "conta";
  const cats = tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  let categoria = aj.categoria ?? (p && tipo === p.tipo ? p.categoria : "Outros");
  if (tipo === "entrada" && ehVale) categoria = "Vale"; // vale que entra é sempre "Vale"
  else if (categoria === "Vale") categoria = "Outros"; // e "Vale" nunca entra no dinheiro
  if (!cats.includes(categoria)) categoria = "Outros";
  const data = aj.data ?? p?.data ?? h;
  const antes = carteira ? saldoAgora(lancs, carteira, h) : 0;
  const depois = p && carteira && data <= h ? antes + (tipo === "entrada" ? p.valor : -p.valor) : null;

  const mudarTexto = (v: string) => { setT(v); setErro(null); if (!v.trim()) setAj({}); };
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p) return setErro(t.trim() ? "Faltou o valor, como 12,50." : null);
    if (!carteira) return setErro("Escolha em qual vale.");
    const id = novoId("fn");
    const r = salvarLancamento({ id, tipo, valor: p.valor, descricao: p.descricao, categoria, carteira, data, fixoId: null });
    if ("erro" in r) return setErro(r.erro);
    mostrarAviso(r.aviso ?? `${tipo === "entrada" ? "Entrada" : "Gasto"} de ${reais(p.valor)} · ${chipCarteira(carteira)}${depois !== null ? ` agora ${reais(depois)}` : ""}.`, () => excluir("lancamentos", id)());
    setT(""); setAj({}); setErro(null);
    campo.current?.focus();
  };
  const quando = data === h ? "Hoje" : data === somarDias(h, -1) ? "Ontem" : data.slice(0, 4) === h.slice(0, 4) ? brCurta(data) : br(data);
  const rotuloCarteira = tipo === "entrada" ? "Entrou em" : "Saiu de";

  return (
    <form className={`anotar ${compacto ? "compacto" : "folha"}`} onSubmit={enviar} noValidate>
      {!compacto && <label className="anotar-rotulo" htmlFor="anotar-campo">Anotar</label>}
      <div className="rapida">
        <input
          id={compacto ? undefined : "anotar-campo"}
          ref={campo}
          className="entrada"
          value={t}
          onChange={(e) => mudarTexto(e.target.value)}
          placeholder='O que foi e quanto: "va salgado 15"'
          aria-label="Anotar: o que foi e quanto, como va salgado 15"
          enterKeyHint="done"
          autoComplete="off"
        />
        <button className="botao primario" disabled={!p || !carteira}>Lançar</button>
      </div>
      <div aria-live="polite">
        {p ? (
          <div className="anotar-previa">
            <div className="chips" role="group" aria-label="Tipo">
              {(["saida", "entrada"] as const).map((x) => (
                <button key={x} type="button" className={`chip chip-${x}`} aria-pressed={tipo === x} onClick={() => setAj({ ...aj, tipo: x, categoria: undefined })}>{x === "saida" ? "Gasto" : "Entrada"}</button>
              ))}
              <span className="chip-valor num">{reais(p.valor)}</span>
            </div>
            <div className={`chips ${carteira ? "" : "pedindo"}`} role="group" aria-label={rotuloCarteira}>
              <span className="chips-rotulo">{rotuloCarteira}</span>
              {carteiras.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={carteira === c} onClick={() => { setAj({ ...aj, carteira: c, categoria: undefined }); setErro(null); }}>{chipCarteira(c)}</button>
              ))}
            </div>
            <div className="anotar-detalhes">
              <label className="mini-campo">
                <span className="sr-only">Categoria</span>
                <select value={categoria} onChange={(e) => setAj({ ...aj, categoria: e.target.value })} disabled={tipo === "entrada" && ehVale}>
                  {(tipo === "entrada" && ehVale ? ["Vale"] : cats.filter((c) => c !== "Vale")).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="mini-campo data">
                <span className="sr-only">Data</span>
                <input type="date" value={data} onChange={(e) => e.target.value && setAj({ ...aj, data: e.target.value })} />
                <span className="data-texto" aria-hidden="true">{quando}</span>
              </label>
              {p.aprendeu && !aj.categoria && <small className="suave">como da última vez</small>}
            </div>
            {carteira ? (
              <p className="anotar-efeito">
                <span>{nomeLongo(carteira)}</span>
                <span className="num">{reais(antes)}</span>
                {depois !== null ? <><span aria-hidden="true">→</span><b className={`num ${depois < 0 ? "negativo" : ""}`}>{reais(depois)}</b></> : <span className="suave">data futura: entra no dia</span>}
              </p>
            ) : (
              <p className="anotar-efeito pedindo">Em qual vale? Toque em VA, VT{carteiras.includes("vr") ? " ou VR" : ""}.</p>
            )}
          </div>
        ) : t.trim() ? (
          <p className="anotar-dica">Faltou o valor, como <span className="num">12,50</span>.</p>
        ) : compacto ? null : (
          <p className="anotar-dica">Ex.: <code>lanche 12,50</code> · <code>va salgado 15 06/11</code> · <code>+174 salário</code> · <code>vale alimentação 600</code> (recebeu) · <code>uber 18 ontem</code></p>
        )}
        {erro && <p className="anotar-erro" role="alert">{erro}</p>}
      </div>
    </form>
  );
}
