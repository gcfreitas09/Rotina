import { useEffect, useState } from "react";
import { Minus, Pencil, Plus, Trash2 } from "../../components/icones.tsx";
import type { Alimento, Dia, DiaDieta, Refeicao, TipoRefeicao } from "../../data/types.ts";
import { excluir, salvar, useColecao, useConfig } from "../../data/store.ts";
import { DIAS, DIAS_CURTOS, DIAS_LONGOS, brCurta, diaDaSemana, hoje, somarDias } from "../../data/datas.ts";
import { litros, num } from "../../data/formato.ts";
import { alternarAlimentoNoDia, alternarRefeicaoNoDia, comeu, estadoRefeicao, resumoDia, type ResumoDia } from "./diario.ts";
import { Campo, DiasRepetir, Dialogo, EscopoGrupo, Vazio, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import Copo from "../../components/Copo.tsx";
import LinhaAlimento, { linhaVazia, paraAlimento, paraTexto, recalcular, useTabelaTaco, type AlimentoTexto } from "./LinhaAlimento.tsx";
import { Conta, pulso } from "../../components/movimento.tsx";
import { criarRepetido, doGrupo, editarGrupo, editarUm } from "../../data/grupos.ts";

export const TIPOS_REFEICAO: Record<TipoRefeicao, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  janta: "Janta",
  pre: "Pré-treino",
  pos: "Pós-treino",
  outra: "Outra",
};

export function refeicoesDoDia(refeicoes: Refeicao[], dia: Dia): Refeicao[] {
  return refeicoes.filter((r) => r.dia === dia).sort((a, b) => a.horario.localeCompare(b.horario));
}

export function registroDoDia(dias: DiaDieta[], data: string): DiaDieta {
  return dias.find((d) => d.id === data) ?? { id: data, _m: 0, feitas: [], aguaMl: 0 };
}

export function totais(refs: Refeicao[]) {
  let kcal = 0, proteina = 0, temKcal = false, temProt = false;
  for (const r of refs)
    for (const a of r.alimentos) {
      if (a.kcal !== null) { kcal += a.kcal; temKcal = true; }
      if (a.proteina !== null) { proteina += a.proteina; temProt = true; }
    }
  return { kcal: temKcal ? kcal : null, proteina: temProt ? proteina : null };
}

export function somarAgua(data: string, ml: number, registros: DiaDieta[]) {
  const r = registroDoDia(registros, data);
  salvar("diasDieta", { ...r, aguaMl: Math.max(0, r.aguaMl + ml), _x: false });
}

export function alternarRefeicao(data: string, refId: string, registros: DiaDieta[]) {
  salvar("diasDieta", { ...alternarRefeicaoNoDia(registroDoDia(registros, data), refId), _x: false });
}

export function alternarAlimento(data: string, r: Refeicao, alimentoId: string, registros: DiaDieta[]) {
  salvar("diasDieta", { ...alternarAlimentoNoDia(registroDoDia(registros, data), r, alimentoId), _x: false });
}

const kcalProt = (a: { kcal: number | null; proteina: number | null }) =>
  [a.kcal !== null && `${num(a.kcal, 0)} kcal`, a.proteina !== null && `${num(a.proteina, a.proteina < 10 ? 1 : 0)} g prot.`].filter(Boolean).join(" · ");

/** Fim do dia: quanto do plano foi seguido, o que foi comido (do plano + fora) e a proteína. */
function ResumoHoje({ s }: { s: ResumoDia }) {
  const pct = s.seguido === null ? null : Math.round(s.seguido * 100);
  return (
    <div className="numeros numeros-3 resumo-dieta" aria-label="Resumo de hoje">
      <div>
        <span className="n-rot">Seguido</span>
        <span className="n-val">{pct === null ? "—" : <><Conta className="num" valor={pct} formatar={(v) => String(Math.round(v))} /><span className="unidade">%</span></>}</span>
        <small>{s.itensTotal ? `${s.itensComidos} de ${s.itensTotal} alimentos` : "sem plano hoje"}</small>
        {pct !== null && <span className="mini-regua" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>}
      </div>
      <div>
        <span className="n-rot">Comido hoje</span>
        <span className="n-val"><Conta className="num" valor={s.total.kcal} formatar={(v) => num(Math.round(v), 0)} /><span className="unidade"> kcal</span></span>
        <small>plano {num(s.doPlano.kcal, 0)} · fora {num(s.fora.kcal, 0)}</small>
      </div>
      <div>
        <span className="n-rot">Proteína</span>
        <span className="n-val"><Conta className="num" valor={s.total.proteina} formatar={(v) => num(Math.round(v), 0)} /><span className="unidade"> g</span></span>
        <small>meta do plano {num(s.plano.proteina, 0)} g</small>
      </div>
    </div>
  );
}

export default function Dieta() {
  const refeicoes = useColecao("refeicoes");
  const registros = useColecao("diasDieta");
  const cfg = useConfig();
  const h = hoje();
  const diaHoje = diaDaSemana(h);
  const [dia, setDia] = useState<Dia>(diaHoje);
  const [editando, setEditando] = useState<Refeicao | "nova" | null>(null);

  const doDia = refeicoesDoDia(refeicoes, dia);
  const reg = registroDoDia(registros, h);
  const ehHoje = dia === diaHoje;
  const plano = totais(doDia);
  const resumo = resumoDia(reg, refeicoesDoDia(refeicoes, diaHoje));
  const [foraAberto, setForaAberto] = useState(false);
  const extras = reg.extras ?? [];
  const tirarExtra = (id: string) =>
    excluirComDesfazer({ pergunta: "Tirar este alimento do dia?", detalhe: extras.find((x) => x.id === id)?.nome ?? "", feito: "Alimento tirado do dia." }, () => {
      const antes = registroDoDia(registros, h);
      salvar("diasDieta", { ...antes, extras: (antes.extras ?? []).filter((x) => x.id !== id), _x: false });
      return () => salvar("diasDieta", { ...antes, _x: false });
    });

  return (
    <>
      <div className="grade-tela grade-dieta">
      <div className="col-lateral">
      <section className="secao agua">
        <header>
          <h2>Água hoje</h2>
          <span className="suave num">meta {litros(cfg.metaAguaMl)} L</span>
        </header>
        <div className="agua-corpo">
          <Copo ml={reg.aguaMl} meta={cfg.metaAguaMl} />
          <div>
            <p className="grande"><Conta valor={reg.aguaMl / 1000} formatar={(v) => litros(v * 1000)} /><span className="unidade"> L</span></p>
            <p className="suave" style={{ marginTop: 6 }}><span className="num">{Math.round((reg.aguaMl / cfg.metaAguaMl) * 100)}%</span> da meta{reg.aguaMl >= cfg.metaAguaMl && " — meta batida"}</p>
          </div>
        </div>
        <div className="acoes" style={{ justifyContent: "flex-start", marginTop: 16 }}>
          <button className="botao primario" onClick={() => somarAgua(h, 250, registros)}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> 250 ml</button>
          <button className="botao primario" onClick={() => somarAgua(h, 500, registros)}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> 500 ml</button>
          <button className="botao" onClick={() => somarAgua(h, -250, registros)} disabled={reg.aguaMl === 0} aria-label="Tirar 250 ml">
            <Minus size={16} strokeWidth={1.8} aria-hidden="true" /> 250 ml
          </button>
        </div>
      </section>

      <section className="secao">
        <header><h2>Últimos 7 dias</h2></header>
        <table className="tabela">
          <thead>
            <tr><th>Dia</th><th>Plano</th><th>Água</th><th>kcal</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, i) => somarDias(h, -i)).map((data) => {
              const rg = registroDoDia(registros, data);
              const plan = refeicoesDoDia(refeicoes, diaDaSemana(data));
              const rs = resumoDia(rg, plan);
              const k = rs.total.kcal || null;
              return (
                <tr key={data}>
                  <td>{DIAS_CURTOS[diaDaSemana(data)]} <span className="suave num">{brCurta(data)}</span></td>
                  <td className="num">{rs.seguido === null ? "—" : `${Math.round(rs.seguido * 100)}%`}</td>
                  <td className={`num ${rg.aguaMl >= cfg.metaAguaMl ? "" : "suave"}`}>{litros(rg.aguaMl)} L</td>
                  <td className="num">{k === null ? "—" : num(k, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      </div>
      <div className="col-principal">
      <section className="secao">
        <header>
          <h2>Plano alimentar</h2>
          <button className="botao pequeno" onClick={() => setEditando("nova")}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Refeição</button>
        </header>
        <div className="dias dias-seletor" role="group" aria-label="Dia do plano">
          {DIAS.map((d) => (
            <button key={d} aria-pressed={dia === d} onClick={() => setDia(d)} aria-label={DIAS_LONGOS[d]}>
              {DIAS_CURTOS[d]}
            </button>
          ))}
        </div>
        <p className="suave" style={{ margin: "12px 0 10px", fontSize: 13.5 }}>
          {ehHoje ? "Hoje — marque cada alimento que comer." : `Plano de ${DIAS_LONGOS[dia]}.`}
          {plano.kcal !== null && <> Plano: <span className="num">{num(plano.kcal, 0)}</span> kcal</>}
          {plano.proteina !== null && <> · <span className="num">{num(plano.proteina, 0)}</span> g de proteína</>}
        </p>
        {ehHoje && <ResumoHoje s={resumo} />}
        {doDia.length === 0 ? (
          <Vazio texto={`Nenhuma refeição em ${DIAS_LONGOS[dia]}.`} acao="Adicionar refeição" aoAgir={() => setEditando("nova")} />
        ) : (
          <ul className="lista">
            {doDia.map((r) => {
              const estado = ehHoje ? estadoRefeicao(reg, r) : "nada";
              const t = totais([r]);
              return (
                <li key={r.id}>
                  <div className={`item ${estado === "toda" ? "feito" : ""}`} style={{ alignItems: "flex-start" }}>
                    {ehHoje ? (
                      <input
                        type="checkbox"
                        className="check"
                        checked={estado === "toda"}
                        ref={(el) => { if (el) el.indeterminate = estado === "parte"; }}
                        onChange={(e) => { pulso(e.currentTarget); alternarRefeicao(h, r.id, registros); }}
                        aria-label={`Marcar ${r.nome} inteira como comida`}
                      />
                    ) : <span className="num suave" style={{ width: 44, paddingTop: 12, fontSize: 13 }}>{r.horario}</span>}
                    <div className="item-corpo" style={{ paddingTop: 10 }}>
                      <p className="item-titulo">{r.nome} {ehHoje && <span className="num suave" style={{ fontWeight: 400, fontSize: 13 }}>{r.horario}</span>}</p>
                      {ehHoje && r.alimentos.length > 0 ? (
                        <ul className="alimentos alimentos-check">
                          {r.alimentos.map((a) => {
                            const ok = comeu(reg, r, a.id);
                            return (
                              <li key={a.id} className={ok ? "comido" : ""}>
                                <label>
                                  <input type="checkbox" className="check check-pequeno" checked={ok} onChange={(e) => { pulso(e.currentTarget); alternarAlimento(h, r, a.id, registros); }} />
                                  <span className="alimento-txt"><span>{a.nome}</span> <span className="suave">{a.quantidade}</span></span>
                                  {a.kcal !== null && <span className="num suave alimento-kcal">{num(a.kcal, 0)}</span>}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <ul className="alimentos">
                          {r.alimentos.map((a) => (
                            <li key={a.id}><span>{a.nome}</span> <span className="suave">{a.quantidade}</span></li>
                          ))}
                        </ul>
                      )}
                      {(t.kcal !== null || t.proteina !== null) && <p className="item-meta num">{kcalProt(t)}</p>}
                    </div>
                    <button className="icone-btn" onClick={() => setEditando(r)} aria-label={`Editar ${r.nome}`}><Pencil size={17} strokeWidth={1.6} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {ehHoje && (
        <section className="secao fora-plano">
          <header>
            <h2>Fora do plano {extras.length > 0 && <small className="num">{num(resumo.fora.kcal, 0)} kcal</small>}</h2>
            <button className="botao pequeno" onClick={() => setForaAberto(true)}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Comi fora do plano</button>
          </header>
          {extras.length === 0 ? (
            <p className="suave" style={{ fontSize: 13.5 }}>Comeu algo que não estava no plano? Anote aqui, que as calorias e a proteína entram no total do dia.</p>
          ) : (
            <ul className="lista">
              {extras.map((x) => (
                <li key={x.id}>
                  <div className="item">
                    <div className="item-corpo">
                      <p className="item-titulo">{x.nome} <span className="suave" style={{ fontWeight: 400 }}>{x.quantidade}</span></p>
                      {(x.kcal !== null || x.proteina !== null) && <p className="item-meta num">{kcalProt(x)}</p>}
                    </div>
                    <button className="icone-btn" onClick={() => tirarExtra(x.id)} aria-label={`Tirar ${x.nome} do dia`}><Trash2 size={17} strokeWidth={1.6} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      </div>
      </div>

      {foraAberto && <ForaForm data={h} aoFechar={() => setForaAberto(false)} />}
      {editando && <RefeicaoForm r={editando === "nova" ? null : editando} diaInicial={dia} aoFechar={() => setEditando(null)} />}
    </>
  );
}

/** "Comi fora do plano": um ou mais alimentos com cálculo automático, somados ao dia. */
function ForaForm({ data, aoFechar }: { data: string; aoFechar: () => void }) {
  const registros = useColecao("diasDieta");
  const tabela = useTabelaTaco();
  const [linhas, setLinhas] = useState<AlimentoTexto[]>(() => [linhaVazia()]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const trocar = (novo: AlimentoTexto) => setLinhas((l) => l.map((a) => (a.id === novo.id ? novo : a)));
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    const lista: Alimento[] = [];
    for (const a of linhas) {
      const c = paraAlimento(a);
      if (c.erro) er["a" + a.id] = c.erro;
      else if (c.alimento) lista.push(c.alimento);
    }
    if (!lista.length && !Object.keys(er).length) er["a" + linhas[0].id] = "Escreva o que você comeu.";
    setErros(er);
    if (Object.keys(er).length) return;
    const r = registroDoDia(registros, data);
    salvar("diasDieta", { ...r, extras: [...(r.extras ?? []), ...lista], _x: false });
    mostrarAviso(lista.length > 1 ? `${lista.length} alimentos anotados no dia.` : `${lista[0].nome} anotado no dia.`);
    aoFechar();
  };
  return (
    <Dialogo titulo="Comi fora do plano" aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>O que você comeu <span style={{ fontWeight: 400 }}>— kcal e proteína são calculadas sozinhas</span></span>
          {linhas.map((a) => (
            <LinhaAlimento key={a.id} a={a} tabela={tabela} erro={erros["a" + a.id]} aoMudar={trocar} aoRemover={() => setLinhas((l) => (l.length > 1 ? l.filter((x) => x.id !== a.id) : [linhaVazia()]))} />
          ))}
          <button type="button" className="botao pequeno" style={{ justifySelf: "start" }} onClick={() => setLinhas((l) => [...l, linhaVazia()])}>
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Outro alimento
          </button>
        </fieldset>
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario">Anotar no dia</button>
        </div>
      </form>
    </Dialogo>
  );
}

function RefeicaoForm({ r, diaInicial, aoFechar }: { r: Refeicao | null; diaInicial: Dia; aoFechar: () => void }) {
  const grupo = r ? (doGrupo("refeicoes", r.grupo) as Refeicao[]) : [];
  const [escopo, setEscopo] = useState<"um" | "todos">(grupo.length > 1 ? "todos" : "um");
  const [tipo, setTipo] = useState<TipoRefeicao>(r?.tipo ?? "lanche");
  const [nome, setNome] = useState(r?.nome ?? TIPOS_REFEICAO.lanche);
  const [horario, setHorario] = useState(r?.horario ?? "16:00");
  const [alimentos, setAlimentos] = useState<AlimentoTexto[]>(
    (r?.alimentos ?? []).map(paraTexto),
  );
  const [dias, setDias] = useState<Dia[]>(r ? grupo.map((x) => x.dia).sort() : [diaInicial]);
  const [dia, setDia] = useState<Dia>(r?.dia ?? diaInicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const multiplo = !r || escopo === "todos" || grupo.length <= 1;

  const tabela = useTabelaTaco();
  // A tabela chega depois que o formulário abre: calcula o que já foi digitado sem valores à mão.
  useEffect(() => {
    if (tabela) setAlimentos((lista) => lista.map((x) => (x.kcal || x.proteina ? x : recalcular(x, tabela))));
  }, [tabela]);
  const trocarAlimento = (novo: AlimentoTexto) => setAlimentos((lista) => lista.map((a) => (a.id === novo.id ? novo : a)));
  const novoAlimento = () => setAlimentos([...alimentos, linhaVazia()]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!nome.trim()) er.nome = "Dê um nome à refeição.";
    if (!horario) er.horario = "Informe o horário.";
    if (multiplo && dias.length === 0) er.dias = "Escolha pelo menos um dia.";
    const lista: Alimento[] = [];
    alimentos.forEach((a) => {
      const c = paraAlimento(a);
      if (c.erro) er["a" + a.id] = c.erro;
      else if (c.alimento) lista.push(c.alimento);
    });
    setErros(er);
    if (Object.keys(er).length) return;
    const campos = { nome: nome.trim(), tipo, horario, alimentos: lista };
    if (!r) {
      criarRepetido("refeicoes", campos as never, dias);
      mostrarAviso(dias.length > 1 ? `Refeição criada em ${dias.length} dias.` : "Refeição criada.");
    } else if (multiplo) {
      const desfazer = editarGrupo("refeicoes", r.grupo, campos as never, dias);
      mostrarAviso(desfazer ? "Refeição salva. Os dias desmarcados foram excluídos." : "Refeição salva.", desfazer ?? undefined);
    } else {
      editarUm("refeicoes", r, campos as never, dia);
      mostrarAviso("Refeição salva só neste dia.");
    }
    aoFechar();
  };

  const apagar = async () => {
    if (!r) return;
    const todos = escopo === "todos" && grupo.length > 1;
    const ok = await excluirComDesfazer(
      {
        pergunta: todos ? `Excluir ${r.nome} de todos os ${grupo.length} dias?` : `Excluir ${r.nome} de ${DIAS_LONGOS[r.dia]}?`,
        detalhe: todos ? "A refeição sai do plano da semana inteira." : "Os outros dias continuam com ela.",
        feito: "Refeição excluída.",
      },
      () => excluir("refeicoes", todos ? grupo.map((x) => x.id) : r.id),
    );
    if (ok) aoFechar();
  };

  return (
    <Dialogo titulo={r ? "Editar refeição" : "Nova refeição"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        {r && <EscopoGrupo valor={escopo} aoMudar={setEscopo} total={grupo.length} />}
        <div className="linha-campos">
          <Campo rotulo="Tipo">
            <select
              value={tipo}
              onChange={(e) => {
                const t = e.target.value as TipoRefeicao;
                if (nome === TIPOS_REFEICAO[tipo] || !nome) setNome(TIPOS_REFEICAO[t]);
                setTipo(t);
              }}
            >
              {(Object.keys(TIPOS_REFEICAO) as TipoRefeicao[]).map((t) => <option key={t} value={t}>{TIPOS_REFEICAO[t]}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Horário" erro={erros.horario}>
            <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} aria-invalid={!!erros.horario} />
          </Campo>
        </div>
        <Campo rotulo="Nome" erro={erros.nome}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={!!erros.nome} />
        </Campo>

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Alimentos <span style={{ fontWeight: 400 }}>— kcal e proteína são calculadas sozinhas</span></span>
          {alimentos.map((a) => (
            <LinhaAlimento key={a.id} a={a} tabela={tabela} erro={erros["a" + a.id]} aoMudar={trocarAlimento} aoRemover={() => setAlimentos(alimentos.filter((x) => x.id !== a.id))} />
          ))}
          <button type="button" className="botao pequeno" style={{ justifySelf: "start" }} onClick={novoAlimento}>
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Alimento
          </button>
        </fieldset>

        {multiplo ? (
          <>
            <DiasRepetir valor={dias} aoMudar={setDias} rotulo={r ? "Dias da semana" : "Repetir em"} />
            {erros.dias && <p className="erro-campo" role="alert">{erros.dias}</p>}
          </>
        ) : (
          <Campo rotulo="Dia">
            <select value={dia} onChange={(e) => setDia(Number(e.target.value) as Dia)}>
              {DIAS.map((d) => <option key={d} value={d}>{DIAS_LONGOS[d]}</option>)}
            </select>
          </Campo>
        )}

        <div className="acoes" style={{ justifyContent: "space-between" }}>
          {r ? <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Excluir</button> : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">{r ? "Salvar refeição" : "Criar refeição"}</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}
