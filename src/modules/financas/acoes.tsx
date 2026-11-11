/** Peças das Finanças usadas também no Hoje: valor formatado, salvar lançamento (com aviso de limite), pagar fixo, lançar rápido. */
import { useState } from "react";
import { Plus } from "../../components/icones.tsx";
import type { Fixo, Lancamento } from "../../data/types.ts";
import { config, excluir, lista, salvar } from "../../data/store.ts";
import { hoje, somarDias } from "../../data/datas.ts";
import { novoId } from "../../data/formato.ts";
import { mostrarAviso } from "../../components/ui.tsx";
import { cruzouLimite, curtoCarteira, mesDe, porCategoria, reais } from "./logica.ts";
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

/**
 * Salva e devolve o texto do aviso de limite, se o gasto fez a categoria cruzar 80% ou 100% no mês.
 * Lê o estado atual do store (não precisa receber a lista).
 */
export function salvarLancamento(l: Omit<Lancamento, "_m">): string | null {
  const limite = config().limitesGasto?.[l.categoria] ?? 0;
  const atuais = lista("lancamentos");
  const gastoEm = (ls: Lancamento[]) => porCategoria(ls, mesDe(l.data)).find((c) => c.categoria === l.categoria)?.total ?? 0;
  const antes = gastoEm(atuais.filter((x) => x.id !== l.id));
  salvar("lancamentos", l);
  if (l.tipo !== "saida" || !limite) return null;
  const depois = gastoEm(lista("lancamentos"));
  const c = cruzouLimite(antes, depois, limite);
  if (c === 100) return `${l.categoria} passou do limite do mês (${reais(depois)} de ${reais(limite)}).`;
  if (c === 80) return `${l.categoria}: já foi 80% do limite (${reais(depois)} de ${reais(limite)}).`;
  return null;
}

/** "Recebi"/"Paguei" num fixo: lança com a data de hoje (no mês atual) ou a do fixo (em outro mês). Aviso com Desfazer. */
export function lancarFixo(f: Fixo, data: string) {
  const id = novoId("fn");
  const h = hoje();
  const aviso = salvarLancamento({ id, tipo: f.tipo, valor: f.valor, descricao: f.descricao, categoria: f.categoria, carteira: f.carteira, data: mesDe(data) === mesDe(h) ? h : data, fixoId: f.id });
  mostrarAviso(aviso ?? `${f.descricao}: ${reais(f.valor)} ${f.tipo === "entrada" ? "recebido" : "pago"}.`, () => excluir("lancamentos", id)());
}

/** Uma linha: "lanche 12,50", "uber 18 ontem", "+800 salário", "almoço 32,50 vr". Mostra o que vai lançar antes do Enter. */
export function LancarRapido({ compacto = false }: { compacto?: boolean }) {
  const [t, setT] = useState("");
  const h = hoje();
  const r = t.trim() ? lerRapido(t, lista("lancamentos"), h) : null;
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!r) return;
    const id = novoId("fn");
    const { aprendeu: _a, ...dados } = r;
    void _a;
    const aviso = salvarLancamento({ id, ...dados, fixoId: null });
    mostrarAviso(aviso ?? `${r.tipo === "entrada" ? "Entrada" : "Gasto"} de ${reais(r.valor)} em ${r.categoria}.`, () => excluir("lancamentos", id)());
    setT("");
  };
  return (
    <form className={`lancar-rapido ${compacto ? "compacto" : ""}`} onSubmit={enviar}>
      <div className="rapida">
        <input
          className="entrada"
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder='Lançar rápido: "lanche 12,50"'
          aria-label="Lançar rápido: escreva o que foi e o valor, como lanche 12,50"
          aria-describedby="lancar-rapido-previa"
          enterKeyHint="done"
          autoComplete="off"
        />
        <button className="botao primario" aria-label="Lançar" disabled={!r}><Plus size={18} strokeWidth={2} /></button>
      </div>
      <p className="lancar-previa" id="lancar-rapido-previa" aria-live="polite">
        {!t.trim() ? (compacto ? null : <span className="suave">Escreva o que foi e o valor. "+" ou "recebi" = entrada; "ontem" muda a data; "va" ou "vale alimentação" (e "vt", "vr") tira do vale.</span>)
          : r ? (
            <>
              <span className={`selo-tipo ${r.tipo}`}>{r.tipo === "entrada" ? "Entrada" : "Gasto"}</span>
              <span className="num">{reais(r.valor)}</span>
              <span>{r.categoria}{r.aprendeu && <small className="suave"> (como da última vez)</small>}</span>
              {r.carteira !== "conta" && <span className="selo-carteira">{curtoCarteira(r.carteira)}</span>}
              {r.data !== h && <span className="suave">{r.data === somarDias(h, -1) ? "ontem" : "anteontem"}</span>}
            </>
          ) : <span className="suave">Faltou o valor, como 12,50.</span>}
      </p>
    </form>
  );
}
