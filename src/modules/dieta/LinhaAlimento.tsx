import { Fragment, useEffect, useId, useState } from "react";
import { X } from "../../components/icones.tsx";
import { lerNumero, novoId, num } from "../../data/formato.ts";
import type { Alimento } from "../../data/types.ts";
import { buscarAlimentos, calcular, type Encontrado, type LinhaTaco } from "./nutricao.ts";
import { useBuscaOnline } from "./buscaOnline.ts";

/** Linha do formulário de refeição, em texto (como está nos campos). */
export interface AlimentoTexto {
  id: string;
  nome: string;
  quantidade: string;
  kcal: string;
  proteina: string;
  /** Escolhido na lista (vence a busca pelo nome): id da tabela local ou o produto de marca inteiro. */
  escolha?: number | Encontrado;
  /** A pessoa digitou o valor: o app não sobrescreve aquele campo. */
  manualKcal: boolean;
  manualProt: boolean;
}

export const linhaVazia = (): AlimentoTexto => ({ id: novoId("a"), nome: "", quantidade: "", kcal: "", proteina: "", manualKcal: false, manualProt: false });

/** Alimento salvo → campos do formulário. */
export function paraTexto(a: Alimento): AlimentoTexto {
  return {
    id: a.id, nome: a.nome, quantidade: a.quantidade,
    kcal: a.kcal === null ? "" : num(a.kcal), proteina: a.proteina === null ? "" : num(a.proteina),
    escolha: a.base ?? a.ref,
    manualKcal: !a.autoKcal && a.kcal !== null, manualProt: !a.autoProt && a.proteina !== null,
  };
}

/** Campos do formulário → alimento salvo. Linha vazia = { alimento: null }. */
export function paraAlimento(a: AlimentoTexto): { alimento: Alimento | null; erro?: string } {
  if (!a.nome.trim() && !a.quantidade.trim() && !a.kcal && !a.proteina) return { alimento: null };
  const kcal = lerNumero(a.kcal);
  const proteina = lerNumero(a.proteina);
  if (!a.nome.trim()) return { alimento: null, erro: "Dê um nome ao alimento." };
  if (Number.isNaN(kcal) || (kcal !== null && kcal < 0)) return { alimento: null, erro: "Calorias: use um número, como 120." };
  if (Number.isNaN(proteina) || (proteina !== null && proteina < 0)) return { alimento: null, erro: "Proteína: use um número, como 12,5." };
  return {
    alimento: {
      id: a.id, nome: a.nome.trim(), quantidade: a.quantidade.trim(), kcal, proteina,
      ...(typeof a.escolha === "number" ? { ref: a.escolha } : {}),
      ...(a.escolha && typeof a.escolha === "object" ? { base: { ...a.escolha, id: String(a.escolha.id) } } : {}),
      ...(!a.manualKcal && kcal !== null ? { autoKcal: true } : {}),
      ...(!a.manualProt && proteina !== null ? { autoProt: true } : {}),
    },
  };
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
  const r = a.nome.trim() ? calcular(tabela, a.nome, a.quantidade, a.escolha) : null;
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
  const locais = tabela && aberta && a.nome.trim().length >= 2 ? buscarAlimentos(tabela, a.nome, 5) : [];
  const online = useBuscaOnline(a.nome, aberta);
  const sugestoes = [...locais, ...online.itens];
  const mudar = (p: Partial<AlimentoTexto>) => aoMudar(recalcular({ ...a, ...p }, tabela));
  const escolher = (s: Encontrado) => { mudar({ escolha: typeof s.id === "number" ? s.id : s }); setAberta(false); };
  const mostrarLista = aberta && a.nome.trim().length >= 2 && (sugestoes.length > 0 || online.estado === "buscando");

  const r = tabela && a.nome.trim() ? calcular(tabela, a.nome, a.quantidade, a.escolha) : null;
  let info: React.ReactNode = null;
  if (!tabela) info = a.nome ? "Carregando a tabela de alimentos…" : null;
  else if (a.manualKcal || a.manualProt) {
    const qual = a.manualKcal && a.manualProt ? "Calorias e proteína digitadas" : a.manualKcal ? "Calorias digitadas" : "Proteína digitada";
    info = <>{qual} por você. <button type="button" className="link-botao" onClick={() => aoMudar(recalcular({ ...a, manualKcal: false, manualProt: false }, tabela))}>Calcular tudo pela tabela</button></>;
  } else if (r?.ok) {
    const al = r.calculo.alimento;
    info = <>{r.calculo.como} de <b>{al.nome}</b>{al.marca && <> · {al.marca}</>} ({al.fonte})</>;
  } else if (r && r.motivo === "sem-alimento") info = "Não achei esse alimento na tabela. Se quiser, preencha kcal e proteína.";
  else if (r && r.motivo === "sem-quantidade") info = a.quantidade.trim() ? "Não entendi a quantidade. Escreva como 100 g, 2 colheres de sopa ou 1 unidade." : `Escreva a quantidade para calcular (${r.alimento?.nome}).`;
  else if (r && r.motivo === "medida-desconhecida") info = `Não sei quanto pesa essa medida de ${r.alimento?.nome}. Use gramas, como 150 g.`;

  return (
    <div className="alimento-form">
      <span className="alimento-nome">
        <input
          className="entrada"
          value={a.nome}
          onChange={(e) => { mudar({ nome: e.target.value, escolha: undefined }); setAberta(true); setAtivo(0); }}
          onFocus={() => setAberta(true)}
          onBlur={() => setAberta(false)}
          onKeyDown={(e) => {
            if (!sugestoes.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((i) => (i + 1) % sugestoes.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((i) => (i - 1 + sugestoes.length) % sugestoes.length); }
            else if (e.key === "Enter") { e.preventDefault(); escolher(sugestoes[Math.min(ativo, sugestoes.length - 1)]); }
            else if (e.key === "Escape") setAberta(false);
          }}
          placeholder="Alimento"
          aria-label="Alimento"
          aria-invalid={!!erro}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-activedescendant={mostrarLista && sugestoes.length ? `${idLista}-${ativo}` : undefined}
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
      {mostrarLista && (
        <ul className="sugestoes" id={idLista} role="listbox" aria-label="Alimentos">
          {locais.length > 0 && <li role="presentation" className="sugestoes-titulo">Tabela de alimentos</li>}
          {sugestoes.map((s, i) => (
            <Fragment key={s.id}>
              {i === locais.length && <li role="presentation" className="sugestoes-titulo">Produtos de marca · Open Food Facts</li>}
              <li
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => e.preventDefault()} // não tira o foco antes do clique
                onClick={() => escolher(s)}
              >
                <span>{s.nome}{s.marca && <span className="sugestao-marca"> · {s.marca}</span>}</span>
                <small className="num">{s.kcal100} kcal · {num(s.prot100)} g prot. / 100 g{typeof s.id === "number" && s.fonte !== "TACO" ? ` · ${s.fonte}` : ""}</small>
              </li>
            </Fragment>
          ))}
          {online.estado === "buscando" && <li role="presentation" className="sugestoes-status">Buscando produtos de marca…</li>}
          {online.estado === "erro" && <li role="presentation" className="sugestoes-status">Busca de produtos de marca indisponível agora (sem internet ou fora do site publicado).</li>}
          {online.estado === "ok" && online.itens.length === 0 && <li role="presentation" className="sugestoes-status">Nenhum produto de marca com esse nome.</li>}
        </ul>
      )}
      {info && <p className="alimento-info">{info}</p>}
      {erro && <p className="erro-campo" role="alert">{erro}</p>}
    </div>
  );
}
