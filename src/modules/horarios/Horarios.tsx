import { useState } from "react";
import { AlertTriangle, MapPin, Plus, Trash2 } from "../../components/icones.tsx";
import type { Bloco, Dia, TipoBloco } from "../../data/types.ts";
import { excluir, useColecao } from "../../data/store.ts";
import { DIAS, DIAS_CURTOS, DIAS_LONGOS, diaDaSemana, duracao, minutos } from "../../data/datas.ts";
import { Campo, DiasRepetir, Dialogo, EscopoGrupo, Vazio, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import { criarRepetido, doGrupo, editarGrupo, editarUm } from "../../data/grupos.ts";

export const TIPOS: Record<TipoBloco, string> = {
  aula: "Aula",
  trabalho: "Trabalho",
  academia: "Academia",
  futevolei: "Futevôlei",
  estudo: "Estudo",
  livre: "Livre",
};

/** Pares de blocos que se sobrepõem no mesmo dia. */
export function sobreposicoes(blocos: Bloco[]): [Bloco, Bloco][] {
  const pares: [Bloco, Bloco][] = [];
  for (const d of DIAS) {
    const doDia = blocos.filter((b) => b.dia === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 0; i < doDia.length; i++)
      for (let j = i + 1; j < doDia.length; j++)
        if (doDia[j].inicio < doDia[i].fim && doDia[i].inicio < doDia[j].fim) pares.push([doDia[i], doDia[j]]);
  }
  return pares;
}

/** Lado a lado quando sobrepõe: cada bloco ganha uma pista dentro do seu grupo de conflito. */
function pistas(doDia: Bloco[]): { b: Bloco; pista: number; total: number }[] {
  const res: { b: Bloco; pista: number; total: number }[] = [];
  let cluster: { b: Bloco; pista: number; total: number }[] = [];
  let fimCluster = "";
  const fechar = () => {
    const total = Math.max(1, ...cluster.map((c) => c.pista + 1));
    cluster.forEach((c) => res.push({ ...c, total }));
    cluster = [];
  };
  for (const b of doDia) {
    if (cluster.length && b.inicio >= fimCluster) fechar();
    const ocupadas = cluster.filter((c) => c.b.fim > b.inicio).map((c) => c.pista);
    let pista = 0;
    while (ocupadas.includes(pista)) pista++;
    cluster.push({ b, pista, total: 1 });
    fimCluster = cluster.length === 1 || b.fim > fimCluster ? (b.fim > fimCluster ? b.fim : fimCluster) : fimCluster;
  }
  fechar();
  return res;
}

export default function Horarios() {
  const blocos = useColecao("blocos");
  const [editando, setEditando] = useState<Bloco | "novo" | null>(null);
  const [diaNovo, setDiaNovo] = useState<Dia | null>(null);
  const conflitos = sobreposicoes(blocos);
  const emConflito = new Set(conflitos.flat().map((b) => b.id));
  const hojeDia = diaDaSemana(new Date());
  const doDia = (d: Dia) => blocos.filter((b) => b.dia === d).sort((a, b) => a.inicio.localeCompare(b.inicio));

  const novo = (d: Dia | null = null) => {
    setDiaNovo(d);
    setEditando("novo");
  };

  // Faixa da grade: da primeira à última hora usada (mínimo 7h–22h).
  const ini = Math.min(7 * 60, ...blocos.map((b) => minutos(b.inicio)));
  const fim = Math.max(22 * 60, ...blocos.map((b) => minutos(b.fim)));
  const h0 = Math.floor(ini / 60);
  const h1 = Math.ceil(fim / 60);
  const PX = 0.8; // px por minuto

  return (
    <>
      <div className="topo">
        <h1>Horários</h1>
        <button className="botao primario" onClick={() => novo()}>
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Novo horário
        </button>
      </div>

      {conflitos.length > 0 && (
        <div className="alerta" role="alert">
          <AlertTriangle size={18} strokeWidth={1.7} aria-hidden="true" />
          <div>
            <p><strong>{conflitos.length === 1 ? "Dois horários se sobrepõem" : `${conflitos.length} sobreposições`}</strong></p>
            <ul>
              {conflitos.map(([a, b]) => (
                <li key={a.id + b.id}>
                  {DIAS_LONGOS[a.dia]}: {a.nome} ({a.inicio}–{a.fim}) e {b.nome} ({b.inicio}–{b.fim})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {blocos.length === 0 ? (
        <Vazio texto="Sua semana ainda está vazia." acao="Adicionar horário" aoAgir={() => novo()} />
      ) : (
        <>
          {/* Celular: lista por dia */}
          <div className="horarios-lista">
            {DIAS.map((d) => (
              <section key={d} className="secao" id={`dia-${d}`}>
                <header>
                  <h2>{DIAS_LONGOS[d][0].toUpperCase() + DIAS_LONGOS[d].slice(1)} {d === hojeDia && <small>hoje</small>}</h2>
                  <button className="botao texto pequeno" onClick={() => novo(d)} aria-label={`Adicionar horário na ${DIAS_LONGOS[d]}`}>
                    <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </header>
                {doDia(d).length === 0 ? (
                  <p className="suave">Livre.</p>
                ) : (
                  <ul className="lista">
                    {doDia(d).map((b) => (
                      <li key={b.id}>
                        <button className="item item-corpo bloco-linha" style={{ width: "100%" }} onClick={() => setEditando(b)}>
                          <span className="num bloco-hora">{b.inicio}<br /><span className="suave">{b.fim}</span></span>
                          <span className={`bloco-cor tipo-${b.tipo}`} aria-hidden="true" />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className="item-titulo">{b.nome}</span>
                            <span className="item-meta">
                              <span>{TIPOS[b.tipo]}</span>
                              <span>{duracao(minutos(b.fim) - minutos(b.inicio))}</span>
                              {b.local && <span><MapPin size={12} strokeWidth={1.8} aria-hidden="true" style={{ verticalAlign: -1 }} /> {b.local}</span>}
                              {emConflito.has(b.id) && <span className="atraso">Sobreposto</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Desktop: grade semanal */}
          <div className="grade" aria-label="Grade semanal">
            <div className="grade-cab" />
            {DIAS.map((d) => (
              <div key={d} className={`grade-cab ${d === hojeDia ? "hoje" : ""}`}>{DIAS_CURTOS[d]}</div>
            ))}
            <div className="grade-horas" style={{ height: (h1 - h0) * 60 * PX }}>
              {Array.from({ length: h1 - h0 + 1 }, (_, i) => (
                <span key={i} className="num" style={{ top: i * 60 * PX }}>{String(h0 + i).padStart(2, "0")}h</span>
              ))}
            </div>
            {DIAS.map((d) => (
              <div key={d} className="grade-coluna" style={{ height: (h1 - h0) * 60 * PX, backgroundSize: `100% ${60 * PX}px` }}>
                {pistas(doDia(d)).map(({ b, pista, total }) => {
                  const top = (minutos(b.inicio) - h0 * 60) * PX;
                  const alt = Math.max(22, (minutos(b.fim) - minutos(b.inicio)) * PX);
                  return (
                    <button
                      key={b.id}
                      className={`grade-bloco tipo-${b.tipo} ${emConflito.has(b.id) ? "conflito" : ""}`}
                      style={{ top, height: alt, left: `${(pista / total) * 100}%`, width: `${100 / total}%` }}
                      onClick={() => setEditando(b)}
                      title={`${b.nome} · ${b.inicio}–${b.fim}${b.local ? " · " + b.local : ""}`}
                    >
                      <strong>{b.nome}</strong>
                      <span className="num">{b.inicio}–{b.fim}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="legenda" style={{ marginTop: 16 }}>
            {(Object.keys(TIPOS) as TipoBloco[]).map((t) => (
              <span key={t}><i className={`tipo-${t}`} />{TIPOS[t]}</span>
            ))}
          </div>
        </>
      )}

      {editando && (
        <BlocoForm bloco={editando === "novo" ? null : editando} diaInicial={diaNovo} aoFechar={() => setEditando(null)} />
      )}
    </>
  );
}

function BlocoForm({ bloco, diaInicial, aoFechar }: { bloco: Bloco | null; diaInicial: Dia | null; aoFechar: () => void }) {
  const grupo = bloco ? doGrupo("blocos", bloco.grupo) as Bloco[] : [];
  const [escopo, setEscopo] = useState<"um" | "todos">(grupo.length > 1 ? "todos" : "um");
  const [nome, setNome] = useState(bloco?.nome ?? "");
  const [tipo, setTipo] = useState<TipoBloco>(bloco?.tipo ?? "aula");
  const [inicio, setInicio] = useState(bloco?.inicio ?? "08:00");
  const [fim, setFim] = useState(bloco?.fim ?? "09:00");
  const [local, setLocal] = useState(bloco?.local ?? "");
  const [dias, setDias] = useState<Dia[]>(
    bloco ? grupo.map((b) => b.dia).sort() : diaInicial !== null ? [diaInicial] : [diaDaSemana(new Date())],
  );
  const [dia, setDia] = useState<Dia>(bloco?.dia ?? 0);
  const [erros, setErros] = useState<Record<string, string>>({});
  const multiplo = !bloco || escopo === "todos" || grupo.length <= 1;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!nome.trim()) er.nome = "Dê um nome ao horário.";
    if (!inicio) er.inicio = "Informe a hora de início.";
    if (!fim) er.fim = "Informe a hora de fim.";
    else if (inicio && fim <= inicio) er.fim = "A hora de fim precisa ser depois do início.";
    if (multiplo && dias.length === 0) er.dias = "Escolha pelo menos um dia.";
    setErros(er);
    if (Object.keys(er).length) return;
    const campos = { nome: nome.trim(), tipo, inicio, fim, local: local.trim() };
    if (!bloco) {
      criarRepetido("blocos", campos as never, dias);
      mostrarAviso(dias.length > 1 ? `Horário criado em ${dias.length} dias.` : "Horário criado.");
    } else if (multiplo) {
      const desfazer = editarGrupo("blocos", bloco.grupo, campos as never, dias);
      mostrarAviso(desfazer ? "Horário salvo. Os dias desmarcados foram excluídos." : "Horário salvo.", desfazer ?? undefined);
    } else {
      editarUm("blocos", bloco, campos as never, dia);
      mostrarAviso("Horário salvo só neste dia.");
    }
    aoFechar();
  };

  const apagar = async () => {
    if (!bloco) return;
    const todos = escopo === "todos" && grupo.length > 1;
    const ok = await excluirComDesfazer(
      {
        pergunta: todos ? `Excluir ${nome} de todos os ${grupo.length} dias?` : `Excluir ${nome} de ${DIAS_LONGOS[bloco.dia]}?`,
        detalhe: todos ? "O horário sai da semana inteira." : "Os outros dias repetidos continuam.",
        feito: "Horário excluído.",
      },
      () => excluir("blocos", todos ? grupo.map((b) => b.id) : bloco.id),
    );
    if (ok) aoFechar();
  };

  return (
    <Dialogo titulo={bloco ? "Editar horário" : "Novo horário"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        {bloco && <EscopoGrupo valor={escopo} aoMudar={setEscopo} total={grupo.length} />}
        <Campo rotulo="Nome" erro={erros.nome}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aula, Inglês, Trabalho" aria-invalid={!!erros.nome} />
        </Campo>
        <Campo rotulo="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoBloco)}>
            {(Object.keys(TIPOS) as TipoBloco[]).map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
          </select>
        </Campo>
        <div className="linha-campos">
          <Campo rotulo="Começa" erro={erros.inicio}>
            <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-invalid={!!erros.inicio} />
          </Campo>
          <Campo rotulo="Termina" erro={erros.fim}>
            <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} aria-invalid={!!erros.fim} />
          </Campo>
        </div>
        <Campo rotulo="Local (opcional)">
          <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Sala 12" />
        </Campo>
        {multiplo ? (
          <>
            <DiasRepetir valor={dias} aoMudar={setDias} rotulo={bloco ? "Dias da semana" : "Repetir em"} />
            {erros.dias && <p className="erro-campo" role="alert">{erros.dias}</p>}
            {!bloco && dias.length > 1 && <p className="suave" style={{ fontSize: 13 }}>Cria o mesmo horário em {dias.length} dias. Depois dá para mudar um dia só.</p>}
          </>
        ) : (
          <Campo rotulo="Dia">
            <select value={dia} onChange={(e) => setDia(Number(e.target.value) as Dia)}>
              {DIAS.map((d) => <option key={d} value={d}>{DIAS_LONGOS[d]}</option>)}
            </select>
          </Campo>
        )}
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          {bloco ? <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Excluir</button> : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">{bloco ? "Salvar horário" : "Criar horário"}</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}
