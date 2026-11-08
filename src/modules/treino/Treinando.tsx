import { useEffect, useState } from "react";
import { formatarReps } from "./reps.ts";
import { ArrowLeft, Check, Minus, Plus, SkipForward } from "../../components/icones.tsx";
import type { Sessao } from "../../data/types.ts";
import { salvar, salvarVarios, useColecao, useConfig } from "../../data/store.ts";
import { diaDaSemana, hoje } from "../../data/datas.ts";
import { lerNumero, num } from "../../data/formato.ts";
import { Vazio, confirmar, mostrarAviso, useAgora } from "../../components/ui.tsx";
import { navegar } from "../../rota.ts";
import { pulso } from "../../components/movimento.tsx";
import { fichaDoDia } from "./Treino.tsx";

export default function Treinando() {
  const fichas = useColecao("fichas");
  const sessoes = useColecao("sessoes");
  const cfg = useConfig();
  const h = hoje();
  const ficha = fichaDoDia(fichas, diaDaSemana(h));
  const id = ficha ? `ses-${h}-${ficha.id}` : "";
  const existente = sessoes.find((s) => s.id === id);
  const [fimDescanso, setFimDescanso] = useState<number | null>(null);
  const [totalMs, setTotalMs] = useState(1);
  const [descanso, setDescanso] = useState(cfg.descansoSeg);
  const agora = useAgora(fimDescanso ? 250 : 30_000).getTime();
  const restante = fimDescanso ? Math.max(0, Math.ceil((fimDescanso - agora) / 1000)) : 0;

  useEffect(() => {
    if (fimDescanso && restante === 0) {
      navigator.vibrate?.([200, 100, 200]);
      setFimDescanso(null);
      mostrarAviso("Descanso acabou. Próxima série.");
    }
  }, [fimDescanso, restante]);

  if (!ficha) {
    return (
      <>
        <a href="#/saude/treino" className="botao texto voltar"><ArrowLeft size={18} strokeWidth={1.6} aria-hidden="true" /> Treino</a>
        <h1 style={{ marginBottom: 16 }}>Treinando agora</h1>
        <Vazio texto="Hoje é dia de descanso na sua divisão." acao="Ver divisão" aoAgir={() => navegar("saude/treino")} />
      </>
    );
  }

  const sessao: Sessao = existente ?? {
    id, _m: 0, data: h, fichaId: ficha.id, fichaNome: ficha.nome, concluida: false,
    exercicios: ficha.exercicios.map((e) => ({
      exercicioId: e.id, nome: e.nome,
      series: Array.from({ length: e.series }, () => ({ reps: e.reps, carga: e.carga, feita: false })),
    })),
  };
  const total = sessao.exercicios.reduce((t, e) => t + e.series.length, 0);
  const feitas = sessao.exercicios.reduce((t, e) => t + e.series.filter((s) => s.feita).length, 0);

  const mudarSerie = (ei: number, si: number, p: Partial<Sessao["exercicios"][0]["series"][0]>) => {
    const exercicios = sessao.exercicios.map((e, i) => i !== ei ? e : { ...e, series: e.series.map((s, j) => (j === si ? { ...s, ...p } : s)) });
    salvar("sessoes", { ...sessao, exercicios });
    if (p.feita) { setFimDescanso(Date.now() + descanso * 1000); setTotalMs(descanso * 1000); }
  };

  const finalizar = async () => {
    if (feitas < total && !(await confirmar("Finalizar com séries pendentes?", `Você fez ${feitas} de ${total} séries. As pendentes ficam como não feitas.`, "Finalizar treino"))) return;
    salvar("sessoes", { ...sessao, concluida: true });
    // A ficha passa a sugerir a maior carga usada hoje em cada exercício.
    const novaFicha = {
      ...ficha,
      exercicios: ficha.exercicios.map((ex) => {
        const s = sessao.exercicios.find((x) => x.exercicioId === ex.id)?.series.filter((x) => x.feita) ?? [];
        return s.length ? { ...ex, carga: Math.max(...s.map((x) => x.carga)) } : ex;
      }),
    };
    salvarVarios("fichas", [novaFicha]);
    setFimDescanso(null);
    mostrarAviso("Treino salvo no histórico.");
    navegar("saude/treino");
  };

  return (
    <>
      <a href="#/saude/treino" className="botao texto voltar"><ArrowLeft size={18} strokeWidth={1.6} aria-hidden="true" /> Treino</a>
      <div className="topo">
        <div>
          <p className="sobretitulo">Treinando agora</p>
          <h1>{ficha.nome}</h1>
        </div>
        <p className="medio">{feitas}<span className="suave">/{total}</span></p>
      </div>

      <div className="descanso-config">
        <span className="suave">Descanso entre séries</span>
        <button className="icone-btn" onClick={() => setDescanso(Math.max(15, descanso - 15))} aria-label="Diminuir descanso em 15 segundos"><Minus size={16} strokeWidth={1.8} /></button>
        <span className="num">{descanso}s</span>
        <button className="icone-btn" onClick={() => setDescanso(Math.min(600, descanso + 15))} aria-label="Aumentar descanso em 15 segundos"><Plus size={16} strokeWidth={1.8} /></button>
      </div>

      {sessao.exercicios.map((e, ei) => (
        <section className="secao" key={e.exercicioId}>
          <header>
            <h2>{e.nome}{(() => { const m = ficha.exercicios.find((x) => x.id === e.exercicioId); return m ? <small className="suave num meta-reps"> meta {m.series}×{formatarReps(m)}</small> : null; })()}</h2>
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
                  onClick={(e) => { pulso(e.currentTarget); mudarSerie(ei, si, { feita: !s.feita }); }}
                >
                  <Check size={18} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="acoes" style={{ marginTop: 24, justifyContent: "stretch" }}>
        <button className="botao primario" style={{ flex: 1 }} onClick={finalizar}>Finalizar treino</button>
      </div>

      {fimDescanso && (
        <div className="cronometro" role="timer" aria-live="off">
          <div className="cronometro-tempo">
            <svg viewBox="0 0 52 52" className="anel" aria-hidden="true">
              <circle cx="26" cy="26" r="22" className="anel-fundo" />
              <circle cx="26" cy="26" r="22" className="anel-giro" style={{ strokeDasharray: 138.2, strokeDashoffset: 138.2 * (1 - Math.max(0, Math.min(1, (fimDescanso - agora) / totalMs))) }} />
            </svg>
            <div>
              <p className="sobretitulo" style={{ color: "inherit", opacity: 0.7, margin: 0 }}>Descanso</p>
              <p className="medio">{Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="icone-btn" onClick={() => { setFimDescanso(fimDescanso - 15000); setTotalMs(Math.max(1000, totalMs - 15000)); }} aria-label="Menos 15 segundos"><Minus size={18} /></button>
            <button className="icone-btn" onClick={() => { setFimDescanso(fimDescanso + 15000); setTotalMs(totalMs + 15000); }} aria-label="Mais 15 segundos"><Plus size={18} /></button>
            <button className="icone-btn" onClick={() => setFimDescanso(null)} aria-label="Pular descanso"><SkipForward size={18} /></button>
          </div>
        </div>
      )}
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
