import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2 } from "../../components/icones.tsx";
import type { Carteira, Fixo, Lancamento } from "../../data/types.ts";
import { excluir, salvar, salvarConfig, useColecao, useConfig } from "../../data/store.ts";
import { brCurta, hoje } from "../../data/datas.ts";
import { novoId } from "../../data/formato.ts";
import { Campo, Dialogo, Vazio, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import Segmentos from "../../components/Segmentos.tsx";
import { navegar } from "../../rota.ts";
import { Dinheiro, Anotar, lancarFixo, salvarLancamento } from "./acoes.tsx";
import { GraficoAcumulado, GraficoEntrouSaiu, GraficoRitmo } from "./Graficos.tsx";
import {
  ajusteDeSaldo, salarioDoMes, valeNoMes, fechamento, gastoPorDia, limitesDoMes, regra503020, type Fechamento, ritmoDoMes, serieMeses,
  CARTEIRAS, CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, curtoCarteira, formatarDias, lerDias, fixosDoMes, lerValor, mesDe, nomeCarteira,
  nomeMes, nomeMesAno, porCategoria, porDia, reais, resumoMes, somarMes, valorCampo,
} from "./logica.ts";

type Tipo = Lancamento["tipo"];

/** Finanças: mês a mês, entradas, gastos, fixos (salário, vales, contas) e vales em carteira à parte.
 * Rotas: #/mais/financas (o mês) e #/mais/financas/panorama (gráficos). O que sobra passa para o mês seguinte (acumulado). */
export default function Financas({ sub }: { sub?: string }) {
  const panorama = sub === "panorama";
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const atual = mesDe(hoje());
  const [mes, setMes] = useState(atual);
  const [editando, setEditando] = useState<{ l: Lancamento | null; tipo: Tipo } | null>(null);
  const [editFixo, setEditFixo] = useState<Fixo | "novo" | null>(null);
  const [ajustando, setAjustando] = useState<Carteira | null>(null);
  const [limitando, setLimitando] = useState(false);
  const cfg = useConfig();
  const limites = limitesDoMes(lancs, mes, cfg.limitesGasto);
  const mesAnt = somarMes(atual, -1);
  const fechAnt = mes === atual && Number(hoje().slice(8)) <= 7 && cfg.resumoVisto !== mesAnt ? fechamento(lancs, fixos, mesAnt) : null;

  const r = resumoMes(lancs, fixos, mes);
  const fm = fixosDoMes(fixos, lancs, mes);
  const cats = porCategoria(lancs, mes);
  const dias = porDia(lancs, mes);
  const vazio = !lancs.length && !fixos.length;
  const ritmo = ritmoDoMes(lancs, fixos, mes, hoje());
  const sal = salarioDoMes(lancs, fixos, mes);
  const va = valeNoMes(lancs, "va", mes), vt = valeNoMes(lancs, "vt", mes);

  return (
    <>
      <div className="topo topo-financas">
        <div>
          <p className="sobretitulo">Finanças</p>
          <div className="mes-nav">
            <button className="icone-btn" onClick={() => setMes(somarMes(mes, -1))} aria-label={`Mês anterior (${nomeMes(somarMes(mes, -1))})`}><ChevronLeft size={22} strokeWidth={1.8} /></button>
            <h1>{nomeMes(mes)}<small className="num"> {mes.slice(0, 4)}</small></h1>
            <button className="icone-btn" onClick={() => setMes(somarMes(mes, 1))} aria-label={`Próximo mês (${nomeMes(somarMes(mes, 1))})`}><ChevronRight size={22} strokeWidth={1.8} /></button>
          </div>
          {mes !== atual && <button className="botao texto pequeno" onClick={() => setMes(atual)}>Voltar para {nomeMes(atual)}</button>}
        </div>
        <div className="topo-acoes">
          <button className="botao" onClick={() => setEditando({ l: null, tipo: "entrada" })}><Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Entrada</button>
          <button className="botao primario" onClick={() => setEditando({ l: null, tipo: "saida" })}><Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Gasto</button>
        </div>
      </div>

      <div className="numeros numeros-dinheiro">
        <div className={r.acumulado < 0 ? "negativo" : ""}>
          <span className="n-rot">Dinheiro</span>
          <span className="n-val"><Dinheiro c={r.acumulado} /></span>
          <small>
            {r.anterior ? <><span className="num">{reais(r.anterior)}</span> veio de {nomeMes(somarMes(mes, -1))}</> : "o que você tem na conta"}
            {sal.falta ? <><br />falta receber <span className="num">{reais(sal.falta)}</span></> : null}
          </small>
          <button className="botao texto pequeno ajustar" onClick={() => setAjustando("conta")}>Ajustar</button>
        </div>
        {(["va", "vt"] as const).map((c) => {
          const v = c === "va" ? va : vt;
          return (
            <div key={c} className={v.saldo < 0 ? "negativo" : ""}>
              <span className="n-rot">{nomeCarteira(c)}</span>
              <span className="n-val"><Dinheiro c={v.saldo} /></span>
              <small>{v.saldo < 0 ? "negativo: faltou lançar o vale" : v.entrou ? <>entrou <span className="num">{reais(v.entrou)}</span> em {nomeMes(mes)}</> : "o que sobra no vale"}</small>
              <button className="botao texto pequeno ajustar" onClick={() => setAjustando(c)}>Ajustar</button>
            </div>
          );
        })}
        <div className={r.saldo < 0 ? "negativo" : ""}>
          <span className="n-rot">Saldo do mês</span>
          <span className="n-val"><Dinheiro c={r.saldo} /></span>
          <small>entrou − saiu da conta em {nomeMes(mes)}</small>
        </div>
      </div>

      {ritmo && !vazio && (
        <p className={`folego ${ritmo.porDia === 0 ? "sem" : ""}`}>
          {ritmo.porDia > 0 ? (
            <>Dá para gastar <strong className="num">{reais(ritmo.porDia)}</strong> por dia até o fim de {nomeMes(mes)}</>
          ) : (
            <>Com os fixos que faltam, {nomeMes(mes)} fecha no vermelho</>
          )}
          <span className="suave"> · fecha com <span className="num">{reais(r.previstoAcumulado)}</span> na conta</span>
        </p>
      )}

      {fechAnt && <CartaoFechamento f={fechAnt} aoFechar={() => salvarConfig({ resumoVisto: mesAnt })} />}

      {!vazio && mes === atual && <Anotar />}

      <div className="financas-ver"><Segmentos
        itens={[{ id: "mes", nome: "Lançamentos" }, { id: "panorama", nome: "Panorama" }]}
        atual={panorama ? "panorama" : "mes"}
        aoMudar={(v) => navegar(v === "panorama" ? "mais/financas/panorama" : "mais/financas")}
        rotulo="Ver"
      /></div>

      {panorama ? (
        <Panorama mes={mes} />
      ) : vazio ? (
        <Vazio texto="Comece pelos fixos do mês (salário, vale-refeição, aluguel, assinaturas). Depois é só lançar os gastos do dia a dia." acao="Cadastrar um fixo" aoAgir={() => setEditFixo("novo")} />
      ) : (
        <div className="grade-tela grade-financas">
          <div className="col-principal">
            <section className="secao">
              <header><h2>Lançamentos <small className="num">{dias.reduce((t, d) => t + d.itens.length, 0)}</small></h2></header>
              {dias.length === 0 ? (
                <p className="suave">Nada lançado em {nomeMes(mes)}.</p>
              ) : (
                <div className="extrato">
                  {dias.map((d) => (
                    <section key={d.data} className="extrato-dia" aria-label={brCurta(d.data)}>
                      <h3><span>{d.data === hoje() ? "Hoje" : brCurta(d.data)}</span>{d.saldo !== 0 && <Dinheiro c={d.saldo} sinal />}</h3>
                      <ul className="lista">
                        {d.itens.map((l) => (
                          <li key={l.id}>
                            <button className={`lanc lanc-${l.tipo}`} onClick={() => setEditando({ l, tipo: l.tipo })} aria-label={`Editar ${l.descricao || l.categoria}`}>
                              <span className="lanc-corpo">
                                <span className="lanc-desc">{l.descricao || l.categoria}</span>
                                <span className="lanc-meta">
                                  {l.categoria}
                                  {l.carteira !== "conta" && <span className="selo-carteira">{curtoCarteira(l.carteira)}</span>}
                                  {l.fixoId && <Repeat size={12} strokeWidth={1.8} aria-label="fixo do mês" />}
                                </span>
                              </span>
                              <Dinheiro c={l.tipo === "entrada" ? l.valor : -l.valor} sinal />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="col-lateral">
            <section className="secao">
              <header>
                <h2>Fixos do mês</h2>
                <button className="botao texto pequeno" onClick={() => setEditFixo("novo")}><Plus size={16} strokeWidth={1.8} aria-hidden="true" /> Fixo</button>
              </header>
              {fm.length === 0 ? (
                <p className="suave">Salário, vales, aluguel, assinaturas: cadastre uma vez e marque quando cair.</p>
              ) : (
                <ul className="lista fixos">
                  {fm.map(({ fixo: f, data, lancamento }) => (
                    <li key={f.id} className={`fixo ${lancamento ? "feito" : ""}`}>
                      <span className={`fixo-dia num ${f.diaMax ? "faixa" : ""}`} aria-label={f.diaMax ? `entre os dias ${f.dia} e ${f.diaMax}` : `dia ${f.dia}`}>{formatarDias(f)}</span>
                      <span className="fixo-corpo">
                        <span className="fixo-desc">{f.descricao}</span>
                        {(() => { const m = f.carteira !== "conta" ? nomeCarteira(f.carteira) : f.categoria; return m !== f.descricao && <span className="fixo-meta">{m}</span>; })()}
                      </span>
                      <Dinheiro c={f.tipo === "entrada" ? (lancamento?.valor ?? f.valor) : -(lancamento?.valor ?? f.valor)} sinal />
                      {lancamento ? (
                        <span className="fixo-status" title={`em ${brCurta(lancamento.data)}`}>{f.tipo === "entrada" ? "Recebido" : "Pago"}</span>
                      ) : (
                        <button className="botao pequeno" onClick={() => lancarFixo(f, data)}>{f.tipo === "entrada" ? "Recebi" : "Paguei"}</button>
                      )}
                      <button className="icone-btn" onClick={() => setEditFixo(f)} aria-label={`Editar fixo ${f.descricao}`}><Pencil size={16} strokeWidth={1.6} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {r.vales.some((v) => v.carteira === "vr") && (
              <section className="secao">
                <header><h2>Vale-refeição</h2></header>
                <ul className="lista vales">
                  {r.vales.filter((v) => v.carteira === "vr").map((v) => (
                    <li key={v.carteira} className={v.saldo < 0 ? "negativo" : ""}>
                      <span>{nomeCarteira(v.carteira)}<small className="suave num"> entrou {reais(v.entrou)} · usou {reais(v.saiu)}</small></span>
                      <Dinheiro c={v.saldo} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

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
                        <span className="cat-linha">
                          <span>{l.categoria}</span>
                          <span className="num">{reais(l.gasto)} <small className="suave">de {reais(l.limite)}</small></span>
                        </span>
                        <span className="mini-regua limite-regua" role="meter" aria-valuemin={0} aria-valuemax={l.limite} aria-valuenow={l.gasto} aria-label={`${l.categoria}: ${Math.round(l.fracao * 100)}% do limite`}>
                          <i style={{ width: `${Math.min(100, Math.max(1.5, l.fracao * 100))}%` }} />
                        </span>
                        <small className="limite-status">{passou ? `Passou ${reais(l.gasto - l.limite)} do limite` : `Sobram ${reais(l.limite - l.gasto)}`}{perto ? " · cuidado, já foi 80%" : ""}</small>
                      </li>
                    );
                  })}
                </ul>
              )}
              {cats.filter((c) => !cfg.limitesGasto?.[c.categoria]).length === 0 ? (
                cats.length === 0 && <p className="suave">Sem gastos em {nomeMes(mes)}.</p>
              ) : (
                <ul className="lista categorias-gasto">
                  {cats.filter((c) => !cfg.limitesGasto?.[c.categoria]).map((c) => (
                    <li key={c.categoria}>
                      <span className="cat-linha"><span>{c.categoria}</span><span className="num">{reais(c.total)} <small className="suave">{Math.round(c.fracao * 100)}%</small></span></span>
                      <span className="mini-regua" aria-hidden="true"><i style={{ width: `${Math.max(2, c.fracao * 100)}%` }} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {editando && <LancamentoForm l={editando.l} tipoInicial={editando.tipo} mes={mes} aoFechar={() => setEditando(null)} />}
      {limitando && <LimitesForm aoFechar={() => setLimitando(false)} />}
      {ajustando && <AjusteForm carteiraInicial={ajustando} aoFechar={() => setAjustando(null)} />}
      {editFixo && <FixoForm f={editFixo === "novo" ? null : editFixo} mes={mes} aoFechar={() => setEditFixo(null)} />}
    </>
  );
}

const TIPOS = [{ id: "saida" as Tipo, nome: "Gasto" }, { id: "entrada" as Tipo, nome: "Entrada" }];

function CamposComuns(p: {
  tipo: Tipo; valor: string; setValor: (v: string) => void; descricao: string; setDescricao: (v: string) => void;
  categoria: string; setCategoria: (v: string) => void; carteira: Carteira; setCarteira: (v: Carteira) => void; erros: Record<string, string>;
}) {
  const cats = p.tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const opcoes = cats.includes(p.categoria) ? cats : [...cats, p.categoria];
  return (
    <>
      <div className="linha-campos">
        <Campo rotulo="Valor (R$)" erro={p.erros.valor}>
          <input className="num campo-valor" inputMode="decimal" value={p.valor} onChange={(e) => p.setValor(e.target.value)} placeholder="0,00" aria-invalid={!!p.erros.valor} autoFocus={!p.valor} />
        </Campo>
        <Campo rotulo="Onde">
          <select value={p.carteira} onChange={(e) => p.setCarteira(e.target.value as Carteira)}>
            {CARTEIRAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Descrição (opcional)">
        <input value={p.descricao} onChange={(e) => p.setDescricao(e.target.value)} placeholder={p.tipo === "entrada" ? "Ex.: Salário da loja" : "Ex.: Lanche na escola"} />
      </Campo>
      <Campo rotulo="Categoria">
        <select value={p.categoria} onChange={(e) => p.setCategoria(e.target.value)}>
          {opcoes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
    </>
  );
}

function LancamentoForm({ l, tipoInicial, mes, aoFechar }: { l: Lancamento | null; tipoInicial: Tipo; mes: string; aoFechar: () => void }) {
  const [tipo, setTipoBruto] = useState<Tipo>(l?.tipo ?? tipoInicial);
  const [valor, setValor] = useState(l ? valorCampo(l.valor) : "");
  const [descricao, setDescricao] = useState(l?.descricao ?? "");
  const [categoria, setCategoria] = useState(l?.categoria ?? (tipoInicial === "entrada" ? "Salário" : "Alimentação"));
  const [carteira, setCarteira] = useState<Carteira>(l?.carteira ?? "conta");
  const [data, setData] = useState(l?.data ?? (mesDe(hoje()) === mes ? hoje() : `${mes}-01`));
  const [erros, setErros] = useState<Record<string, string>>({});
  const setTipo = (t: Tipo) => {
    setTipoBruto(t);
    const cats = t === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
    if (!cats.includes(categoria)) setCategoria(cats[0]);
  };
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = lerValor(valor);
    const er: Record<string, string> = {};
    if (v === null || Number.isNaN(v)) er.valor = "Valor em reais, como 25,90.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) er.data = "Escolha a data.";
    setErros(er);
    if (Object.keys(er).length) return;
    const res = salvarLancamento({ id: l?.id ?? novoId("fn"), tipo, valor: v as number, descricao: descricao.trim(), categoria, carteira, data, fixoId: l?.fixoId ?? null });
    if ("erro" in res) return setErros({ valor: res.erro });
    mostrarAviso(res.aviso ?? (l ? "Lançamento salvo." : `${tipo === "entrada" ? "Entrada" : "Gasto"} de ${reais(v as number)} lançado${mesDe(data) !== mes ? ` em ${nomeMesAno(mesDe(data))}` : ""}.`));
    aoFechar();
  };
  const apagar = async () => {
    if (!l) return;
    if (await excluirComDesfazer({ pergunta: "Excluir este lançamento?", detalhe: `${l.descricao || l.categoria}, ${reais(l.valor)} em ${brCurta(l.data)}.`, feito: "Lançamento excluído." }, () => excluir("lancamentos", l.id))) aoFechar();
  };
  return (
    <Dialogo titulo={l ? "Editar lançamento" : tipo === "entrada" ? "Nova entrada" : "Novo gasto"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Segmentos itens={TIPOS} atual={tipo} aoMudar={setTipo} rotulo="Tipo" />
        <CamposComuns {...{ tipo, valor, setValor, descricao, setDescricao, categoria, setCategoria, carteira, setCarteira, erros }} />
        <div className="linha-campos">
          <Campo rotulo="Data" erro={erros.data}><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
          <span />
        </div>
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          {l ? <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Excluir</button> : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">{l ? "Salvar" : tipo === "entrada" ? "Lançar entrada" : "Lançar gasto"}</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

function FixoForm({ f, mes, aoFechar }: { f: Fixo | null; mes: string; aoFechar: () => void }) {
  const [tipo, setTipoBruto] = useState<Tipo>(f?.tipo ?? "entrada");
  const [valor, setValor] = useState(f ? valorCampo(f.valor) : "");
  const [descricao, setDescricao] = useState(f?.descricao ?? "");
  const [categoria, setCategoria] = useState(f?.categoria ?? "Salário");
  const [carteira, setCarteira] = useState<Carteira>(f?.carteira ?? "conta");
  const [dia, setDia] = useState(f ? formatarDias(f).replace("–", "-") : "5");
  const [erros, setErros] = useState<Record<string, string>>({});
  const setTipo = (t: Tipo) => {
    setTipoBruto(t);
    const cats = t === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
    if (!cats.includes(categoria)) setCategoria(t === "entrada" ? "Salário" : "Casa");
  };
  const mudarCarteira = (c: Carteira) => { setCarteira(c); if (c !== "conta" && tipo === "entrada") setCategoria("Vale"); };
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = lerValor(valor), d = lerDias(dia);
    const er: Record<string, string> = {};
    if (!descricao.trim()) er.descricao = "Dê um nome, como Salário ou Aluguel.";
    if (v === null || Number.isNaN(v)) er.valor = "Valor em reais, como 1.500,00.";
    if (!d) er.dia = "Um dia (5) ou uma faixa (05-10), de 1 a 31.";
    setErros(er);
    if (Object.keys(er).length) return;
    salvar("fixos", { id: f?.id ?? novoId("fx"), tipo, valor: v as number, descricao: descricao.trim(), categoria, carteira, dia: d!.dia, diaMax: d!.diaMax, desde: f?.desde ?? mes });
    mostrarAviso(f ? "Fixo salvo. Vale para os próximos lançamentos." : `${descricao.trim()} todo mês, ${d!.diaMax ? `entre o dia ${d!.dia} e o ${d!.diaMax}` : `dia ${d!.dia}`}.`);
    aoFechar();
  };
  const apagar = async () => {
    if (!f) return;
    if (await excluirComDesfazer({ pergunta: `Parar de repetir ${f.descricao}?`, detalhe: "O que já foi lançado continua no extrato.", feito: `${f.descricao} não repete mais.` }, () => excluir("fixos", f.id))) aoFechar();
  };
  return (
    <Dialogo titulo={f ? "Editar fixo" : "Novo fixo do mês"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Segmentos itens={[{ id: "entrada" as Tipo, nome: "Entrada" }, { id: "saida" as Tipo, nome: "Gasto" }]} atual={tipo} aoMudar={setTipo} rotulo="Tipo" />
        <Campo rotulo="Nome" erro={erros.descricao}>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === "entrada" ? "Ex.: Salário, Vale-refeição" : "Ex.: Aluguel, Celular, Spotify"} aria-invalid={!!erros.descricao} autoFocus={!f} />
        </Campo>
        <div className="linha-campos">
          <Campo rotulo="Valor (R$)" erro={erros.valor}>
            <input className="num campo-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" aria-invalid={!!erros.valor} />
          </Campo>
          <Campo rotulo="Dia do mês" erro={erros.dia} dica="Dia certo (5) ou entre dois dias (05-10).">
            <input className="num" value={dia} placeholder="05-10" onChange={(e) => setDia(e.target.value)} aria-invalid={!!erros.dia} />
          </Campo>
        </div>
        <Campo rotulo="Onde">
          <select value={carteira} onChange={(e) => mudarCarteira(e.target.value as Carteira)}>
            {CARTEIRAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Categoria">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {(tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <p className="suave dica-fixo">Salário que muda todo mês? Cadastre o valor de sempre e, depois de marcar "Recebi", toque no lançamento para corrigir.</p>
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

/** Gráficos: ritmo do mês, o acumulado mês a mês e entrou × saiu. */
function Panorama({ mes }: { mes: string }) {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const h = hoje();
  const ritmo = ritmoDoMes(lancs, fixos, mes, h);
  const fech = mes < mesDe(h) ? fechamento(lancs, fixos, mes) : null;
  const serie12 = serieMeses(lancs, mes, 12);
  const primeiro = serie12.findIndex((p) => p.entrou || p.saiu || p.acumulado);
  const acumulado = serie12.slice(Math.max(0, Math.min(primeiro === -1 ? 11 : primeiro, 12 - 3))); // pelo menos 3 meses, sem meses vazios antes de começar
  const serie6 = serieMeses(lancs, mes, 6);
  const p6 = serie6.findIndex((p) => p.entrou || p.saiu);
  const seis = serie6.slice(Math.max(0, Math.min(p6 === -1 ? 5 : p6, 6 - 3)));
  const ant = somarMes(mes, -1);
  if (!lancs.length) return <Vazio texto="Os gráficos aparecem quando houver lançamentos. Comece marcando o salário ou lançando um gasto." />;
  return (
    <div className="panorama">
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
          <p className="graf-nota suave">Todos os gastos (conta e vales), somados dia a dia. Pode gastar por dia = o que tem na conta, mais o que falta receber, menos o que falta pagar, dividido pelos dias que faltam.</p>
        </section>
      )}
      {!ritmo && fech && <CartaoFechamento f={fech} />}
      {!ritmo && !fech && <p className="suave">Nada lançado em {nomeMesAno(mes)}.</p>}
      <section className="secao">
        <header><h2>50/30/20 em {nomeMes(mes)}</h2></header>
        <Regra503020 mes={mes} />
      </section>
      <div className="panorama-grade">
        <section className="secao">
          <header><h2>Na conta, mês a mês</h2></header>
          <GraficoAcumulado pontos={acumulado} />
        </section>
        <section className="secao">
          <header><h2>Entrou e saiu</h2></header>
          <GraficoEntrouSaiu pontos={seis} />
        </section>
      </div>
      <p className="graf-nota suave">"Na conta" e "Entrou e saiu" mostram só a conta: os vales têm saldo próprio.</p>
    </div>
  );
}

/** Informa quanto tem de verdade; o app lança a diferença como "Ajuste de saldo" (não conta como entrada nem gasto do mês). */
function AjusteForm({ carteiraInicial, aoFechar }: { carteiraInicial: Carteira; aoFechar: () => void }) {
  const lancs = useColecao("lancamentos");
  const [carteira, setCarteira] = useState<Carteira>(carteiraInicial);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const h = hoje();
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = valor.trim();
    const v = t === "0" || t === "0,00" ? 0 : lerValor(t);
    if (v === null || Number.isNaN(v)) return setErro("Quanto tem agora, em reais, como 850,00.");
    const aj = ajusteDeSaldo(lancs, carteira, v, h);
    if (!aj) { mostrarAviso("O saldo já está certo."); return aoFechar(); }
    const id = novoId("fn");
    salvar("lancamentos", { id, ...aj });
    mostrarAviso(`${nomeCarteira(carteira)}: agora ${reais(v)}.`, () => excluir("lancamentos", id)());
    aoFechar();
  };
  return (
    <Dialogo titulo="Ajustar saldo" aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <p className="suave" style={{ margin: 0 }}>Já tinha dinheiro (ou vale) antes de usar o app, ou o saldo não bate? Diga quanto tem hoje. O app lança só a diferença, que não conta como entrada nem como gasto do mês.</p>
        <Campo rotulo="Onde">
          <select value={carteira} onChange={(e) => setCarteira(e.target.value as Carteira)}>
            {CARTEIRAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Quanto tem hoje (R$)" erro={erro} dica={`O app calcula ${reais(saldoAteHoje(lancs, carteira, h))}.`}>
          <input className="num campo-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" autoFocus aria-invalid={!!erro} />
        </Campo>
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario">Ajustar</button>
        </div>
      </form>
    </Dialogo>
  );
}
const saldoAteHoje = (lancs: Lancamento[], c: Carteira, h: string) => lancs.filter((l) => l.carteira === c && l.data <= h).reduce((t, l) => t + (l.tipo === "entrada" ? l.valor : -l.valor), 0);

/** Fechamento de um mês que acabou: aparece sozinho nos primeiros dias do mês seguinte (até a pessoa fechar) e no Panorama. */
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
        {f.sobrou >= 0 ? <>Você guardou <Dinheiro c={f.sobrou} /></> : <>Gastou <Dinheiro c={-f.sobrou} /> a mais do que entrou</>}
        <span className="suave"> · ficou com {reais(f.acumulado)} na conta</span>
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

/** Regra 50/30/20: cada faixa com a barra do que foi e a marca da meta. Uma cor só: a meta é a marca, não a cor. */
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
      <p className="suave regra-base">Do que entrou em {nomeMes(mes)} (<span className="num">{reais(r.base)}</span>), o ideal é 50% para o necessário, 30% para desejos e 20% guardado.</p>
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

/** Limite de gasto por mês em cada categoria. Vazio = sem limite. */
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
        <p className="suave" style={{ margin: 0 }}>Quanto pode gastar por mês em cada categoria (conta e vales juntos). Deixe vazio para não ter limite.</p>
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
