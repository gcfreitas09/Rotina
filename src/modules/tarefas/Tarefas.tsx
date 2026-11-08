import { useMemo, useState } from "react";
import { ChevronRight, Plus, Repeat, ListTree } from "../../components/icones.tsx";
import type { Tarefa } from "../../data/types.ts";
import { salvar, useColecao } from "../../data/store.ts";
import { br, contagem, diasEntre, hoje } from "../../data/datas.ts";
import { Vazio } from "../../components/ui.tsx";
import { pulso } from "../../components/movimento.tsx";
import { CATEGORIAS_FIXAS, ROTULO_URGENCIA, alternar, atrasada, descreverRecorrencia, feitaEm, filtrar, recorrente, urgencia, type Filtro, type Urgencia } from "./logica.ts";
import TarefaForm from "./TarefaForm.tsx";
import Segmentos from "../../components/Segmentos.tsx";

const FILTROS: [Filtro, string][] = [
  ["hoje", "Hoje"],
  ["semana", "Semana"],
  ["atrasadas", "Atrasadas"],
  ["todas", "Todas"],
  ["concluidas", "Concluídas"],
];

const VAZIOS: Record<Filtro, string> = {
  hoje: "Nada para hoje.",
  semana: "Nada para esta semana.",
  atrasadas: "Nenhuma tarefa atrasada.",
  todas: "Nenhuma tarefa pendente.",
  concluidas: "Nenhuma tarefa concluída ainda.",
};

export default function Tarefas() {
  const tarefas = useColecao("tarefas");
  const categorias = useColecao("categorias");
  const [filtro, setFiltro] = useState<Filtro>("hoje");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [editando, setEditando] = useState<Tarefa | "nova" | null>(null);
  const h = hoje();

  const nomesCategorias = useMemo(
    () => [...CATEGORIAS_FIXAS, ...categorias.map((c) => c.nome).filter((n) => !CATEGORIAS_FIXAS.includes(n))],
    [categorias],
  );
  const linhas = filtrar(tarefas, filtro, h, categoria);
  const contar = (f: Filtro) => filtrar(tarefas, f, h, categoria).length;

  return (
    <>
      <div className="topo">
        <h1>Tarefas</h1>
        <button className="botao primario" onClick={() => setEditando("nova")}>
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Nova tarefa
        </button>
      </div>

      <div className="barra-filtros" data-anima>
        <Segmentos itens={FILTROS.map(([id, nome]) => ({ id, nome, n: contar(id) }))} atual={filtro} aoMudar={setFiltro} rotulo="Filtrar por prazo" />
        <label className="filtro-categoria">
          <span>Categoria</span>
          <select className="entrada" value={categoria ?? ""} onChange={(e) => setCategoria(e.target.value || null)} aria-label="Filtrar por categoria">
            <option value="">Todas</option>
            {nomesCategorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <p className="legenda-urg" data-anima>
        <span className="suave">Urgência, pelo prazo e pela prioridade:</span>
        {(Object.keys(ROTULO_URGENCIA) as Urgencia[]).map((u) => (
          <span key={u} className={`selo urg-${u}`}>{ROTULO_URGENCIA[u]}</span>
        ))}
      </p>

      {linhas.length === 0 ? (
        <Vazio texto={VAZIOS[filtro]} acao={filtro === "concluidas" ? undefined : "Criar tarefa"} aoAgir={() => setEditando("nova")} />
      ) : (
        <ul className="lista lista-tarefas" style={{ marginTop: 8 }}>
          {linhas.map(({ tarefa, data }) => (
            <li key={tarefa.id}>
              <LinhaTarefa t={tarefa} data={data} aoAbrir={() => setEditando(tarefa)} />
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <TarefaForm
          tarefa={editando === "nova" ? null : editando}
          categorias={nomesCategorias}
          categoriaInicial={categoria}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

/**
 * Uma tarefa na lista. Sem subtarefas, tocar nela abre a edição.
 * Com subtarefas, tocar abre a lista ali mesmo, com caixinhas que salvam na hora;
 * a edição fica no botão de dentro.
 */
export function LinhaTarefa({ t, data, aoAbrir, rotuloAbrir = "Editar tarefa" }: { t: Tarefa; data: string; aoAbrir?: () => void; rotuloAbrir?: string }) {
  const h = hoje();
  const [aberta, setAberta] = useState(false);
  const feita = feitaEm(t, data);
  const atrasa = atrasada(t, h);
  const sub = t.subtarefas.length;
  const temSub = sub > 0;
  const subFeitas = t.subtarefas.filter((s) => s.feita).length;
  const d = diasEntre(h, data);
  const urg = feita ? null : urgencia(t.prioridade, data, h);
  const idSub = `sub-${t.id}`;

  const marcarSub = (id: string, el: HTMLInputElement) => {
    pulso(el);
    salvar("tarefas", { ...t, subtarefas: t.subtarefas.map((s) => (s.id === id ? { ...s, feita: !s.feita } : s)) });
  };

  return (
    <div className="tarefa">
      <div className={`item ${feita ? "feito" : ""} ${aberta ? "aberta" : ""}`} data-urg={urg ?? undefined}>
        <input
          type="checkbox"
          className="check"
          checked={feita}
          aria-label={`Concluir ${t.titulo}`}
          onChange={(e) => { pulso(e.currentTarget); salvar("tarefas", alternar(t, data, h)); }}
        />
        <button
          className={`item-corpo ${temSub ? "com-sub" : ""}`}
          onClick={temSub ? () => setAberta((v) => !v) : aoAbrir}
          disabled={!temSub && !aoAbrir}
          aria-expanded={temSub ? aberta : undefined}
          aria-controls={temSub ? idSub : undefined}
        >
          <span className="item-titulo">{t.titulo}</span>
          <span className="item-meta">
            {urg && <span className={`selo urg-${urg}`}>{ROTULO_URGENCIA[urg]}</span>}
            <span className={atrasa ? "atraso" : ""}>
              {atrasa ? `Atrasada · ${br(data)}` : d >= -1 && d <= 1 ? contagem(d)[0].toUpperCase() + contagem(d).slice(1) : br(data)}
            </span>
            <span>{t.categoria}</span>
            {recorrente(t) && (
              <span><Repeat size={12} strokeWidth={1.8} aria-hidden="true" style={{ verticalAlign: -1, marginRight: 4 }} />{descreverRecorrencia(t)}</span>
            )}
            {temSub && (
              <span><ListTree size={12} strokeWidth={1.8} aria-hidden="true" style={{ verticalAlign: -1, marginRight: 4 }} /><span className="num">{subFeitas}/{sub}</span></span>
            )}
          </span>
          {temSub && <ChevronRight className="sub-seta" size={18} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      </div>

      {temSub && (
        <div className={`sub-wrap ${aberta ? "aberta" : ""}`} id={idSub} data-urg={urg ?? undefined} inert={!aberta}>
          <div className="sub-interno">
            <div className="sub-progresso">
              <span className="mini-regua" aria-hidden="true"><i style={{ width: `${(subFeitas / sub) * 100}%` }} /></span>
              <span className="num">{subFeitas} de {sub}</span>
            </div>
            <ul className="sub-lista">
              {t.subtarefas.map((s) => (
                <li key={s.id}>
                  <label className={`sub-item ${s.feita ? "feita" : ""}`}>
                    <input type="checkbox" className="check" checked={s.feita} onChange={(e) => marcarSub(s.id, e.currentTarget)} />
                    <span>{s.texto}</span>
                  </label>
                </li>
              ))}
            </ul>
            {aoAbrir && (
              <div className="sub-acoes">
                <button className="botao pequeno" onClick={aoAbrir}>{rotuloAbrir}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
