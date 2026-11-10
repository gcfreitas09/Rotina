import { useEffect, useRef, useState } from "react";
import { formatarReps } from "./reps.ts";
import { ArrowLeft, Check, ChevronRight, Minus, Plus, SkipForward } from "../../components/icones.tsx";
import type { Exercicio, Ficha, Sessao } from "../../data/types.ts";
import { salvar, salvarConfig, salvarVarios, useColecao, useConfig } from "../../data/store.ts";
import { diaDaSemana, hoje } from "../../data/datas.ts";
import { lerNumero, num } from "../../data/formato.ts";
import { Vazio, confirmar, mostrarAviso, useAgora } from "../../components/ui.tsx";
import Segmentos from "../../components/Segmentos.tsx";
import { navegar } from "../../rota.ts";
import { pulso } from "../../components/movimento.tsx";
import { liberarSom, tocarAlarme, useTelaAcesa } from "../../components/alerta.ts";
import { duracaoDescanso, faseDescanso, formatarDescanso, mmss, type Fase } from "./descanso.ts";
import { fichaDoDia } from "./Treino.tsx";
import {
  adicionarSerie, cargaSugerida, concluirSerie, desfazerSerie, formatarDuracao, novaSessao, proximaSerie, relogio,
  resumoSessao, serieDoExercicio, ultimaVez, type Posicao,
} from "./sessao.ts";

/** Modo de treino. Rotas: #/saude/treino/agora (ficha do dia) e #/saude/treino/agora/<fichaId> (qualquer ficha). */
export default function Treinando({ fichaId }: { fichaId?: string }) {
  const fichas = useColecao("fichas");
  const sessoes = useColecao("sessoes");
  const h = hoje();
  const ficha = fichaId ? fichas.find((f) => f.id === fichaId) : fichaDoDia(fichas, diaDaSemana(h));
  const voltar = <a href="#/saude/treino" className="botao texto voltar"><ArrowLeft size={18} strokeWidth={1.6} aria-hidden="true" /> Treino</a>;

  if (!ficha) {
    return (
      <>
        {voltar}
        <h1 style={{ marginBottom: 16 }}>Treinar</h1>
        <Vazio texto={fichas.length ? "Hoje é dia de descanso na sua divisão. Para treinar mesmo assim, escolha uma ficha na tela de Treino." : "Crie uma ficha de treino para começar."} acao="Ver fichas" aoAgir={() => navegar("saude/treino")} />
      </>
    );
  }
  const id = `ses-${h}-${ficha.id}`;
  const existente = sessoes.find((s) => s.id === id);
  return <Sessao_ key={id} ficha={ficha} existente={existente} sessoes={sessoes} voltar={voltar} />;
}

function Sessao_({ ficha, existente, sessoes, voltar }: { ficha: Ficha; existente?: Sessao; sessoes: Sessao[]; voltar: React.ReactNode }) {
  const cfg = useConfig();
  const h = hoje();
  // A sessão é salva ao entrar: guarda a hora de início (duração do treino).
  const sessao: Sessao = existente ?? novaSessao(ficha, h, Date.now(), sessoes);
  useEffect(() => {
    if (!existente) salvar("sessoes", sessao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const gravar = (s: Sessao) => salvar("sessoes", s);

  const [modo, setModo] = useState<"foco" | "lista">("foco");
  const [pos, setPos] = useState<Posicao | null>(() => proximaSerie(sessao));
  // O descanso fica salvo na sessão: sair do app, voltar ou trocar de exercício não zera.
  const descanso = sessao.descanso ?? null;
  const agora = useAgora(descanso ? 250 : 1000).getTime();
  const fase: Fase | null = descanso ? faseDescanso(descanso, agora) : null;
  const descansando = !!fase && fase.fase !== "fim";
  const resumo = resumoSessao(sessao, agora);
  const tudoFeito = proximaSerie(sessao) === null;

  useTelaAcesa(!sessao.concluida);

  // Alarme: ao cumprir o mínimo (e, numa faixa como 120–190 s, de novo ao chegar no máximo). Só toca se o app estava aberto
  // na hora; ao voltar depois, o descanso que já acabou só fecha.
  const avisos = useRef({ inicio: 0, min: false, max: false });
  useEffect(() => {
    if (!descanso) return;
    if (avisos.current.inicio !== descanso.inicio) avisos.current = { inicio: descanso.inicio, min: false, max: false };
    const t = agora - descanso.inicio;
    const naHora = (marco: number) => t - marco < 5000 && document.visibilityState === "visible";
    const faixa = descanso.maxMs > descanso.minMs;
    if (!avisos.current.min && t >= descanso.minMs) {
      avisos.current.min = true;
      if (naHora(descanso.minMs)) { void tocarAlarme(3); mostrarAviso(faixa ? "Descanso mínimo cumprido: pode começar a próxima série." : "Descanso acabou. Bora para a próxima série."); }
    }
    if (!avisos.current.max && t >= descanso.maxMs) {
      avisos.current.max = true;
      if (faixa && naHora(descanso.maxMs)) { void tocarAlarme(3); mostrarAviso("Acabou o descanso máximo. Próxima série!"); }
      gravar({ ...sessao, descanso: null });
    }
  }, [agora, descanso]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Sessão com o descanso do exercício `ei` começando agora (o próprio, se a ficha tiver; senão o padrão). */
  const comDescanso = (s: Sessao, ei: number): Sessao => {
    liberarSom(); // o toque em "Concluir série" libera o som do alarme (o iPhone não toca som sem um toque antes)
    return { ...s, descanso: { inicio: Date.now(), ...duracaoDescanso(metaDe(ei), cfg.descansoSeg) } };
  };

  const concluir = (p: Posicao, reps: number, carga: number) => {
    const nova = concluirSerie(sessao, p, reps, carga);
    const prox = proximaSerie(nova, p);
    gravar(prox ? comDescanso(nova, p.ei) : { ...nova, descanso: null });
    setPos(prox);
  };

  const finalizar = async () => {
    const r = resumoSessao(sessao, Date.now());
    if (r.seriesFeitas < r.seriesTotal && !(await confirmar("Finalizar com séries pendentes?", `Você fez ${r.seriesFeitas} de ${r.seriesTotal} séries. As pendentes ficam como não feitas.`, "Finalizar treino"))) return;
    gravar({ ...sessao, concluida: true, fim: Date.now(), descanso: null });
    // A ficha passa a sugerir a maior carga usada hoje em cada exercício.
    salvarVarios("fichas", [{
      ...ficha,
      exercicios: ficha.exercicios.map((ex) => {
        const s = sessao.exercicios.find((x) => x.exercicioId === ex.id)?.series.filter((x) => x.feita) ?? [];
        return s.length ? { ...ex, carga: Math.max(...s.map((x) => x.carga)) } : ex;
      }),
    }]);
    mostrarAviso("Treino salvo no histórico.");
    navegar("saude/treino");
  };

  const metaDe = (ei: number): Exercicio | undefined => ficha.exercicios.find((x) => x.id === sessao.exercicios[ei]?.exercicioId);

  return (
    <div className="treinando">
      {voltar}
      <div className="topo topo-treino">
        <div>
          <p className="sobretitulo">{sessao.concluida ? "Treino feito" : "Treinando"}{resumo.duracao !== null && <> · <span className="num">{sessao.concluida ? formatarDuracao(resumo.duracao) : relogio(resumo.duracao)}</span></>}</p>
          <h1>{ficha.nome}</h1>
        </div>
        <p className="medio num">{resumo.seriesFeitas}<span className="suave">/{resumo.seriesTotal}</span></p>
      </div>

      <Segmentos
        rotulo="Como ver o treino"
        itens={[{ id: "foco", nome: "Uma série por vez" }, { id: "lista", nome: "Lista" }]}
        atual={modo}
        aoMudar={setModo}
      />

      {modo === "lista" ? (
        <Lista sessao={sessao} metaDe={metaDe} gravar={gravar} comDescanso={comDescanso} />
      ) : sessao.concluida || (tudoFeito && !descansando) || !pos ? (
        <Resumo sessao={sessao} agora={agora} concluida={sessao.concluida} aoFinalizar={finalizar} />
      ) : (
        <Foco
          key={`${pos.ei}-${pos.si}`}
          sessao={sessao}
          sessoes={sessoes}
          pos={pos}
          meta={metaDe(pos.ei)}
          descanso={descanso && fase && fase.fase !== "fim" ? { fase, ...descanso } : null}
          aoMudarDescanso={(ms) => { if (descanso) gravar({ ...sessao, descanso: { ...descanso, minMs: Math.max(5000, descanso.minMs + ms), maxMs: Math.max(5000, descanso.minMs + ms, descanso.maxMs + ms) } }); }}
          aoPularDescanso={() => gravar({ ...sessao, descanso: null })}
          aoConcluir={(reps, carga) => concluir(pos, reps, carga)}
          aoIr={setPos}
          aoAdicionarSerie={() => { const n = adicionarSerie(sessao, pos.ei); gravar(n); setPos({ ei: pos.ei, si: n.exercicios[pos.ei].series.length - 1 }); }}
        />
      )}

      {!sessao.concluida && (
        <>
          <div className="descanso-config">
            <span className="suave">Descanso padrão <small>(exercício sem descanso na ficha)</small></span>
            <button className="icone-btn" onClick={() => salvarConfig({ descansoSeg: Math.max(15, cfg.descansoSeg - 15) })} aria-label="Diminuir descanso em 15 segundos"><Minus size={16} strokeWidth={1.8} /></button>
            <span className="num">{cfg.descansoSeg}s</span>
            <button className="icone-btn" onClick={() => salvarConfig({ descansoSeg: Math.min(600, cfg.descansoSeg + 15) })} aria-label="Aumentar descanso em 15 segundos"><Plus size={16} strokeWidth={1.8} /></button>
          </div>
          {!(tudoFeito && !descansando && modo === "foco") && (
            <div className="acoes" style={{ marginTop: 18, justifyContent: "stretch" }}>
              <button className="botao" style={{ flex: 1 }} onClick={finalizar}>Finalizar treino</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Uma série por vez: contador de repetições na lousa, peso com atalhos e o descanso no mesmo painel. */
function Foco({ sessao, sessoes, pos, meta, descanso, aoMudarDescanso, aoPularDescanso, aoConcluir, aoIr, aoAdicionarSerie }: {
  sessao: Sessao;
  sessoes: Sessao[];
  pos: Posicao;
  meta?: Exercicio;
  descanso: ({ fase: Fase; inicio: number; minMs: number; maxMs: number }) | null;
  aoMudarDescanso: (ms: number) => void;
  aoPularDescanso: () => void;
  aoConcluir: (reps: number, carga: number) => void;
  aoIr: (p: Posicao) => void;
  aoAdicionarSerie: () => void;
}) {
  const ex = sessao.exercicios[pos.ei];
  const serie = ex.series[pos.si];
  // Repetições já vêm preenchidas com a meta (ou o que foi feito): ninguém conta toque a toque no meio da série.
  const [reps, setReps] = useState(serie.reps || meta?.reps || 10);
  const [carga, setCarga] = useState(serie.feita ? serie.carga : cargaSugerida(sessao, pos));
  const refNumero = useRef<HTMLSpanElement>(null);
  const ultima = ultimaVez(sessoes, sessao, ex.exercicioId, ex.nome, pos.si);
  const atalhos = meta ? Array.from({ length: Math.min(6, (meta.repsMax ?? meta.reps) - meta.reps + 1) }, (_, i) => meta.reps + i) : [];
  const anterior = pos.ei > 0 ? serieDoExercicio(sessao, pos.ei - 1) : null;
  // Não passa para o próximo exercício sem terminar as séries deste (pedido do Guilherme: avançava sem querer).
  const terminouAtual = ex.series.every((x) => x.feita);
  const seguinte = terminouAtual && pos.ei < sessao.exercicios.length - 1 ? serieDoExercicio(sessao, pos.ei + 1) : null;
  const somar = (d: number) => { setReps((r) => Math.max(0, Math.min(200, r + d))); pulso(refNumero.current); };
  const mudarCarga = (d: number) => setCarga((c) => Math.max(0, Math.round((c + d) * 100) / 100));

  return (
    <div className="foco">
      <div className="foco-cab">
        <h2 className="foco-exercicio">{ex.nome}</h2>
        <p className="foco-serie">
          <span className="num">Série {pos.si + 1} de {ex.series.length}</span>
          {meta && <> · meta <span className="num">{formatarReps(meta)}</span> reps</>}
          {meta?.descanso ? <> · descanso <span className="num">{formatarDescanso(meta)}</span></> : null}
          {serie.feita && <> · <b>já feita</b></>}
        </p>
        {ultima && <p className="foco-ultima suave">Última vez: <span className="num">{num(ultima.carga)} kg × {ultima.reps}</span></p>}
      </div>

      {descanso ? (
        <div className="lousa contador descansando" role="timer" aria-live="off" aria-label={descanso.fase.fase === "descansando" ? `Descanso: faltam ${mmss(descanso.fase.restanteMs)}` : "Descanso mínimo cumprido: pode começar"}>
          <div className="contador-descanso">
            <svg viewBox="0 0 120 120" className="anel-giz" aria-hidden="true">
              <circle cx="60" cy="60" r="52" className="anel-fundo" />
              <circle cx="60" cy="60" r="52" className="anel-giro" style={{ strokeDasharray: 326.7, strokeDashoffset: 326.7 * (1 - Math.max(0, Math.min(1, descanso.fase.fase === "fim" ? 0 : descanso.fase.fracao))) }} />
            </svg>
            <div className="contador-centro">
              {descanso.fase.fase === "pode" ? (
                <>
                  <span className="contador-rotulo">Pode ir</span>
                  <span className="contador-tempo num">+{mmss(descanso.fase.passouMs)}</span>
                </>
              ) : (
                <>
                  <span className="contador-rotulo">Descanso</span>
                  <span className="contador-tempo num">{descanso.fase.fase === "descansando" ? mmss(descanso.fase.restanteMs) : "0:00"}</span>
                </>
              )}
            </div>
          </div>
          <p className="contador-proxima">
            {descanso.maxMs > descanso.minMs && <>Faixa {mmss(descanso.minMs)}–{mmss(descanso.maxMs)} · </>}
            Próxima: {ex.nome} · série {pos.si + 1} · {num(carga)} kg
          </p>
          <div className="contador-botoes">
            <button className="botao giz" onClick={() => aoMudarDescanso(-15000)}><Minus size={16} strokeWidth={2} aria-hidden="true" /> 15 s</button>
            <button className="botao giz" onClick={() => aoMudarDescanso(15000)}><Plus size={16} strokeWidth={2} aria-hidden="true" /> 15 s</button>
            <button className="botao giz" aria-pressed={descanso.fase.fase === "pode"} onClick={aoPularDescanso}><SkipForward size={16} strokeWidth={2} aria-hidden="true" /> {descanso.fase.fase === "pode" ? "Começar série" : "Pular"}</button>
          </div>
        </div>
      ) : (
        <div className="lousa contador">
          <div className="contador-reps">
            <span className="contador-rotulo">Repetições</span>
            <div className="contador-ajuste">
              <button type="button" className="botao giz contador-passo" onClick={() => somar(-1)} disabled={reps <= 1} aria-label="Uma repetição a menos"><Minus size={22} strokeWidth={2} /></button>
              <span className="contador-numero num" ref={refNumero} aria-live="polite">{reps}</span>
              <button type="button" className="botao giz contador-passo" onClick={() => somar(1)} aria-label="Uma repetição a mais"><Plus size={22} strokeWidth={2} /></button>
            </div>
          </div>
          <div className="contador-botoes">
            {atalhos.length > 1 && atalhos.map((n) => (
              <button key={n} className="botao giz" aria-pressed={reps === n} onClick={() => { setReps(n); pulso(refNumero.current); }} aria-label={`Fiz ${n} repetições`}>{n}</button>
            ))}
          </div>
        </div>
      )}

      <div className="peso">
        <span className="peso-rotulo">Peso</span>
        <div className="peso-controle">
          <button className="botao" onClick={() => mudarCarga(-2.5)} aria-label="Tirar 2,5 kg">−2,5</button>
          <button className="botao" onClick={() => mudarCarga(-1)} aria-label="Tirar 1 kg">−1</button>
          <label className="peso-valor">
            <CampoNumero valor={carga} rotulo="Peso em kg" aoMudar={setCarga} decimal />
            <span aria-hidden="true">kg</span>
          </label>
          <button className="botao" onClick={() => mudarCarga(1)} aria-label="Somar 1 kg">+1</button>
          <button className="botao" onClick={() => mudarCarga(2.5)} aria-label="Somar 2,5 kg">+2,5</button>
        </div>
      </div>

      <button className="botao primario concluir-serie" disabled={reps === 0 || !!descanso} onClick={(e) => { pulso(e.currentTarget); aoConcluir(reps, carga); }}>
        <Check size={20} strokeWidth={2.2} aria-hidden="true" /> {serie.feita ? "Salvar série" : "Concluir série"}
      </button>

      <nav className="foco-nav" aria-label="Exercícios">
        <button className="botao texto" disabled={!anterior} onClick={() => anterior && aoIr(anterior)}><ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" /> Anterior</button>
        <button className="botao texto" onClick={aoAdicionarSerie}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Série extra</button>
        <button className="botao texto" disabled={!seguinte} onClick={() => seguinte && aoIr(seguinte)}>Próximo <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" /></button>
      </nav>
      {!terminouAtual && pos.ei < sessao.exercicios.length - 1 && (
        <p className="suave foco-trava">Termine as séries de {ex.nome} para passar ao próximo exercício.</p>
      )}

      <ol className="foco-mapa" aria-label="Progresso por exercício">
        {sessao.exercicios.map((e, ei) => (
          <li key={e.exercicioId}>
            <button className={ei === pos.ei ? "atual" : ""} disabled={ei > pos.ei && !terminouAtual} onClick={() => aoIr(serieDoExercicio(sessao, ei))} aria-current={ei === pos.ei ? "step" : undefined}>
              <span className="foco-mapa-nome">{e.nome}</span>
              <span className="foco-mapa-pontos" aria-label={`${e.series.filter((s) => s.feita).length} de ${e.series.length} séries`}>
                {e.series.map((s, si) => <i key={si} className={s.feita ? "feita" : ei === pos.ei && si === pos.si ? "agora" : ""} />)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Resumo({ sessao, agora, concluida, aoFinalizar }: { sessao: Sessao; agora: number; concluida: boolean; aoFinalizar: () => void }) {
  const r = resumoSessao(sessao, agora);
  return (
    <div className="resumo-treino">
      <div className="lousa resumo-lousa">
        <p className="contador-rotulo">{concluida ? "Treino salvo" : "Todas as séries feitas"}</p>
        <div className="resumo-numeros">
          <div><span className="num">{r.duracao === null ? "—" : formatarDuracao(r.duracao)}</span><small>duração</small></div>
          <div><span className="num">{r.seriesFeitas}</span><small>séries</small></div>
          <div><span className="num">{num(Math.round(r.volume), 0)}</span><small>kg de volume</small></div>
        </div>
      </div>
      <ul className="lista resumo-exercicios">
        {r.exercicios.map((e) => (
          <li key={e.nome} className="item">
            <div className="item-corpo">
              <p className="item-titulo">{e.nome}</p>
              <p className="item-meta num">{e.feitas}/{e.total} séries{e.melhor && ` · melhor ${num(e.melhor.carga)} kg × ${e.melhor.reps}`}</p>
            </div>
          </li>
        ))}
      </ul>
      {!concluida && <button className="botao primario concluir-serie" onClick={aoFinalizar}><Check size={20} strokeWidth={2.2} aria-hidden="true" /> Salvar treino</button>}
    </div>
  );
}

/** Lista com todas as séries (o modo antigo): bom para corrigir carga ou reps depois. */
function Lista({ sessao, metaDe, gravar, comDescanso }: { sessao: Sessao; metaDe: (ei: number) => Exercicio | undefined; gravar: (s: Sessao) => void; comDescanso: (s: Sessao, ei: number) => Sessao }) {
  const mudarSerie = (ei: number, si: number, p: Partial<Sessao["exercicios"][0]["series"][0]>) => {
    const exercicios = sessao.exercicios.map((e, i) => (i !== ei ? e : { ...e, series: e.series.map((s, j) => (j === si ? { ...s, ...p } : s)) }));
    const nova = { ...sessao, exercicios };
    gravar(p.feita ? comDescanso(nova, ei) : nova); // série e descanso numa gravação só
  };
  return (
    <>
      {sessao.exercicios.map((e, ei) => {
        const m = metaDe(ei);
        return (
          <section className="secao" key={e.exercicioId}>
            <header>
              <h2>{e.nome}{m && <small className="suave num meta-reps"> meta {m.series}×{formatarReps(m)}</small>}</h2>
              <span className="suave num">{e.series.filter((s) => s.feita).length}/{e.series.length}</span>
            </header>
            <div className="series">
              <div className="serie serie-cab suave" aria-hidden="true"><span>Série</span><span>kg</span><span>Reps</span><span /></div>
              {e.series.map((s, si) => (
                <div key={si} className={`serie ${s.feita ? "feita" : ""}`}>
                  <span className="num">{si + 1}</span>
                  <CampoNumero valor={s.carga} rotulo={`Carga da série ${si + 1} de ${e.nome}`} aoMudar={(v) => mudarSerie(ei, si, { carga: v })} decimal />
                  <CampoNumero valor={s.reps} rotulo={`Repetições da série ${si + 1} de ${e.nome}`} aoMudar={(v) => mudarSerie(ei, si, { reps: Math.round(v) })} />
                  <button
                    className={`botao ${s.feita ? "primario" : ""} serie-ok`}
                    aria-pressed={s.feita}
                    aria-label={s.feita ? `Desmarcar série ${si + 1}` : `Marcar série ${si + 1} como feita`}
                    onClick={(ev) => { pulso(ev.currentTarget); if (s.feita) gravar(desfazerSerie(sessao, { ei, si })); else mudarSerie(ei, si, { feita: true }); }}
                  >
                    <Check size={18} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function CampoNumero({ valor, rotulo, aoMudar, decimal }: { valor: number; rotulo: string; aoMudar: (v: number) => void; decimal?: boolean }) {
  const [t, setT] = useState(num(valor));
  useEffect(() => setT(num(valor)), [valor]);
  const v = lerNumero(t);
  const invalido = v === null || Number.isNaN(v) || v < 0;
  return (
    <input
      className="entrada num"
      inputMode={decimal ? "decimal" : "numeric"}
      value={t}
      aria-label={rotulo}
      aria-invalid={invalido}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => (invalido ? setT(num(valor)) : v !== valor && aoMudar(v as number))}
    />
  );
}
