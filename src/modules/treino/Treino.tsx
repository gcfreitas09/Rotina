import { useMemo, useState } from "react";
import { formatarReps, lerReps } from "./reps.ts";
import { Pencil, Play, Plus, Trash2, X } from "../../components/icones.tsx";
import type { Dia, Exercicio, Ficha, Sessao } from "../../data/types.ts";
import { resumoProgresso, type Tendencia, type TipoTendencia } from "./progresso.ts";
import { excluir, salvar, salvarVarios, useColecao } from "../../data/store.ts";
import { DIAS, DIAS_CURTOS, DIAS_LONGOS, br, brCurta, diaDaSemana, hoje } from "../../data/datas.ts";
import { lerNumero, novoId, num } from "../../data/formato.ts";
import { Campo, DiasRepetir, Dialogo, Vazio, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import { navegar } from "../../rota.ts";
import GraficoLinha from "./GraficoLinha.tsx";

export function fichaDoDia(fichas: Ficha[], dia: Dia): Ficha | undefined {
  return fichas.find((f) => f.dias.includes(dia));
}

/** Um dia só pode ter uma ficha: ao dar os dias a uma, tira das outras. */
function atribuirDias(fichas: Ficha[], alvo: Ficha, dias: Dia[]) {
  const outras = fichas
    .filter((f) => f.id !== alvo.id && f.dias.some((d) => dias.includes(d)))
    .map((f) => ({ ...f, dias: f.dias.filter((d) => !dias.includes(d)) }));
  salvarVarios("fichas", [...outras, { ...alvo, dias: [...dias].sort() as Dia[] }]);
}

export default function Treino() {
  const fichas = useColecao("fichas");
  const sessoes = useColecao("sessoes");
  const pesos = useColecao("pesos");
  const [editando, setEditando] = useState<Ficha | "nova" | null>(null);
  const h = hoje();
  const daVez = fichaDoDia(fichas, diaDaSemana(h));
  const sessaoHoje = sessoes.find((s) => s.data === h && s.fichaId === daVez?.id);


  return (
    <>
      <div className="grade-tela grade-treino">
      <div className="col-principal">
      <section className="secao">
        <header>
          <h2>Treino de hoje</h2>
          <span className="suave">{DIAS_LONGOS[diaDaSemana(h)]}</span>
        </header>
        {daVez ? (
          <div className="treino-hoje">
            <div>
              <p className="grande" style={{ fontFamily: "var(--f-titulo)", letterSpacing: "-0.03em" }}>{daVez.nome}</p>
              <p className="suave">{daVez.exercicios.length} exercícios · {daVez.exercicios.reduce((t, e) => t + e.series, 0)} séries{sessaoHoje?.concluida && " · feito hoje"}</p>
            </div>
            <button className="botao primario" onClick={() => navegar("saude/treino/agora")}>
              <Play size={16} strokeWidth={1.8} aria-hidden="true" /> {sessaoHoje && !sessaoHoje.concluida ? "Continuar treino" : sessaoHoje?.concluida ? "Ver treino" : "Iniciar treino"}
            </button>
          </div>
        ) : (
          <>
            <p className="suave">Dia de descanso na sua divisão.{fichas.length > 0 && " Se quiser treinar mesmo assim, escolha a ficha:"}</p>
            {fichas.length > 0 && (
              <div className="acoes" style={{ justifyContent: "flex-start", marginTop: 10 }}>
                {fichas.map((f) => (
                  <button key={f.id} className="botao" onClick={() => navegar(`saude/treino/agora/${f.id}`)}><Play size={16} strokeWidth={1.8} aria-hidden="true" /> Iniciar {f.nome}</button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="secao">
        <header>
          <h2>Fichas</h2>
          <button className="botao pequeno" onClick={() => setEditando("nova")}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Ficha</button>
        </header>
        {fichas.length === 0 ? (
          <Vazio texto="Nenhuma ficha de treino." acao="Criar ficha" aoAgir={() => setEditando("nova")} />
        ) : (
          <ul className="lista">
            {fichas.map((f) => (
              <li key={f.id} className="ficha">
                {/* botões no cabeçalho: a tabela usa a largura toda (antes eles ocupavam uma coluna e a tabela ficava espremida) */}
                <div className="ficha-cab">
                  <div>
                    <p className="item-titulo" style={{ fontFamily: "var(--f-titulo)", fontSize: 19 }}>{f.nome}</p>
                    <p className="item-meta">{f.dias.length ? f.dias.map((d) => DIAS_CURTOS[d]).join(", ") : "Sem dia na semana"} · {f.exercicios.length} exercícios</p>
                  </div>
                  <div className="ficha-acoes">
                    <button className="botao pequeno" onClick={() => navegar(`saude/treino/agora/${f.id}`)} aria-label={`Iniciar treino ${f.nome}`}><Play size={15} strokeWidth={1.8} aria-hidden="true" /> Iniciar</button>
                    <button className="icone-btn" onClick={() => setEditando(f)} aria-label={`Editar ficha ${f.nome}`}><Pencil size={17} strokeWidth={1.6} /></button>
                  </div>
                </div>
                <table className="tabela tabela-ficha">
                  <tbody>
                    {f.exercicios.map((e) => (
                      <tr key={e.id}>
                        <td>{e.nome}</td>
                        <td className="num">{e.series}×{formatarReps(e)}</td>
                        <td className="num">{e.carga ? `${num(e.carga)} kg` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="secao">
        <header><h2>Progresso</h2></header>
        <Progresso sessoes={sessoes} />
      </section>
      </div>
      <div className="col-lateral">
      <section className="secao">
        <header><h2>Divisão da semana</h2></header>
        <ul className="lista">
          {DIAS.map((d) => {
            const f = fichaDoDia(fichas, d);
            return (
              <li key={d} className="item" style={{ gap: 12 }}>
                <label htmlFor={`div-${d}`} style={{ flex: 1, fontWeight: 550 }}>{DIAS_LONGOS[d][0].toUpperCase() + DIAS_LONGOS[d].slice(1)}</label>
                <select
                  id={`div-${d}`}
                  className="entrada"
                  style={{ width: "auto", minWidth: 150 }}
                  value={f?.id ?? ""}
                  onChange={(e) => {
                    const nova = fichas.find((x) => x.id === e.target.value);
                    if (nova) atribuirDias(fichas, nova, [...nova.dias, d]);
                    else if (f) salvar("fichas", { ...f, dias: f.dias.filter((x) => x !== d) });
                  }}
                >
                  <option value="">Descanso</option>
                  {fichas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      </section>

      <PesoCorporal pesos={pesos} />
      </div>
      </div>

      {editando && <FichaForm ficha={editando === "nova" ? null : editando} fichas={fichas} aoFechar={() => setEditando(null)} />}
    </>
  );
}

function PesoCorporal({ pesos }: { pesos: { id: string; data: string; kg: number }[] }) {
  const [kg, setKg] = useState("");
  const [data, setData] = useState(hoje());
  const [erro, setErro] = useState<string | null>(null);
  const ordenados = [...pesos].sort((a, b) => a.data.localeCompare(b.data));
  const registrar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = lerNumero(kg);
    if (v === null || Number.isNaN(v) || v < 20 || v > 300) return setErro("Digite o peso em kg, como 68,5.");
    const existente = pesos.find((p) => p.data === data);
    salvar("pesos", { id: existente?.id ?? novoId("p"), data, kg: v });
    setKg("");
    setErro(null);
    mostrarAviso(`Peso de ${br(data)} registrado.`);
  };
  return (
    <section className="secao">
      <header>
        <h2>Peso corporal <small>opcional</small></h2>
        {ordenados.length > 0 && <span className="medio">{num(ordenados[ordenados.length - 1].kg)}<span className="unidade"> kg</span></span>}
      </header>
      <form className="peso-form" onSubmit={registrar} noValidate>
        <Campo rotulo="Peso (kg)" erro={erro}>
          <input className="num" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="68,5" aria-invalid={!!erro} />
        </Campo>
        <Campo rotulo="Data">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} max={hoje()} />
        </Campo>
        <button className="botao primario">Registrar peso</button>
      </form>
      {ordenados.length > 1 && <GraficoLinha pontos={ordenados.map((p) => ({ data: p.data, valor: p.kg }))} unidade="kg" rotulo="Peso corporal" />}
      {ordenados.length > 0 && (
        <ul className="lista" style={{ marginTop: 12 }}>
          {ordenados.slice(-5).reverse().map((p) => (
            <li key={p.id} className="item" style={{ minHeight: 44 }}>
              <span style={{ flex: 1 }} className="num">{brCurta(p.data)}</span>
              <span className="num" style={{ marginRight: 8 }}>{num(p.kg)} kg</span>
              <button
                className="icone-btn"
                aria-label={`Excluir peso de ${br(p.data)}`}
                onClick={() => excluirComDesfazer(
                  { pergunta: "Excluir este registro de peso?", detalhe: `${num(p.kg)} kg em ${br(p.data)}.`, feito: "Registro de peso excluído." },
                  () => excluir("pesos", p.id),
                )}
              >
                <Trash2 size={16} strokeWidth={1.6} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type ExTexto = { id: string; nome: string; series: string; reps: string; carga: string };

function FichaForm({ ficha, fichas, aoFechar }: { ficha: Ficha | null; fichas: Ficha[]; aoFechar: () => void }) {
  const [nome, setNome] = useState(ficha?.nome ?? "");
  const [dias, setDias] = useState<Dia[]>(ficha?.dias ?? []);
  const [exs, setExs] = useState<ExTexto[]>(
    ficha?.exercicios.map((e) => ({ id: e.id, nome: e.nome, series: String(e.series), reps: formatarReps(e).replace("–", "-"), carga: num(e.carga) })) ??
      [{ id: novoId("e"), nome: "", series: "3", reps: "10", carga: "" }],
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const mudar = (id: string, p: Partial<ExTexto>) => setExs(exs.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const tomados = dias.filter((d) => fichas.some((f) => f.id !== ficha?.id && f.dias.includes(d)));

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!nome.trim()) er.nome = "Dê um nome à ficha, como Push ou Treino A.";
    const lista: Exercicio[] = [];
    for (const x of exs) {
      if (!x.nome.trim() && !x.carga) continue;
      const series = Number(x.series), reps = lerReps(x.reps), carga = lerNumero(x.carga) ?? 0;
      if (!x.nome.trim()) er["e" + x.id] = "Dê um nome ao exercício.";
      else if (!Number.isInteger(series) || series < 1 || series > 20) er["e" + x.id] = "Séries: um número inteiro de 1 a 20.";
      else if (!reps) er["e" + x.id] = "Repetições: um número (10) ou uma faixa (8-10), de 1 a 100.";
      else if (Number.isNaN(carga) || carga < 0) er["e" + x.id] = "Carga: use um número em kg, como 22,5.";
      if (reps) lista.push({ id: x.id, nome: x.nome.trim(), series, ...reps, carga });
    }
    if (!lista.length && !er.nome) er.exs = "Adicione pelo menos um exercício.";
    setErros(er);
    if (Object.keys(er).length) return;
    const nova: Ficha = { id: ficha?.id ?? novoId("f"), _m: 0, nome: nome.trim(), dias: [], exercicios: lista };
    atribuirDias(fichas, nova, dias);
    mostrarAviso(ficha ? "Ficha salva." : "Ficha criada.");
    aoFechar();
  };

  const apagar = async () => {
    if (!ficha) return;
    const ok = await excluirComDesfazer(
      { pergunta: `Excluir a ficha ${ficha.nome}?`, detalhe: "O histórico dos treinos feitos com ela continua.", feito: "Ficha excluída." },
      () => excluir("fichas", ficha.id),
    );
    if (ok) aoFechar();
  };

  return (
    <Dialogo titulo={ficha ? "Editar ficha" : "Nova ficha"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Nome" erro={erros.nome}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Push" aria-invalid={!!erros.nome} />
        </Campo>
        <DiasRepetir valor={dias} aoMudar={setDias} rotulo="Repetir esta ficha em" />
        {tomados.length > 0 && (
          <p className="suave" style={{ fontSize: 13 }}>
            {tomados.map((d) => DIAS_CURTOS[d]).join(", ")} já {tomados.length > 1 ? "têm" : "tem"} outra ficha — ao salvar, passa{tomados.length > 1 ? "m" : ""} para esta.
          </p>
        )}
        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Exercícios</span>
          <div className="exercicio-form exercicio-cab suave" aria-hidden="true"><span>Exercício</span><span>Séries</span><span>Reps</span><span>kg</span><span /></div>
          {exs.map((x) => (
            <div key={x.id} className="exercicio-form">
              <input className="entrada" value={x.nome} onChange={(e) => mudar(x.id, { nome: e.target.value })} placeholder="Exercício" aria-label="Exercício" aria-invalid={!!erros["e" + x.id]} />
              <input className="entrada num" inputMode="numeric" value={x.series} onChange={(e) => mudar(x.id, { series: e.target.value })} aria-label="Séries" />
              <input className="entrada num" value={x.reps} onChange={(e) => mudar(x.id, { reps: e.target.value })} placeholder="8-10" aria-label="Repetições (número ou faixa, como 8-10)" />
              <input className="entrada num" inputMode="decimal" value={x.carga} onChange={(e) => mudar(x.id, { carga: e.target.value })} placeholder="0" aria-label="Carga em kg" />
              <button type="button" className="icone-btn" onClick={() => setExs(exs.filter((y) => y.id !== x.id))} aria-label={`Remover ${x.nome || "exercício"}`}><X size={16} strokeWidth={1.6} /></button>
              {erros["e" + x.id] && <p className="erro-campo" role="alert" style={{ gridColumn: "1 / -1" }}>{erros["e" + x.id]}</p>}
            </div>
          ))}
          {erros.exs && <p className="erro-campo" role="alert">{erros.exs}</p>}
          <button type="button" className="botao pequeno" style={{ justifySelf: "start" }} onClick={() => setExs([...exs, { id: novoId("e"), nome: "", series: "3", reps: "10", carga: "" }])}>
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Exercício
          </button>
        </fieldset>
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          {ficha ? <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Excluir</button> : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">{ficha ? "Salvar ficha" : "Criar ficha"}</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

const ROTULO_TEND: Record<TipoTendencia, string> = { subindo: "Subindo ↑", estavel: "Estável", caindo: "Caiu ↓", inicio: "Começo" };

function textoTendencia(t: Tendencia): string {
  if (t.tipo === "inicio") return `1º registro em ${brCurta(t.desde)}`;
  if (t.tipo === "subindo") return t.variacao > 0 ? `+${num(t.variacao)} kg desde ${brCurta(t.desde)}` : "mais repetições com o mesmo peso";
  if (t.tipo === "caindo") return `abaixo do recorde (${num(t.recorde.melhor.carga)} kg × ${t.recorde.melhor.reps})`;
  return t.mesmaCargaHa >= 3 ? `mesma carga há ${t.mesmaCargaHa} treinos: hora de subir?` : "no mesmo nível dos últimos treinos";
}

/** Cada exercício treinado: última melhor série, tendência (subindo/estável/caiu) e, ao tocar, gráfico + histórico. */
function Progresso({ sessoes }: { sessoes: Sessao[] }) {
  const lista = useMemo(() => resumoProgresso(sessoes), [sessoes]);
  const [aberto, setAberto] = useState<string | null>(null);
  if (!lista.length) {
    return <p className="suave">Conclua séries no <b>Iniciar treino</b>: cada uma fica salva aqui com o peso e as repetições, e você vê se está evoluindo em cada exercício.</p>;
  }
  return (
    <>
      <p className="suave" style={{ fontSize: 13.5, marginTop: 0 }}>Toda série concluída fica salva. Toque num exercício para ver o gráfico e o histórico.</p>
      <ul className="progresso">
        {lista.map((p) => {
          const ult = p.hist[p.hist.length - 1];
          const t = p.tendencia;
          const ab = aberto === p.nome;
          return (
            <li key={p.nome} className={`prog ${ab ? "aberto" : ""}`}>
              <button type="button" className="prog-linha" aria-expanded={ab} onClick={() => setAberto(ab ? null : p.nome)}>
                <span className="prog-nome">{p.nome}</span>
                <span className={`selo-tend tend-${t.tipo}`}>{ROTULO_TEND[t.tipo]}</span>
                <span className="prog-texto">{textoTendencia(t)}</span>
                <span className="prog-ult num">{num(ult.melhor.carga)} kg × {ult.melhor.reps}</span>
              </button>
              {ab && (
                <div className="prog-detalhe">
                  <GraficoLinha pontos={p.hist.map((d) => ({ data: d.data, valor: d.melhor.carga }))} unidade="kg" rotulo={`Peso da melhor série em ${p.nome}`} />
                  <p className="prog-recorde">
                    Recorde: <b className="num">{num(t.recorde.melhor.carga)} kg × {t.recorde.melhor.reps}</b> em {brCurta(t.recorde.data)} · {p.hist.length} {p.hist.length === 1 ? "treino" : "treinos"}
                  </p>
                  <ul className="prog-hist">
                    {[...p.hist].reverse().slice(0, 10).map((d) => (
                      <li key={d.data}>
                        <span className="num prog-data">{brCurta(d.data)}</span>
                        <span className="num prog-series">{d.series.map((x, i) => <span key={i} className={x === d.melhor ? "melhor" : ""}>{num(x.carga)}×{x.reps}</span>)}</span>
                        <span className="num suave prog-vol">{num(Math.round(d.volume), 0)} kg</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
