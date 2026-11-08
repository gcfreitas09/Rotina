import { useEffect, useId, useState } from "react";
import { X } from "../../components/icones.tsx";
import { num } from "../../data/formato.ts";
import { buscarAlimentos, calcular, type LinhaTaco } from "./nutricao.ts";

/** Linha do formulário de refeição, em texto (como está nos campos). */
export interface AlimentoTexto {
  id: string;
  nome: string;
  quantidade: string;
  kcal: string;
  proteina: string;
  /** Alimento da TACO escolhido na lista (vence a busca pelo nome). */
  ref?: number;
  /** A pessoa digitou o valor: o app não sobrescreve aquele campo. */
  manualKcal: boolean;
  manualProt: boolean;
}

// A tabela (≈ 28 KB) só carrega quando um formulário de refeição abre.
let tabelaCache: LinhaTaco[] | null = null;
let carregando: Promise<LinhaTaco[]> | null = null;
export function useTabelaTaco(): LinhaTaco[] | null {
  const [t, setT] = useState(tabelaCache);
  useEffect(() => {
    if (tabelaCache) return;
    carregando ??= import("./taco.json").then((m) => (tabelaCache = m.default as unknown as LinhaTaco[]));
    let vivo = true;
    carregando.then((x) => vivo && setT(x));
    return () => { vivo = false; };
  }, []);
  return t;
}

/** Recalcula kcal e proteína da linha (se a pessoa não digitou os valores à mão). */
export function recalcular(a: AlimentoTexto, tabela: LinhaTaco[] | null): AlimentoTexto {
  if (!tabela || (a.manualKcal && a.manualProt)) return a;
  const r = a.nome.trim() ? calcular(tabela, a.nome, a.quantidade, a.ref) : null;
  return {
    ...a,
    kcal: a.manualKcal ? a.kcal : r?.ok ? String(r.calculo.kcal) : "",
    proteina: a.manualProt ? a.proteina : r?.ok ? num(r.calculo.proteina) : "",
  };
}

export default function LinhaAlimento({ a, tabela, erro, aoMudar, aoRemover }: {
  a: AlimentoTexto;
  tabela: LinhaTaco[] | null;
  erro?: string;
  aoMudar: (novo: AlimentoTexto) => void;
  aoRemover: () => void;
}) {
  const idLista = useId();
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const sugestoes = tabela && aberta && a.nome.trim().length >= 2 ? buscarAlimentos(tabela, a.nome, 6) : [];
  const mudar = (p: Partial<AlimentoTexto>) => aoMudar(recalcular({ ...a, ...p }, tabela));
  const escolher = (id: number) => { mudar({ ref: id }); setAberta(false); };

  const r = tabela && a.nome.trim() ? calcular(tabela, a.nome, a.quantidade, a.ref) : null;
  let info: React.ReactNode = null;
  if (!tabela) info = a.nome ? "Carregando a tabela de alimentos…" : null;
  else if (a.manualKcal || a.manualProt) {
    const qual = a.manualKcal && a.manualProt ? "Calorias e proteína digitadas" : a.manualKcal ? "Calorias digitadas" : "Proteína digitada";
    info = <>{qual} por você. <button type="button" className="link-botao" onClick={() => aoMudar(recalcular({ ...a, manualKcal: false, manualProt: false }, tabela))}>Calcular tudo pela tabela</button></>;
  } else if (r?.ok) {
    info = <>{r.calculo.como} de <b>{r.calculo.alimento.nome}</b> (TACO)</>;
  } else if (r && r.motivo === "sem-alimento") info = "Não achei esse alimento na tabela. Se quiser, preencha kcal e proteína.";
  else if (r && r.motivo === "sem-quantidade") info = a.quantidade.trim() ? "Não entendi a quantidade. Escreva como 100 g, 2 colheres de sopa ou 1 unidade." : `Escreva a quantidade para calcular (${r.alimento?.nome}).`;
  else if (r && r.motivo === "medida-desconhecida") info = `Não sei quanto pesa essa medida de ${r.alimento?.nome}. Use gramas, como 150 g.`;

  return (
    <div className="alimento-form">
      <span className="alimento-nome">
        <input
          className="entrada"
          value={a.nome}
          onChange={(e) => { mudar({ nome: e.target.value, ref: undefined }); setAberta(true); setAtivo(0); }}
          onFocus={() => setAberta(true)}
          onBlur={() => setAberta(false)}
          onKeyDown={(e) => {
            if (!sugestoes.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((i) => (i + 1) % sugestoes.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((i) => (i - 1 + sugestoes.length) % sugestoes.length); }
            else if (e.key === "Enter") { e.preventDefault(); escolher(sugestoes[ativo].id); }
            else if (e.key === "Escape") setAberta(false);
          }}
          placeholder="Alimento"
          aria-label="Alimento"
          aria-invalid={!!erro}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={sugestoes.length > 0}
          aria-controls={idLista}
          aria-activedescendant={sugestoes.length ? `${idLista}-${ativo}` : undefined}
          autoComplete="off"
        />
      </span>
      <input className="entrada" value={a.quantidade} onChange={(e) => mudar({ quantidade: e.target.value })} placeholder="Ex.: 2 ovos, 150 g" aria-label="Quantidade" />
      <label className="com-unidade">
        <input className="entrada num" data-auto={!a.manualKcal && !!a.kcal} inputMode="decimal" value={a.kcal} onChange={(e) => aoMudar({ ...a, kcal: e.target.value, manualKcal: true })} placeholder="—" aria-label="Calorias" />
        <span aria-hidden="true">kcal</span>
      </label>
      <label className="com-unidade">
        <input className="entrada num" data-auto={!a.manualProt && !!a.proteina} inputMode="decimal" value={a.proteina} onChange={(e) => aoMudar({ ...a, proteina: e.target.value, manualProt: true })} placeholder="—" aria-label="Proteína em gramas" />
        <span aria-hidden="true">g prot.</span>
      </label>
      <button type="button" className="icone-btn" onClick={aoRemover} aria-label={`Remover ${a.nome || "alimento"}`}>
        <X size={16} strokeWidth={1.6} />
      </button>
      {sugestoes.length > 0 && (
        <ul className="sugestoes" id={idLista} role="listbox" aria-label="Alimentos da tabela">
          {sugestoes.map((s, i) => (
            <li
              key={s.id}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === ativo}
              onMouseDown={(e) => e.preventDefault()} // não tira o foco antes do clique
              onClick={() => escolher(s.id)}
            >
              <span>{s.nome}</span>
              <small className="num">{s.kcal100} kcal · {num(s.prot100)} g prot. / 100 g</small>
            </li>
          ))}
        </ul>
      )}
      {info && <p className="alimento-info">{info}</p>}
      {erro && <p className="erro-campo" role="alert">{erro}</p>}
    </div>
  );
}
