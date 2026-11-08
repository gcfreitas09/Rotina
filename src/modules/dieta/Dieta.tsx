import { useEffect, useState } from "react";
import { Minus, Pencil, Plus, Trash2 } from "../../components/icones.tsx";
import type { Alimento, Dia, DiaDieta, Refeicao, TipoRefeicao } from "../../data/types.ts";
import { excluir, salvar, useColecao, useConfig } from "../../data/store.ts";
import { DIAS, DIAS_CURTOS, DIAS_LONGOS, brCurta, diaDaSemana, hoje, somarDias } from "../../data/datas.ts";
import { lerNumero, litros, novoId, num } from "../../data/formato.ts";
import { Campo, DiasRepetir, Dialogo, EscopoGrupo, Vazio, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import Copo from "../../components/Copo.tsx";
import LinhaAlimento, { recalcular, useTabelaTaco, type AlimentoTexto } from "./LinhaAlimento.tsx";
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
  const r = registroDoDia(registros, data);
  const feitas = r.feitas.includes(refId) ? r.feitas.filter((x) => x !== refId) : [...r.feitas, refId];
  salvar("diasDieta", { ...r, feitas, _x: false });
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
  const feitas = totais(doDia.filter((r) => reg.feitas.includes(r.id)));

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
            <tr><th>Dia</th><th>Refeições</th><th>Água</th><th>kcal</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, i) => somarDias(h, -i)).map((data) => {
              const rg = registroDoDia(registros, data);
              const plan = refeicoesDoDia(refeicoes, diaDaSemana(data));
              const ok = plan.filter((p) => rg.feitas.includes(p.id));
              const k = totais(ok).kcal;
              return (
                <tr key={data}>
                  <td>{DIAS_CURTOS[diaDaSemana(data)]} <span className="suave num">{brCurta(data)}</span></td>
                  <td className="num">{ok.length}/{plan.length}</td>
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
        <p className="suave" style={{ margin: "12px 0 4px", fontSize: 13.5 }}>
          {ehHoje ? "Hoje — marque o que já comeu." : `Plano de ${DIAS_LONGOS[dia]}.`}
          {plano.kcal !== null && <> Plano: <span className="num">{num(plano.kcal, 0)}</span> kcal</>}
          {plano.proteina !== null && <> · <span className="num">{num(plano.proteina, 0)}</span> g de proteína</>}
        </p>
        {ehHoje && (plano.kcal !== null || plano.proteina !== null) && (
          <p className="suave" style={{ fontSize: 13.5, marginBottom: 8 }}>
            Comido até agora: <span className="num">{num(feitas.kcal ?? 0, 0)}</span> kcal · <span className="num">{num(feitas.proteina ?? 0, 0)}</span> g de proteína
          </p>
        )}
        {doDia.length === 0 ? (
          <Vazio texto={`Nenhuma refeição em ${DIAS_LONGOS[dia]}.`} acao="Adicionar refeição" aoAgir={() => setEditando("nova")} />
        ) : (
          <ul className="lista">
            {doDia.map((r) => {
              const feita = ehHoje && reg.feitas.includes(r.id);
              const t = totais([r]);
              return (
                <li key={r.id}>
                  <div className={`item ${feita ? "feito" : ""}`} style={{ alignItems: "flex-start" }}>
                    {ehHoje ? (
                      <input type="checkbox" className="check" checked={feita} onChange={(e) => { pulso(e.currentTarget); alternarRefeicao(h, r.id, registros); }} aria-label={`Marcar ${r.nome} como feita`} />
                    ) : <span className="num suave" style={{ width: 44, paddingTop: 12, fontSize: 13 }}>{r.horario}</span>}
                    <div className="item-corpo" style={{ paddingTop: 10 }}>
                      <p className="item-titulo">{r.nome} {ehHoje && <span className="num suave" style={{ fontWeight: 400, fontSize: 13 }}>{r.horario}</span>}</p>
                      <ul className="alimentos">
                        {r.alimentos.map((a) => (
                          <li key={a.id}><span>{a.nome}</span> <span className="suave">{a.quantidade}</span></li>
                        ))}
                      </ul>
                      {(t.kcal !== null || t.proteina !== null) && (
                        <p className="item-meta num">{t.kcal !== null && `${num(t.kcal, 0)} kcal`}{t.kcal !== null && t.proteina !== null && " · "}{t.proteina !== null && `${num(t.proteina, 0)} g prot.`}</p>
                      )}
                    </div>
                    <button className="icone-btn" onClick={() => setEditando(r)} aria-label={`Editar ${r.nome}`}><Pencil size={17} strokeWidth={1.6} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      </div>
      </div>

      {editando && <RefeicaoForm r={editando === "nova" ? null : editando} diaInicial={dia} aoFechar={() => setEditando(null)} />}
    </>
  );
}

function RefeicaoForm({ r, diaInicial, aoFechar }: { r: Refeicao | null; diaInicial: Dia; aoFechar: () => void }) {
  const grupo = r ? (doGrupo("refeicoes", r.grupo) as Refeicao[]) : [];
  const [escopo, setEscopo] = useState<"um" | "todos">(grupo.length > 1 ? "todos" : "um");
  const [tipo, setTipo] = useState<TipoRefeicao>(r?.tipo ?? "lanche");
  const [nome, setNome] = useState(r?.nome ?? TIPOS_REFEICAO.lanche);
  const [horario, setHorario] = useState(r?.horario ?? "16:00");
  const [alimentos, setAlimentos] = useState<AlimentoTexto[]>(
    (r?.alimentos ?? []).map((a) => ({ id: a.id, nome: a.nome, quantidade: a.quantidade, kcal: a.kcal === null ? "" : num(a.kcal), proteina: a.proteina === null ? "" : num(a.proteina), escolha: a.base ?? a.ref, manualKcal: !a.autoKcal && a.kcal !== null, manualProt: !a.autoProt && a.proteina !== null })),
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
  const novoAlimento = () => setAlimentos([...alimentos, { id: novoId("a"), nome: "", quantidade: "", kcal: "", proteina: "", manualKcal: false, manualProt: false }]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!nome.trim()) er.nome = "Dê um nome à refeição.";
    if (!horario) er.horario = "Informe o horário.";
    if (multiplo && dias.length === 0) er.dias = "Escolha pelo menos um dia.";
    const lista: Alimento[] = [];
    alimentos.forEach((a) => {
      if (!a.nome.trim() && !a.quantidade.trim() && !a.kcal && !a.proteina) return; // linha vazia: ignora
      const kcal = lerNumero(a.kcal);
      const proteina = lerNumero(a.proteina);
      if (!a.nome.trim()) er["a" + a.id] = "Dê um nome ao alimento.";
      else if (Number.isNaN(kcal) || (kcal !== null && kcal < 0)) er["a" + a.id] = "Calorias: use um número, como 120.";
      else if (Number.isNaN(proteina) || (proteina !== null && proteina < 0)) er["a" + a.id] = "Proteína: use um número, como 12,5.";
            lista.push({
        id: a.id, nome: a.nome.trim(), quantidade: a.quantidade.trim(), kcal, proteina,
        ...(typeof a.escolha === "number" ? { ref: a.escolha } : {}),
        ...(a.escolha && typeof a.escolha === "object" ? { base: { ...a.escolha, id: String(a.escolha.id) } } : {}),
        ...(!a.manualKcal && kcal !== null ? { autoKcal: true } : {}),
        ...(!a.manualProt && proteina !== null ? { autoProt: true } : {}),
      });
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
