import { useState } from "react";
import { Plus, Trash2, X } from "../../components/icones.tsx";
import type { Dia, Prioridade, Recorrencia, Subtarefa, Tarefa } from "../../data/types.ts";
import { excluir, salvar } from "../../data/store.ts";
import { diaDaSemana, hoje } from "../../data/datas.ts";
import { novoId } from "../../data/formato.ts";
import { Campo, DiasRepetir, Dialogo, excluirComDesfazer } from "../../components/ui.tsx";

type TipoRec = Recorrencia["tipo"];

export default function TarefaForm({ tarefa, categorias, categoriaInicial, aoFechar }: {
  tarefa: Tarefa | null; categorias: string[]; categoriaInicial: string | null; aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  const [data, setData] = useState(tarefa?.data ?? hoje());
  const [prioridade, setPrioridade] = useState<Prioridade>(tarefa?.prioridade ?? "media");
  const [categoria, setCategoria] = useState(tarefa?.categoria ?? categoriaInicial ?? "Escola");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [subtarefas, setSubtarefas] = useState<Subtarefa[]>(tarefa?.subtarefas ?? []);
  const [novaSub, setNovaSub] = useState("");
  const [tipoRec, setTipoRec] = useState<TipoRec>(tarefa?.recorrencia.tipo ?? "nenhuma");
  const [dias, setDias] = useState<Dia[]>(tarefa?.recorrencia.tipo === "dias" ? tarefa.recorrencia.dias : [diaDaSemana(data)]);
  const [erros, setErros] = useState<Record<string, string>>({});

  const addSub = () => {
    const t = novaSub.trim();
    if (!t) return;
    setSubtarefas([...subtarefas, { id: novoId("s"), texto: t, feita: false }]);
    setNovaSub("");
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!titulo.trim()) er.titulo = "Escreva o que precisa ser feito.";
    if (!data) er.data = "Escolha a data de entrega.";
    const cat = categoria === "__nova" ? novaCategoria.trim() : categoria;
    if (!cat) er.categoria = "Dê um nome à categoria.";
    if (tipoRec === "dias" && dias.length === 0) er.dias = "Escolha pelo menos um dia.";
    setErros(er);
    if (Object.keys(er).length) return;

    if (categoria === "__nova" && !categorias.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      salvar("categorias", { id: novoId("c"), nome: cat });
    }
    const recorrencia: Recorrencia = tipoRec === "dias" ? { tipo: "dias", dias } : { tipo: tipoRec } as Recorrencia;
    salvar("tarefas", {
      id: tarefa?.id ?? novoId("t"),
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data,
      prioridade,
      categoria: cat,
      subtarefas,
      recorrencia,
      concluida: tarefa?.concluida ?? false,
      concluidaEm: tarefa?.concluidaEm ?? null,
      feitasEm: tarefa?.feitasEm ?? [],
    });
    aoFechar();
  };

  const apagar = async () => {
    if (!tarefa) return;
    const ok = await excluirComDesfazer(
      { pergunta: "Excluir esta tarefa?", detalhe: `"${tarefa.titulo}" e as subtarefas dela serão excluídas.`, feito: "Tarefa excluída." },
      () => excluir("tarefas", tarefa.id),
    );
    if (ok) aoFechar();
  };

  return (
    <Dialogo titulo={tarefa ? "Editar tarefa" : "Nova tarefa"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Título" erro={erros.titulo}>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-invalid={!!erros.titulo} placeholder="Ex.: Lista de Química" />
        </Campo>
        <Campo rotulo="Descrição (opcional)">
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </Campo>
        <div className="linha-campos">
          <Campo rotulo={tipoRec === "nenhuma" ? "Entrega" : "Começa em"} erro={erros.data}>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-invalid={!!erros.data} />
          </Campo>
          <Campo rotulo="Prioridade">
            <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </Campo>
        </div>
        <Campo rotulo="Categoria" erro={erros.categoria}>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {!categorias.includes(categoria) && categoria !== "__nova" && <option value={categoria}>{categoria}</option>}
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__nova">Nova categoria…</option>
          </select>
        </Campo>
        {categoria === "__nova" && (
          <Campo rotulo="Nome da nova categoria">
            <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Ex.: Cursinho" aria-invalid={!!erros.categoria} />
          </Campo>
        )}

        <Campo rotulo="Repetir">
          <select value={tipoRec} onChange={(e) => setTipoRec(e.target.value as TipoRec)}>
            <option value="nenhuma">Não repetir</option>
            <option value="diaria">Todo dia</option>
            <option value="semanal">Toda semana, no mesmo dia</option>
            <option value="dias">Em dias específicos</option>
          </select>
        </Campo>
        {tipoRec === "dias" && (
          <>
            <DiasRepetir valor={dias} aoMudar={setDias} rotulo="Dias" />
            {erros.dias && <p className="erro-campo" role="alert">{erros.dias}</p>}
          </>
        )}

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Subtarefas</span>
          {subtarefas.length > 0 && (
            <ul className="lista">
              {subtarefas.map((s) => (
                <li key={s.id} className="item" style={{ minHeight: 44, padding: 0 }}>
                  <input
                    type="checkbox"
                    className="check"
                    checked={s.feita}
                    aria-label={`Concluir ${s.texto}`}
                    onChange={() => setSubtarefas(subtarefas.map((x) => (x.id === s.id ? { ...x, feita: !x.feita } : x)))}
                  />
                  <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", textDecoration: s.feita ? "line-through" : undefined }}>{s.texto}</span>
                  <button type="button" className="icone-btn" aria-label={`Remover ${s.texto}`} onClick={() => setSubtarefas(subtarefas.filter((x) => x.id !== s.id))}>
                    <X size={16} strokeWidth={1.6} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="entrada"
              value={novaSub}
              onChange={(e) => setNovaSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
              placeholder="Adicionar item"
              aria-label="Nova subtarefa"
            />
            <button type="button" className="botao" onClick={addSub} aria-label="Adicionar subtarefa"><Plus size={18} strokeWidth={1.8} /></button>
          </div>
        </fieldset>

        <div className="acoes" style={{ justifyContent: "space-between" }}>
          {tarefa ? (
            <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Excluir</button>
          ) : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">{tarefa ? "Salvar tarefa" : "Criar tarefa"}</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}
