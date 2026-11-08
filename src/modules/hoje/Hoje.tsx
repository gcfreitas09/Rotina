import { Play, Plus } from "../../components/icones.tsx";
import type { Bloco, Dia } from "../../data/types.ts";
import { useState } from "react";
import { salvar, useColecao, useConfig } from "../../data/store.ts";
import { paraRevisar } from "../flashcards/logica.ts";
import { DIAS_LONGOS, br, diaDaSemana, diasEntre, duracao, hoje, iso, minutos, porExtenso } from "../../data/datas.ts";
import { litros, nota, novoId } from "../../data/formato.ts";
import { Conta, pulso } from "../../components/movimento.tsx";
import Copo from "../../components/Copo.tsx";
import { useAgora } from "../../components/ui.tsx";
import { navegar } from "../../rota.ts";
import { atrasada, filtrar } from "../tarefas/logica.ts";
import { LinhaTarefa } from "../tarefas/Tarefas.tsx";
import { agendadas, notaAtual, resultado } from "../escola/logica.ts";
import { alternarRefeicao, refeicoesDoDia, registroDoDia, somarAgua } from "../dieta/Dieta.tsx";
import { fichaDoDia } from "../treino/Treino.tsx";
import { TIPOS } from "../horarios/Horarios.tsx";

function saudacao(h: number) {
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** Bloco em andamento ou o próximo, olhando até uma semana à frente. */
function compromisso(blocos: Bloco[], agora: Date): { b: Bloco; emAndamento: boolean; faltaMin: number; dias: number } | null {
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const hojeDia = diaDaSemana(agora);
  for (let i = 0; i < 8; i++) {
    const dia = ((hojeDia + i) % 7) as Dia;
    const doDia = blocos.filter((b) => b.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (const b of doDia) {
      if (i === 0) {
        if (minutos(b.inicio) <= minAgora && minAgora < minutos(b.fim)) return { b, emAndamento: true, faltaMin: minutos(b.fim) - minAgora, dias: 0 };
        if (minutos(b.inicio) <= minAgora) continue;
      }
      return { b, emAndamento: false, faltaMin: i * 1440 + minutos(b.inicio) - minAgora, dias: i };
    }
  }
  return null;
}

export default function Hoje() {
  const agora = useAgora();
  const cfg = useConfig();
  const tarefas = useColecao("tarefas");
  const blocos = useColecao("blocos");
  const materias = useColecao("materias");
  const refeicoes = useColecao("refeicoes");
  const registros = useColecao("diasDieta");
  const fichas = useColecao("fichas");
  const sessoes = useColecao("sessoes");
  const cartoes = useColecao("cartoes");

  const h = iso(agora);
  const dia = diaDaSemana(h);
  const pendentes = filtrar(tarefas, "hoje", h, null);
  const feitasHoje = tarefas.filter((t) => (t.recorrencia.tipo === "nenhuma" ? t.concluidaEm === h : t.feitasEm.includes(h)));
  const prox = compromisso(blocos, agora);
  const blocosHoje = blocos.filter((b) => b.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const ficha = fichaDoDia(fichas, dia);
  const sessao = ficha && sessoes.find((s) => s.data === h && s.fichaId === ficha.id);
  const refs = refeicoesDoDia(refeicoes, dia);
  const reg = registroDoDia(registros, h);
  const prova = agendadas(materias, hoje()).find((a) => a.prova);
  const diasProva = prova ? diasEntre(h, prova.data) : 0;

  // Régua do dia: 6h às 24h (estende se houver bloco fora disso)
  const ini = Math.min(6 * 60, ...blocosHoje.map((b) => minutos(b.inicio)));
  const fim = Math.max(24 * 60, ...blocosHoje.map((b) => minutos(b.fim)));
  const pct = (m: number) => ((m - ini) / (fim - ini)) * 100;
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

  const atrasadas = pendentes.filter(({ tarefa }) => atrasada(tarefa, h)).length;
  const aguaPct = Math.round((reg.aguaMl / cfg.metaAguaMl) * 100);
  const regras = { mediaAprovacao: cfg.mediaAprovacao, minimoExame: cfg.minimoExame };
  const medias = materias.map((m) => notaAtual(resultado(m, regras))).filter((v): v is number => v !== null);
  const mediaGeral = medias.length ? medias.reduce((t, v) => t + v, 0) / medias.length : null;
  const refsFeitas = refs.filter((r) => reg.feitas.includes(r.id)).length;

  const revisar = cartoes.filter((c) => paraRevisar(c, h)).length;
  const [rapida, setRapida] = useState("");
  const criarRapida = (e: React.FormEvent) => {
    e.preventDefault();
    const t = rapida.trim();
    if (!t) return;
    salvar("tarefas", { id: novoId("t"), titulo: t, descricao: "", data: h, prioridade: "media", categoria: "Pessoal", subtarefas: [], recorrencia: { tipo: "nenhuma" }, concluida: false, concluidaEm: null, feitasEm: [] });
    setRapida("");
  };

  return (
    <>
      <section className="lousa" aria-label="Seu dia">
        <div className="lousa-topo">
          <p className="lousa-data">{DIAS_LONGOS[dia]}, {porExtenso(h)}</p>
          <p className="lousa-hora num" aria-label={`Agora são ${hora}`}>{hora}</p>
        </div>
        <div className="lousa-meio">
          <div className="lousa-ola">
            <h1>{saudacao(agora.getHours())}{cfg.nome ? `, ${cfg.nome}` : ""}.</h1>
            {prox ? (
              <p className="compromisso">
                <span className="compromisso-rotulo">{prox.emAndamento ? "Agora" : prox.dias === 0 ? "Próximo" : prox.dias === 1 ? "Amanhã" : DIAS_LONGOS[prox.b.dia]}</span>
                <strong>{prox.b.nome}</strong>
                <span className="compromisso-falta">
                  <span className="num">{prox.b.inicio}–{prox.b.fim}</span> · {prox.emAndamento ? `termina em ${duracao(prox.faltaMin)}` : `começa em ${duracao(prox.faltaMin)}`}
                  {prox.b.local && ` · ${prox.b.local}`}
                </span>
              </p>
            ) : (
              <p className="compromisso-falta">Nenhum horário fixo na semana. <a href="#/mais/horarios">Montar horários</a></p>
            )}
          </div>
          <div className="placar">
            <a href="#/tarefas">
              <span className="n-rot">Tarefas hoje</span>
              <span className="n-val"><Conta className="num" valor={pendentes.length} formatar={(v) => String(Math.round(v))} /></span>
              <small className={atrasadas ? "alerta-giz" : ""}>{atrasadas ? `${atrasadas} atrasada${atrasadas > 1 ? "s" : ""}` : `${feitasHoje.length} feita${feitasHoje.length === 1 ? "" : "s"}`}</small>
            </a>
            <a href="#/saude/dieta">
              <span className="n-rot">Água</span>
              <span className="n-val"><Conta className="num" valor={aguaPct} formatar={(v) => String(Math.round(v))} /><span className="unidade">%</span></span>
              <small>{litros(reg.aguaMl)} de {litros(cfg.metaAguaMl)} L</small>
            </a>
            <a href="#/escola">
              <span className="n-rot">Média geral</span>
              <span className="n-val"><Conta className={`num ${mediaGeral !== null && mediaGeral < cfg.mediaAprovacao ? "alerta-giz" : ""}`} valor={mediaGeral} formatar={nota} /></span>
              <small>{medias.length} matéria{medias.length === 1 ? "" : "s"}</small>
            </a>
            <a href={prova ? `#/escola/${prova.materiaId}` : "#/escola"}>
              <span className="n-rot">Próxima prova</span>
              <span className="n-val">{prova ? <><Conta className={`num ${diasProva <= 3 ? "alerta-giz" : ""}`} valor={diasProva} formatar={(v) => String(Math.round(v))} /><span className="unidade">{diasProva === 1 ? "dia" : "dias"}</span></> : <span className="num">—</span>}</span>
              <small>{prova ? prova.materia : "sem data"}</small>
            </a>
          </div>
        </div>
        <div className="dia-regua" aria-hidden="true">
          {blocosHoje.map((b) => {
            const l = pct(minutos(b.inicio)), w = pct(minutos(b.fim)) - l;
            return (
              <span key={b.id} className={`dia-bloco tipo-${b.tipo} ${minAgora >= minutos(b.inicio) && minAgora < minutos(b.fim) ? "ativo" : ""}`} style={{ left: `${l}%`, width: `${w}%` }} title={`${b.nome} (${TIPOS[b.tipo]})`}>
                {w > 9 && <em>{b.nome}</em>}
              </span>
            );
          })}
          <div className="dia-ticks" style={{ backgroundSize: `calc(100% / ${(fim - ini) / 60}) 100%` }} />
          {minAgora >= ini && minAgora <= fim && <span className="dia-agora" style={{ left: `${pct(minAgora)}%` }} />}
          <div className="dia-horas num">
            {[ini, ini + (fim - ini) / 3, ini + (2 * (fim - ini)) / 3, fim].map((m) => (
              <span key={m} style={{ left: `${pct(m)}%` }}>{String(Math.floor(m / 60) % 24).padStart(2, "0")}h</span>
            ))}
          </div>
        </div>
      </section>

      <div className="painel">
        <section className="folha painel-tarefas">
          <header>
            <h2>Para hoje</h2>
            <a href="#/tarefas" className="botao texto pequeno">Ver todas</a>
          </header>
          {pendentes.length === 0 ? (
            <p className="suave painel-vazio">Nada vencendo hoje. Anote abaixo o que aparecer.</p>
          ) : (
            <ul className="lista">
              {pendentes.map(({ tarefa, data }) => (
                <li key={tarefa.id}><LinhaTarefa t={tarefa} data={data} aoAbrir={() => navegar("tarefas")} rotuloAbrir="Ver em Tarefas" /></li>
              ))}
            </ul>
          )}
          <form className="rapida" onSubmit={criarRapida}>
            <input className="entrada" value={rapida} onChange={(e) => setRapida(e.target.value)} placeholder="Anotar tarefa para hoje" aria-label="Nova tarefa para hoje" />
            <button className="botao primario" aria-label="Adicionar tarefa" disabled={!rapida.trim()}><Plus size={18} strokeWidth={2} /></button>
          </form>
        </section>

        <div className="painel-lado">
          <section className="folha painel-agua">
            <header><h2>Água</h2><span className="suave num">meta {litros(cfg.metaAguaMl)} L</span></header>
            <div className="agua-corpo">
              <Copo ml={reg.aguaMl} meta={cfg.metaAguaMl} />
              <div>
                <p className="grande"><Conta valor={reg.aguaMl / 1000} formatar={(v) => litros(v * 1000)} /><span className="unidade"> L</span></p>
                <div className="agua-botoes">
                  <button className="botao primario pequeno" onClick={() => somarAgua(h, 250, registros)} aria-label="Somar 250 ml de água">+250 ml</button>
                  <button className="botao pequeno" onClick={() => somarAgua(h, 500, registros)} aria-label="Somar 500 ml de água">+500 ml</button>
                </div>
              </div>
            </div>
          </section>

          <div className="par">
            <section className="folha painel-treino">
              <header><h2>Treino</h2></header>
              {ficha ? (
                <>
                  <p className="ficha-nome">{ficha.nome}</p>
                  <p className="suave pequeno-texto">{ficha.exercicios.length} exercícios</p>
                  {sessao?.concluida ? (
                    <p className="selo" style={{ color: "var(--musgo)" }}>Feito hoje</p>
                  ) : (
                    <button className="botao primario pequeno" onClick={() => navegar("saude/treino/agora")}>
                      <Play size={15} strokeWidth={2} aria-hidden="true" /> {sessao ? "Continuar" : "Começar"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="ficha-nome suave">Descanso</p>
                  <p className="suave pequeno-texto">Sem ficha hoje</p>
                </>
              )}
            </section>

            <section className="folha painel-prova">
              <header><h2>Prova</h2></header>
              {prova ? (
                <a href={`#/escola/${prova.materiaId}`} className="prova-link">
                  <span className={`prova-dias ${diasProva <= 3 ? "perto" : ""}`}>
                    <b className="num">{diasProva}</b>
                    <small>{diasProva === 0 ? "hoje" : diasProva === 1 ? "dia" : "dias"}</small>
                  </span>
                  <span>
                    <strong>{prova.materia}</strong>
                    <span className="suave pequeno-texto">{prova.rotulo.split(" · ")[0]} · <span className="num">{br(prova.data).slice(0, 5)}</span></span>
                  </span>
                </a>
              ) : (
                <p className="suave">Sem prova marcada.</p>
              )}
            </section>
          </div>

          <a className="folha painel-cards" href="#/escola/flashcards">
            <span className="mini-cartao" aria-hidden="true"><i /><i /><i /></span>
            <span>
              <strong>Flashcards</strong>
              <span className="suave pequeno-texto">{revisar ? `${revisar} cart${revisar === 1 ? "ão" : "ões"} para revisar hoje` : cartoes.length ? "Nada para revisar hoje" : "Crie cartões para estudar"}</span>
            </span>
            <span className="botao pequeno">{revisar ? "Revisar" : "Abrir"}</span>
          </a>
        </div>

        <section className="folha painel-refeicoes">
          <header>
            <h2>Refeições <small className="suave num">{refsFeitas}/{refs.length}</small></h2>
            <a href="#/saude/dieta" className="botao texto pequeno">Plano</a>
          </header>
          {refs.length === 0 ? (
            <p className="suave">Sem refeições no plano de hoje.</p>
          ) : (
            <ul className="bilhetes">
              {refs.map((r) => {
                const feita = reg.feitas.includes(r.id);
                return (
                  <li key={r.id}>
                    <label className={`bilhete ${feita ? "feito" : ""}`}>
                      <input type="checkbox" className="check" checked={feita} onChange={(e) => { pulso(e.currentTarget); alternarRefeicao(h, r.id, registros); }} aria-label={`Marcar ${r.nome} como feita`} />
                      <span>
                        <span className="num suave">{r.horario}</span>
                        <span className="item-titulo">{r.nome}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
