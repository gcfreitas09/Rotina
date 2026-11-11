/**
 * Finanças (refeito do zero em 10–11/11/2026). Rotas: #/mais/financas (extrato), /fixos, /mes.
 * Topo: o que você TEM em cada carteira agora (dinheiro, VA, VT, VR se usar). Abaixo: Anotar (uma linha + prévia editável).
 * Extrato de uma carteira = caderneta: cada lançamento mostra o saldo que ficou depois dele, para conferir de onde vem o número.
 * Contas em logica.ts (testadas em tests/financas*.test.ts).
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2 } from "../../components/icones.tsx";
import type { Carteira, Fixo, Lancamento } from "../../data/types.ts";
import { excluir, salvar, salvarConfig, salvarVarios, useColecao, useConfig } from "../../data/store.ts";
import { brCurta, DIAS_CURTOS, diaDaSemana, hoje } from "../../data/datas.ts";
import { novoId } from "../../data/formato.ts";
import { Campo, Dialogo, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import Segmentos from "../../components/Segmentos.tsx";
import { navegar } from "../../rota.ts";
import { Anotar, Dinheiro, chipCarteira, lancarFixo, nomeLongo, salvarLancamento } from "./acoes.tsx";
import { GraficoAcumulado, GraficoEntrouSaiu, GraficoRitmo } from "./Graficos.tsx";
import {
  AJUSTE, CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, ajusteDeSaldo, carteiraPeloTexto, carteirasEmUso, extrato, fechamento, fixosDoMes,
  formatarDias, gastoPorDia, lerDias, lerValor, limitesDoMes, mesDe, moverParaCarteira, nomeMes, nomeMesAno, porCategoria, reais,
  regra503020, resumoMes, ritmoDoMes, saldoAgora, serieMeses, somarMes, suspeitos, valorCampo, type Fechamento,
} from "./logica.ts";

type Vista = "extrato" | "fixos" | "mes";

export default function Financas({ sub }: { sub?: string }) {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const cfg = useConfig();
  const h = hoje();
  const atual = mesDe(h);
  const vista: Vista = sub === "fixos" ? "fixos" : sub === "mes" || sub === "panorama" ? "mes" : "extrato";
  const [mes, setMes] = useState(atual);
  const [filtro, setFiltro] = useState<Carteira | null>(null);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [editFixo, setEditFixo] = useState<Fixo | "novo" | null>(null);
  const [corrigindo, setCorrigindo] = useState<Carteira | null>(null);

  const primeiroUso = !lancs.length && !fixos.length && !cfg.financasIniciado;
  const carteiras = carteirasEmUso(lancs, fixos);
  const mesAnt = somarMes(atual, -1);
  const fechAnt = Number(h.slice(8)) <= 7 && cfg.resumoVisto !== mesAnt ? fechamento(lancs, fixos, mesAnt) : null;
  const ritmo = ritmoDoMes(lancs, fixos, atual, h);

  const escolherCarteira = (c: Carteira) => {
    setFiltro(c);
    setMes(atual);
    if (vista !== "extrato") navegar("mais/financas");
    requestAnimationFrame(() => document.getElementById("extrato")?.scrollIntoView({ block: "start" }));
  };

  return (
    <>
      <div className="topo topo-financas">
        <div>
          <p className="sobretitulo">Finanças</p>
          <h1>Você tem</h1>
        </div>
      </div>

      {primeiroUso ? (
        <PrimeiroUso />
      ) : (
        <>
          <div className={`carteiras n${carteiras.length}`}>
            {carteiras.map((c) => {
              const saldo = saldoAgora(lancs, c, h);
              const e = extrato(lancs, c, atual);
              return (
                <button key={c} className={`carteira folha c-${c} ${saldo < 0 ? "negativo" : ""} ${filtro === c && vista === "extrato" ? "ativa" : ""}`} onClick={() => escolherCarteira(c)} aria-label={`${nomeLongo(c)}: ${reais(saldo)}. Ver extrato`}>
                  <span className="carteira-nome">{nomeLongo(c)}</span>
                  <span className="carteira-saldo"><Dinheiro c={saldo} /></span>
                  <span className="carteira-mes num">
                    {e.entrou || e.saiu
                      ? <>{e.entrou ? <span className="mais">+{reais(e.entrou).replace("R$ ", "")}</span> : null}{e.saiu ? <span className="menos">−{reais(e.saiu).replace("R$ ", "")}</span> : null}<span className="suave">em {nomeMes(atual).slice(0, 3)}</span></>
                      : <span className="suave">nada em {nomeMes(atual)}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <Conferir />
          {fechAnt && <CartaoFechamento f={fechAnt} aoFechar={() => salvarConfig({ resumoVisto: mesAnt })} />}
          <Anotar />

          {ritmo && (
            <p className={`folego ${ritmo.porDia === 0 ? "sem" : ""}`}>
              {ritmo.porDia > 0
                ? <>Dá para gastar <strong className="num">{reais(ritmo.porDia)}</strong> de dinheiro por dia até o fim de {nomeMes(atual)}</>
                : <>Com as contas que faltam, o dinheiro de {nomeMes(atual)} não fecha</>}
              <span className="suave"> · já contando o que falta receber e pagar dos fixos</span>
            </p>
          )}

          <div className="financas-ver">
            <Segmentos
              itens={[{ id: "extrato", nome: "Extrato" }, { id: "fixos", nome: "Fixos" }, { id: "mes", nome: "Mês" }]}
              atual={vista}
              aoMudar={(v) => navegar(v === "extrato" ? "mais/financas" : `mais/financas/${v}`)}
              rotulo="Ver"
            />
          </div>

          <MesNav mes={mes} setMes={setMes} atual={atual} />

          {vista === "extrato" && <VistaExtrato mes={mes} filtro={filtro} setFiltro={setFiltro} carteiras={carteiras} aoEditar={setEditando} aoCorrigir={setCorrigindo} />}
          {vista === "fixos" && <VistaFixos mes={mes} aoEditar={setEditFixo} />}
          {vista === "mes" && <VistaMes mes={mes} carteiras={carteiras} />}
        </>
      )}

      {editando && <LancamentoForm l={editando} aoFechar={() => setEditando(null)} />}
      {editFixo && <FixoForm f={editFixo === "novo" ? null : editFixo} mes={mes} aoFechar={() => setEditFixo(null)} />}
      {corrigindo && <CorrigirSaldo carteira={corrigindo} aoFechar={() => setCorrigindo(null)} />}
    </>
  );
}

function MesNav({ mes, setMes, atual }: { mes: string; setMes: (m: string) => void; atual: string }) {
  return (
    <div className="mes-nav">
      <button className="icone-btn" onClick={() => setMes(somarMes(mes, -1))} aria-label={`Mês anterior (${nomeMes(somarMes(mes, -1))})`}><ChevronLeft size={22} strokeWidth={1.8} /></button>
      <h2>{nomeMes(mes)}<small className="num"> {mes.slice(0, 4)}</small></h2>
      <button className="icone-btn" onClick={() => setMes(somarMes(mes, 1))} aria-label={`Próximo mês (${nomeMes(somarMes(mes, 1))})`}><ChevronRight size={22} strokeWidth={1.8} /></button>
      {mes !== atual && <button className="botao texto pequeno" onClick={() => setMes(atual)}>Voltar para {nomeMes(atual)}</button>}
    </div>
  );
}

// ------------------------------------------------------------------ primeiro uso

/** Antes de tudo, quanto você tem hoje em cada carteira: vira o "Saldo inicial" de cada uma. */
function PrimeiroUso() {
  const [v, setV] = useState<Record<string, string>>({ conta: "", va: "", vt: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const comecar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {}, ok: [Carteira, number][] = [];
    for (const c of ["conta", "va", "vt"] as Carteira[]) {
      const t = (v[c] ?? "").trim();
      if (!t || t === "0" || t === "0,00") continue;
      const x = lerValor(t);
      if (x === null || Number.isNaN(x)) er[c] = "Valor em reais, como 174,00.";
      else ok.push([c, x]);
    }
    setErros(er);
    if (Object.keys(er).length) return;
    const h = hoje();
    for (const [c, x] of ok) salvar("lancamentos", { id: novoId("fn"), tipo: "entrada", valor: x, descricao: "Saldo inicial", categoria: AJUSTE, carteira: c, data: h, fixoId: null });
    salvarConfig({ financasIniciado: true });
    mostrarAviso(ok.length ? "Pronto. Agora é só anotar o que entra e o que sai." : "Começando do zero.");
  };
  return (
    <form className="folha primeiro-uso" onSubmit={comecar} noValidate>
      <h2>Quanto você tem hoje?</h2>
      <p className="suave">Diga o que tem agora em cada um. Daqui para a frente, cada gasto e cada entrada mexe só na carteira certa. Vale não é dinheiro: cada vale tem o próprio saldo.</p>
      <div className="primeiro-campos">
        {(["conta", "va", "vt"] as Carteira[]).map((c) => (
          <Campo key={c} rotulo={nomeLongo(c)} erro={erros[c]}>
            <input className="num campo-valor" inputMode="decimal" value={v[c]} onChange={(e) => setV({ ...v, [c]: e.target.value })} placeholder="0,00" aria-invalid={!!erros[c]} />
          </Campo>
        ))}
      </div>
      <button className="botao primario">Começar</button>
    </form>
  );
}

// ------------------------------------------------------------------ conferir (lançamentos na carteira errada)

/** Vale que caiu no dinheiro (o erro que deixou o VA negativo e o dinheiro alto): um toque move para o vale certo. */
function Conferir() {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const cfg = useConfig();
  const itens = suspeitos(lancs, fixos, cfg.financasIgnorados);
  if (!itens.length) return null;
  const mover = (s: (typeof itens)[number], c: Carteira) => {
    const mv = moverParaCarteira(lancs, fixos, s, c);
    if (mv.fixos.length) salvarVarios("fixos", mv.fixos);
    if (mv.lancamentos.length) salvarVarios("lancamentos", mv.lancamentos);
    const n = mv.lancamentos.length;
    mostrarAviso(`${s.tipo === "fixo" ? "Fixo" : "Lançamento"} movido para ${nomeLongo(c)}${s.tipo === "fixo" && n ? ` (com ${n} ${n === 1 ? "lançamento" : "lançamentos"} dele)` : ""}.`);
  };
  const ignorar = (id: string) => salvarConfig({ financasIgnorados: [...(cfg.financasIgnorados ?? []), id] });
  return (
    <section className="folha conferir" aria-label="Conferir">
      <h2>Conferir {itens.length === 1 ? "1 item" : `${itens.length} itens`}</h2>
      <p className="suave">Parece vale, mas está no dinheiro. Isso deixa o dinheiro alto e o vale negativo.</p>
      <ul>
        {itens.map((s) => (
          <li key={s.id}>
            <span>{s.texto}</span>
            <span className="conferir-acoes">
              {s.sugestao
                ? <button className="botao primario pequeno" onClick={() => mover(s, s.sugestao!)}>Mover para {chipCarteira(s.sugestao)}</button>
                : (["va", "vt", "vr"] as Carteira[]).map((c) => <button key={c} className="botao pequeno" onClick={() => mover(s, c)}>{chipCarteira(c)}</button>)}
              <button className="botao texto pequeno" onClick={() => ignorar(s.id)}>Está certo</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ extrato (a caderneta)

function VistaExtrato({ mes, filtro, setFiltro, carteiras, aoEditar, aoCorrigir }: {
  mes: string; filtro: Carteira | null; setFiltro: (c: Carteira | null) => void; carteiras: Carteira[];
  aoEditar: (l: Lancamento) => void; aoCorrigir: (c: Carteira) => void;
}) {
  const lancs = useColecao("lancamentos");
  const h = hoje();
  const e = extrato(lancs, filtro, mes);
  const total = e.dias.reduce((t, d) => t + d.itens.length, 0);
  const ehAtual = mes === mesDe(h);
  return (
    <section className="secao" id="extrato" aria-label="Extrato">
      <div className="chips filtro-carteira" role="group" aria-label="Carteira do extrato">
        <button type="button" className="chip" aria-pressed={!filtro} onClick={() => setFiltro(null)}>Tudo</button>
        {carteiras.map((c) => <button key={c} type="button" className="chip" aria-pressed={filtro === c} onClick={() => setFiltro(c)}>{chipCarteira(c)}</button>)}
      </div>

      {filtro && (
        <div className="caderneta-ponta">
          <span>{nomeLongo(filtro)} no começo de {nomeMes(mes)}</span>
          <Dinheiro c={e.inicio ?? 0} />
        </div>
      )}
      <p className="extrato-resumo suave num">
        {total ? <>entrou {reais(e.entrou)} · saiu {reais(e.saiu)}{filtro ? "" : " (todas as carteiras)"}</> : `Nada ${filtro ? `no ${chipCarteira(filtro)} ` : ""}em ${nomeMes(mes)}.`}
      </p>

      {e.dias.length > 0 && (
        <div className={`caderneta ${filtro ? "com-saldo" : ""}`}>
          {filtro && <p className="caderneta-cab" aria-hidden="true"><span>Lançamento</span><span>Valor</span><span>Fica</span></p>}
          {e.dias.map((d) => (
            <section key={d.data} className="caderneta-dia" aria-label={brCurta(d.data)}>
              <h3>{d.data === h ? "Hoje" : `${DIAS_CURTOS[diaDaSemana(d.data)]} ${brCurta(d.data)}`}</h3>
              <ul>
                {d.itens.map((l) => (
                  <li key={l.id}>
                    <button className={`lanc lanc-${l.tipo} ${l.categoria === AJUSTE ? "ajuste" : ""}`} onClick={() => aoEditar(l)} aria-label={`Editar ${l.descricao || l.categoria}`}>
                      <span className="lanc-corpo">
                        <span className="lanc-desc">{l.descricao || l.categoria}</span>
                        <span className="lanc-meta">
                          {l.categoria !== l.descricao && <span>{l.categoria === AJUSTE ? "ajuste de saldo" : l.categoria}</span>}
                          {!filtro && <span className={`selo-carteira c-${l.carteira}`}>{chipCarteira(l.carteira)}</span>}
                          {l.fixoId && <Repeat size={12} strokeWidth={1.8} aria-label="fixo do mês" />}
                        </span>
                      </span>
                      <span className="lanc-valor"><Dinheiro c={l.tipo === "entrada" ? l.valor : -l.valor} sinal /></span>
                      {filtro && <span className={`lanc-fica num ${(l.fica ?? 0) < 0 ? "negativo" : ""}`}>{reais(l.fica ?? 0)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {filtro && (
        <div className="caderneta-ponta fim">
          <span>{ehAtual ? `${nomeLongo(filtro)} hoje` : `${nomeLongo(filtro)} no fim de ${nomeMes(mes)}`}</span>
          <Dinheiro c={ehAtual ? saldoAgora(lancs, filtro, h) : e.fim ?? 0} />
          <button className="botao texto pequeno corrigir" onClick={() => aoCorrigir(filtro)}>O saldo real é outro? Corrigir</button>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ fixos

function VistaFixos({ mes, aoEditar }: { mes: string; aoEditar: (f: Fixo | "novo") => void }) {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const fm = fixosDoMes(fixos, lancs, mes);
  const lista = (tipo: Lancamento["tipo"]) => (
    <ul className="lista fixos">
      {fm.filter((x) => x.fixo.tipo === tipo).map(({ fixo: f, data, lancamento }) => (
        <li key={f.id} className={`fixo ${lancamento ? "feito" : ""}`}>
          <span className={`fixo-dia num ${f.diaMax ? "faixa" : ""}`} aria-label={f.diaMax ? `entre os dias ${f.dia} e ${f.diaMax}` : `dia ${f.dia}`}>{formatarDias(f)}</span>
          <span className="fixo-corpo">
            <span className="fixo-desc">{f.descricao}</span>
            <span className="fixo-meta"><span className={`selo-carteira c-${f.carteira}`}>{chipCarteira(f.carteira)}</span>{f.categoria !== "Vale" && f.categoria !== f.descricao ? ` ${f.categoria}` : ""}</span>
          </span>
          <Dinheiro c={f.tipo === "entrada" ? (lancamento?.valor ?? f.valor) : -(lancamento?.valor ?? f.valor)} sinal />
          {lancamento
            ? <span className="fixo-status" title={`em ${brCurta(lancamento.data)}`}>{f.tipo === "entrada" ? "Recebido" : "Pago"}</span>
            : <button className="botao pequeno" onClick={() => lancarFixo(f, data)}>{f.tipo === "entrada" ? "Recebi" : "Paguei"}</button>}
          <button className="icone-btn" onClick={() => aoEditar(f)} aria-label={`Editar fixo ${f.descricao}`}><Pencil size={16} strokeWidth={1.6} /></button>
        </li>
      ))}
    </ul>
  );
  const temEntrada = fm.some((x) => x.fixo.tipo === "entrada"), temSaida = fm.some((x) => x.fixo.tipo === "saida");
  return (
    <section className="secao">
      <header>
        <h2>Fixos de {nomeMes(mes)}</h2>
        <button className="botao pequeno" onClick={() => aoEditar("novo")}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Fixo</button>
      </header>
      {fm.length === 0 ? (
        <p className="suave">O que se repete todo mês: salário, vale-alimentação, vale-transporte, aluguel, celular, assinaturas. Cadastre uma vez e, quando cair, toque em Recebi ou Paguei: o valor vai para a carteira certa.</p>
      ) : (
        <>
          {temEntrada && <><h3 className="fixos-grupo">Entram</h3>{lista("entrada")}</>}
          {temSaida && <><h3 className="fixos-grupo">Saem</h3>{lista("saida")}</>}
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ mês (cada carteira, ritmo, para onde foi, 50/30/20, gráficos)

function VistaMes({ mes, carteiras }: { mes: string; carteiras: Carteira[] }) {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const cfg = useConfig();
  const [limitando, setLimitando] = useState(false);
  const h = hoje();
  const r = resumoMes(lancs, fixos, mes);
  const cats = porCategoria(lancs, mes);
  const limites = limitesDoMes(lancs, mes, cfg.limitesGasto);
  const fech = mes < mesDe(h) ? fechamento(lancs, fixos, mes) : null;
  const ritmo = ritmoDoMes(lancs, fixos, mes, h);
  const ant = somarMes(mes, -1);
  const serie12 = serieMeses(lancs, mes, 12);
  const p12 = serie12.findIndex((p) => p.entrou || p.saiu || p.acumulado);
  const acumulado = serie12.slice(Math.max(0, Math.min(p12 === -1 ? 11 : p12, 12 - 3)));
  const serie6 = serieMeses(lancs, mes, 6);
  const p6 = serie6.findIndex((p) => p.entrou || p.saiu);
  const seis = serie6.slice(Math.max(0, Math.min(p6 === -1 ? 5 : p6, 6 - 3)));
  const semLimite = cats.filter((c) => !cfg.limitesGasto?.[c.categoria]);

  return (
    <div className="vista-mes">
      {fech && <CartaoFechamento f={fech} />}

      <section className="secao">
        <header><h2>Cada carteira em {nomeMes(mes)}</h2></header>
        <div className="tabela-rolagem">
          <table className="tabela-carteiras">
            <thead><tr><th scope="col">Carteira</th><th scope="col">Começou</th><th scope="col">Entrou</th><th scope="col">Saiu</th><th scope="col">Terminou</th></tr></thead>
            <tbody>
              {carteiras.map((c) => {
                const e = extrato(lancs, c, mes);
                const ajustes = lancs.filter((l) => l.carteira === c && mesDe(l.data) === mes && l.categoria === AJUSTE).reduce((t, l) => t + (l.tipo === "entrada" ? l.valor : -l.valor), 0);
                return (
                  <tr key={c}>
                    <th scope="row">{chipCarteira(c)}</th>
                    <td className="num">{reais(e.inicio ?? 0)}</td>
                    <td className="num">{e.entrou ? `+${reais(e.entrou)}` : "—"}</td>
                    <td className="num">{e.saiu ? `−${reais(e.saiu)}` : "—"}</td>
                    <td className={`num forte ${(e.fim ?? 0) < 0 ? "negativo" : ""}`}>{reais(e.fim ?? 0)}{ajustes ? <small className="suave"> (ajuste {ajustes > 0 ? "+" : "−"}{reais(Math.abs(ajustes))})</small> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="suave graf-nota">Começou + entrou − saiu (± ajuste) = terminou. Saldo do mês no dinheiro: <span className="num">{reais(r.saldo)}</span>.</p>
      </section>

      {ritmo && (
        <section className="secao folha painel-ritmo">
          <header><h2>Ritmo de {nomeMes(mes)}</h2></header>
          <div className="ritmo-numeros">
            <p><span className="n-rot">Gasto até hoje</span><Dinheiro c={ritmo.ateHoje} />
              {ritmo.mesmoDiaAntes !== null && <small className="suave">{nomeMes(ant)} no mesmo dia: <span className="num">{reais(ritmo.mesmoDiaAntes)}</span></small>}</p>
            <p><span className="n-rot">No ritmo de agora</span><Dinheiro c={ritmo.projecao} /><small className="suave">de gasto no fim do mês</small></p>
            <p className={ritmo.porDia ? "" : "negativo"}><span className="n-rot">Pode gastar por dia</span><Dinheiro c={ritmo.porDia} /><small className="suave">{ritmo.diasRestantes} {ritmo.diasRestantes === 1 ? "dia" : "dias"} até virar o mês</small></p>
          </div>
          <GraficoRitmo atual={gastoPorDia(lancs, mes)} antes={gastoPorDia(lancs, ant)} hoje={Number(h.slice(8))} nomeAtual={nomeMes(mes)} nomeAntes={nomeMes(ant)} />
          <p className="graf-nota suave">Gastos de todas as carteiras, somados dia a dia. "Pode gastar por dia" é só do dinheiro: o que tem, mais o que falta receber, menos o que falta pagar, dividido pelos dias que faltam.</p>
        </section>
      )}

      <div className="mes-grade">
        <section className="secao">
          <header>
            <h2>Para onde foi</h2>
            <button className="botao texto pequeno" onClick={() => setLimitando(true)}>Limites</button>
          </header>
          {limites.length > 0 && (
            <ul className="lista limites">
              {limites.map((l) => {
                const passou = l.fracao >= 1, perto = !passou && l.fracao >= 0.8;
                return (
                  <li key={l.categoria} className={passou ? "passou" : perto ? "perto" : ""}>
                    <span className="cat-linha"><span>{l.categoria}</span><span className="num">{reais(l.gasto)} <small className="suave">de {reais(l.limite)}</small></span></span>
                    <span className="mini-regua limite-regua" role="meter" aria-valuemin={0} aria-valuemax={l.limite} aria-valuenow={l.gasto} aria-label={`${l.categoria}: ${Math.round(l.fracao * 100)}% do limite`}>
                      <i style={{ width: `${Math.min(100, Math.max(1.5, l.fracao * 100))}%` }} />
                    </span>
                    <small className="limite-status">{passou ? `Passou ${reais(l.gasto - l.limite)} do limite` : `Sobram ${reais(l.limite - l.gasto)}`}{perto ? " · já foi 80%" : ""}</small>
                  </li>
                );
              })}
            </ul>
          )}
          {cats.length === 0 ? <p className="suave">Sem gastos em {nomeMes(mes)}.</p> : semLimite.length > 0 && (
            <ul className="lista categorias-gasto">
              {semLimite.map((c) => (
                <li key={c.categoria}>
                  <span className="cat-linha"><span>{c.categoria}</span><span className="num">{reais(c.total)} <small className="suave">{Math.round(c.fracao * 100)}%</small></span></span>
                  <span className="mini-regua" aria-hidden="true"><i style={{ width: `${Math.max(2, c.fracao * 100)}%` }} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="secao">
          <header><h2>50/30/20</h2></header>
          <Regra503020 mes={mes} />
        </section>
      </div>

      {lancs.length > 0 && (
        <div className="mes-grade">
          <section className="secao">
            <header><h2>Dinheiro, mês a mês</h2></header>
            <GraficoAcumulado pontos={acumulado} />
          </section>
          <section className="secao">
            <header><h2>Entrou e saiu do dinheiro</h2></header>
            <GraficoEntrouSaiu pontos={seis} />
          </section>
        </div>
      )}
      {limitando && <LimitesForm aoFechar={() => setLimitando(false)} />}
    </div>
  );
}

/** Fechamento de um mês que acabou: aparece sozinho nos primeiros dias do mês seguinte (até a pessoa fechar) e na aba Mês. */
function CartaoFechamento({ f, aoFechar }: { f: Fechamento; aoFechar?: () => void }) {
  const frases: string[] = [];
  if (f.mudou) {
    const d = f.mudou.agora - f.mudou.antes;
    frases.push(`${f.mudou.categoria}: ${reais(Math.abs(d))} ${d > 0 ? "a mais" : "a menos"} que em ${nomeMes(somarMes(f.mes, -1))}`);
  }
  if (f.maior) frases.push(`Maior gasto: ${f.maior.categoria} (${reais(f.maior.total)})`);
  if (f.diaMaisCaro) frases.push(`Dia mais caro: ${brCurta(f.diaMaisCaro.data)}, ${reais(f.diaMaisCaro.total)}`);
  return (
    <section className="folha fechamento" aria-label={`Resumo de ${nomeMesAno(f.mes)}`}>
      <header>
        <p className="sobretitulo">Fechou {nomeMes(f.mes)}</p>
        {aoFechar && <button className="botao texto pequeno" onClick={aoFechar}>Fechar resumo</button>}
      </header>
      <p className="fechamento-frase">
        {f.sobrou >= 0 ? <>Sobrou <Dinheiro c={f.sobrou} /> de dinheiro</> : <>Gastou <Dinheiro c={-f.sobrou} /> a mais do que entrou</>}
        <span className="suave"> · terminou com {reais(f.acumulado)}</span>
      </p>
      <ul className="fechamento-lista">
        <li><span className="suave">Entrou</span><span className="num">{reais(f.entrou)}</span></li>
        <li><span className="suave">Saiu</span><span className="num">{reais(f.saiu)}</span></li>
        <li><span className="suave">Lançamentos</span><span className="num">{f.lancamentos}</span></li>
        {f.regra && <li><span className="suave">Guardado</span><span className="num">{Math.round(f.regra.fracoes.guardou * 100)}%</span></li>}
      </ul>
      {frases.length > 0 && <ul className="fechamento-frases">{frases.map((x) => <li key={x}>{x}.</li>)}</ul>}
    </section>
  );
}

/** Regra 50/30/20: cada faixa com a barra do que foi e a marca da meta. */
function Regra503020({ mes }: { mes: string }) {
  const lancs = useColecao("lancamentos");
  const r = regra503020(lancs, mes);
  if (!r) return <p className="suave">Aparece quando houver entrada no mês (salário, vale, freela).</p>;
  const linhas = [
    { id: "necessidades", nome: "Necessidades", meta: 0.5, valor: r.necessidades, f: r.fracoes.necessidades, dica: "comida, mercado, transporte, casa, escola, saúde", bom: (x: number) => x <= 0.5 },
    { id: "desejos", nome: "Desejos", meta: 0.3, valor: r.desejos, f: r.fracoes.desejos, dica: "lazer, roupas, assinaturas, outros", bom: (x: number) => x <= 0.3 },
    { id: "guardou", nome: "Guardou", meta: 0.2, valor: r.guardou, f: r.fracoes.guardou, dica: "o que sobrou do que entrou", bom: (x: number) => x >= 0.2 },
  ];
  return (
    <>
      <p className="suave regra-base">Do que entrou em {nomeMes(mes)} (<span className="num">{reais(r.base)}</span>, vales inclusos): o ideal é 50% no necessário, 30% em desejos e 20% guardado.</p>
      <ul className="lista regra">
        {linhas.map((l) => (
          <li key={l.id} className={l.bom(l.f) ? "" : "fora"}>
            <span className="cat-linha">
              <span>{l.nome} <small className="suave">{l.dica}</small></span>
              <span className="num"><b>{Math.round(l.f * 100)}%</b> <small className="suave">meta {Math.round(l.meta * 100)}%</small></span>
            </span>
            <span className="regra-trilho" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(l.f * 100)} aria-label={`${l.nome}: ${Math.round(l.f * 100)}% (meta ${Math.round(l.meta * 100)}%)`}>
              <i style={{ width: `${Math.min(100, Math.max(1, l.f * 100))}%` }} />
              <span className="regra-meta" style={{ left: `${l.meta * 100}%` }} />
            </span>
            <small className="suave num">{reais(l.valor)}{l.bom(l.f) ? "" : l.id === "guardou" ? ` · faltou ${reais(Math.round(r.base * l.meta) - l.valor)} para a meta` : ` · ${reais(l.valor - Math.round(r.base * l.meta))} acima da meta`}</small>
          </li>
        ))}
      </ul>
    </>
  );
}

// ------------------------------------------------------------------ formulários

/** Escolha da carteira com botões grandes (no lugar do select escondido, que deixava vale cair no dinheiro). */
function EscolherCarteira({ valor, aoMudar, rotulo, carteiras, erro }: { valor: Carteira | null; aoMudar: (c: Carteira) => void; rotulo: string; carteiras: Carteira[]; erro?: string }) {
  return (
    <div className="campo">
      <span className="campo-rotulo">{rotulo}</span>
      <div className={`chips chips-grandes ${valor ? "" : "pedindo"}`} role="group" aria-label={rotulo}>
        {carteiras.map((c) => <button key={c} type="button" className="chip" aria-pressed={valor === c} onClick={() => aoMudar(c)}>{chipCarteira(c)}</button>)}
      </div>
      {erro && <small className="erro" role="alert">{erro}</small>}
    </div>
  );
}

function LancamentoForm({ l, aoFechar }: { l: Lancamento; aoFechar: () => void }) {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const [tipo, setTipo] = useState<Lancamento["tipo"]>(l.tipo);
  const [valor, setValor] = useState(valorCampo(l.valor));
  const [descricao, setDescricao] = useState(l.descricao);
  const [carteira, setCarteira] = useState<Carteira>(l.carteira);
  const [categoria, setCategoria] = useState(l.categoria);
  const [data, setData] = useState(l.data);
  const [erros, setErros] = useState<Record<string, string>>({});
  const ajuste = l.categoria === AJUSTE;
  const ehVale = carteira !== "conta";
  const cats = tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const catFinal = ajuste ? AJUSTE : tipo === "entrada" && ehVale ? "Vale" : categoria === "Vale" || !cats.includes(categoria) ? "Outros" : categoria;
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = lerValor(valor);
    if (v === null || Number.isNaN(v)) return setErros({ valor: "Valor em reais, como 25,90." });
    const r = salvarLancamento({ ...l, tipo, valor: v, descricao: descricao.trim(), categoria: catFinal, carteira, data });
    if ("erro" in r) return setErros({ geral: r.erro });
    mostrarAviso(r.aviso ?? "Lançamento salvo.");
    aoFechar();
  };
  const apagar = async () => {
    if (await excluirComDesfazer({ pergunta: "Excluir este lançamento?", detalhe: `${l.descricao || l.categoria}, ${reais(l.valor)} em ${brCurta(l.data)} (${nomeLongo(l.carteira)}).`, feito: "Lançamento excluído." }, () => excluir("lancamentos", l.id))) aoFechar();
  };
  return (
    <Dialogo titulo={ajuste ? "Editar ajuste de saldo" : "Editar lançamento"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        {!ajuste && <Segmentos itens={[{ id: "saida" as const, nome: "Gasto" }, { id: "entrada" as const, nome: "Entrada" }]} atual={tipo} aoMudar={setTipo} rotulo="Tipo" />}
        <div className="linha-campos">
          <Campo rotulo="Valor (R$)" erro={erros.valor}>
            <input className="num campo-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-invalid={!!erros.valor} />
          </Campo>
          <Campo rotulo="Data"><input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} /></Campo>
        </div>
        <EscolherCarteira valor={carteira} aoMudar={setCarteira} rotulo={tipo === "entrada" ? "Entrou em" : "Saiu de"} carteiras={carteirasEmUso(lancs, fixos)} />
        <Campo rotulo="Descrição"><input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === "entrada" ? "Ex.: Salário" : "Ex.: Salgado na cantina"} /></Campo>
        {!ajuste && (
          <Campo rotulo="Categoria">
            <select value={catFinal} onChange={(e) => setCategoria(e.target.value)} disabled={tipo === "entrada" && ehVale}>
              {(tipo === "entrada" && ehVale ? ["Vale"] : cats.filter((c) => c !== "Vale")).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
        )}
        {erros.geral && <p className="erro" role="alert">{erros.geral}</p>}
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Excluir</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">Salvar</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

const TODAS: Carteira[] = ["conta", "va", "vt", "vr"];

function FixoForm({ f, mes, aoFechar }: { f: Fixo | null; mes: string; aoFechar: () => void }) {
  const [tipo, setTipo] = useState<Lancamento["tipo"]>(f?.tipo ?? "entrada");
  const [descricao, setDescricao] = useState(f?.descricao ?? "");
  const [valor, setValor] = useState(f ? valorCampo(f.valor) : "");
  const [dia, setDia] = useState(f ? formatarDias(f).replace("–", "-") : "5");
  const [carteira, setCarteira] = useState<Carteira | null>(f?.carteira ?? null);
  const [mexeuCarteira, setMexeuCarteira] = useState(!!f);
  const [categoria, setCategoria] = useState(f?.categoria ?? "Salário");
  const [erros, setErros] = useState<Record<string, string>>({});
  const ehVale = carteira !== null && carteira !== "conta";
  const cats = tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const catFinal = tipo === "entrada" && ehVale ? "Vale" : categoria === "Vale" || !cats.includes(categoria) ? (tipo === "entrada" ? "Salário" : "Casa") : categoria;
  // o nome diz a carteira ("Vale alimentação" → VA, "Salário" → Dinheiro) enquanto a pessoa não escolher outra
  const mudarNome = (v: string) => {
    setDescricao(v);
    if (mexeuCarteira) return;
    const c = carteiraPeloTexto(v);
    if (c === "vale") setCarteira(null);
    else if (c) setCarteira(c);
    else if (/sal[aá]rio|freela|adiant/i.test(v)) setCarteira("conta");
  };
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = lerValor(valor), d = lerDias(dia);
    const er: Record<string, string> = {};
    if (!descricao.trim()) er.descricao = "Dê um nome, como Salário ou Vale alimentação.";
    if (v === null || Number.isNaN(v)) er.valor = "Valor em reais, como 1.500,00.";
    if (!d) er.dia = "Um dia (5) ou uma faixa (05-10), de 1 a 31.";
    if (!carteira) er.carteira = tipo === "entrada" ? "Escolha onde entra: Dinheiro ou qual vale." : "Escolha de onde sai.";
    setErros(er);
    if (Object.keys(er).length) return;
    salvar("fixos", { id: f?.id ?? novoId("fx"), tipo, valor: v as number, descricao: descricao.trim(), categoria: catFinal, carteira: carteira!, dia: d!.dia, diaMax: d!.diaMax, desde: f?.desde ?? mes });
    mostrarAviso(f ? "Fixo salvo." : `${descricao.trim()} todo mês, ${d!.diaMax ? `entre o dia ${d!.dia} e o ${d!.diaMax}` : `dia ${d!.dia}`} (${chipCarteira(carteira!)}).`);
    aoFechar();
  };
  const apagar = async () => {
    if (!f) return;
    if (await excluirComDesfazer({ pergunta: `Parar de repetir ${f.descricao}?`, detalhe: "O que já foi lançado continua no extrato.", feito: `${f.descricao} não repete mais.` }, () => excluir("fixos", f.id))) aoFechar();
  };
  return (
    <Dialogo titulo={f ? "Editar fixo" : "Novo fixo"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Segmentos itens={[{ id: "entrada" as const, nome: "Entra todo mês" }, { id: "saida" as const, nome: "Sai todo mês" }]} atual={tipo} aoMudar={setTipo} rotulo="Tipo" />
        <Campo rotulo="Nome" erro={erros.descricao}>
          <input value={descricao} onChange={(e) => mudarNome(e.target.value)} placeholder={tipo === "entrada" ? "Ex.: Salário, Vale alimentação" : "Ex.: Celular, Spotify"} aria-invalid={!!erros.descricao} autoFocus={!f} />
        </Campo>
        <div className="linha-campos">
          <Campo rotulo="Valor (R$)" erro={erros.valor}>
            <input className="num campo-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" aria-invalid={!!erros.valor} />
          </Campo>
          <Campo rotulo="Dia do mês" erro={erros.dia} dica="Dia certo (5) ou entre dois (05-10).">
            <input className="num" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="05-10" aria-invalid={!!erros.dia} />
          </Campo>
        </div>
        <EscolherCarteira valor={carteira} aoMudar={(c) => { setCarteira(c); setMexeuCarteira(true); }} rotulo={tipo === "entrada" ? "Entra em" : "Sai de"} carteiras={TODAS} erro={erros.carteira} />
        {!(tipo === "entrada" && ehVale) && (
          <Campo rotulo="Categoria">
            <select value={catFinal} onChange={(e) => setCategoria(e.target.value)}>
              {cats.filter((c) => c !== "Vale").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
        )}
        <p className="suave dica-fixo">Quando cair, toque em {tipo === "entrada" ? "Recebi" : "Paguei"} na aba Fixos (ou no Hoje). Valor diferente naquele mês? Toque no lançamento no extrato e corrija.</p>
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          {f ? <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Parar de repetir</button> : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">{f ? "Salvar" : "Cadastrar fixo"}</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

/** O saldo real é outro: o app lança só a diferença, como "Ajuste de saldo" (não conta como entrada nem gasto do mês). */
function CorrigirSaldo({ carteira, aoFechar }: { carteira: Carteira; aoFechar: () => void }) {
  const lancs = useColecao("lancamentos");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const h = hoje();
  const calc = saldoAgora(lancs, carteira, h);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = valor.trim();
    const v = t === "0" || t === "0,00" ? 0 : lerValor(t);
    if (v === null || Number.isNaN(v)) return setErro("Quanto tem agora, em reais, como 174,00.");
    const aj = ajusteDeSaldo(lancs, carteira, v, h);
    if (!aj) { mostrarAviso("O saldo já está certo."); return aoFechar(); }
    const id = novoId("fn");
    salvar("lancamentos", { id, ...aj });
    mostrarAviso(`${nomeLongo(carteira)}: agora ${reais(v)}.`, () => excluir("lancamentos", id)());
    aoFechar();
  };
  return (
    <Dialogo titulo={`Corrigir ${nomeLongo(carteira)}`} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <p className="suave" style={{ margin: 0 }}>Pela soma do extrato, você tem <b className="num">{reais(calc)}</b>. Se o saldo real for outro (um gasto que não foi anotado, por exemplo), diga quanto tem: o app lança só a diferença, que não conta como gasto nem como entrada do mês.</p>
        <Campo rotulo="Quanto tem hoje (R$)" erro={erro}>
          <input className="num campo-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={valorCampo(Math.max(0, calc))} autoFocus aria-invalid={!!erro} />
        </Campo>
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario">Corrigir saldo</button>
        </div>
      </form>
    </Dialogo>
  );
}

/** Limite de gasto por mês em cada categoria (todas as carteiras). Vazio = sem limite. */
function LimitesForm({ aoFechar }: { aoFechar: () => void }) {
  const cfg = useConfig();
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(CATEGORIAS_SAIDA.map((c) => [c, cfg.limitesGasto?.[c] ? valorCampo(cfg.limitesGasto[c]) : ""])));
  const [erros, setErros] = useState<Record<string, string>>({});
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {}, novo: Record<string, number> = {};
    for (const c of CATEGORIAS_SAIDA) {
      const x = lerValor(v[c] ?? "");
      if (x === null) continue;
      if (Number.isNaN(x)) er[c] = "Valor em reais, como 150,00.";
      else novo[c] = x;
    }
    setErros(er);
    if (Object.keys(er).length) return;
    salvarConfig({ limitesGasto: novo });
    const n = Object.keys(novo).length;
    mostrarAviso(n ? `${n} ${n === 1 ? "limite salvo" : "limites salvos"}. O app avisa ao chegar em 80% e ao passar.` : "Sem limites de gasto.");
    aoFechar();
  };
  return (
    <Dialogo titulo="Limites do mês" aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <p className="suave" style={{ margin: 0 }}>Quanto pode gastar por mês em cada categoria (dinheiro e vales juntos). Vazio = sem limite.</p>
        <div className="limites-grade">
          {CATEGORIAS_SAIDA.map((c) => (
            <Campo key={c} rotulo={c} erro={erros[c]}>
              <input className="num" inputMode="decimal" value={v[c]} onChange={(e) => setV({ ...v, [c]: e.target.value })} placeholder="sem limite" aria-invalid={!!erros[c]} />
            </Campo>
          ))}
        </div>
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario">Salvar limites</button>
        </div>
      </form>
    </Dialogo>
  );
}
