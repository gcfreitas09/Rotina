import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2 } from "../../components/icones.tsx";
import type { Carteira, Fixo, Lancamento } from "../../data/types.ts";
import { excluir, salvar, useColecao } from "../../data/store.ts";
import { brCurta, hoje } from "../../data/datas.ts";
import { lerNumero, novoId } from "../../data/formato.ts";
import { Campo, Dialogo, Vazio, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import Segmentos from "../../components/Segmentos.tsx";
import {
  CARTEIRAS, CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, comparaMesAnterior, curtoCarteira, fixosDoMes, lerValor, mesDe, nomeCarteira,
  nomeMes, nomeMesAno, porCategoria, porDia, reais, resumoMes, somarMes, valorCampo,
} from "./logica.ts";

type Tipo = Lancamento["tipo"];

/** "R$" pequeno, reais grandes, centavos menores: o número que importa salta primeiro. */
function Dinheiro({ c, sinal = false }: { c: number; sinal?: boolean }) {
  const [r, cent] = reais(Math.abs(c)).replace("R$", "").trim().split(",");
  return (
    <span className="dinheiro num">
      {c < 0 ? "−" : sinal && c > 0 ? "+" : ""}<span className="unidade">R$</span>{r}<span className="centavos">,{cent}</span>
    </span>
  );
}

/** Finanças: mês a mês, entradas, gastos, fixos (salário, vales, contas) e vales em carteira à parte. Rota #/mais/financas. */
export default function Financas() {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const atual = mesDe(hoje());
  const [mes, setMes] = useState(atual);
  const [editando, setEditando] = useState<{ l: Lancamento | null; tipo: Tipo } | null>(null);
  const [editFixo, setEditFixo] = useState<Fixo | "novo" | null>(null);

  const r = resumoMes(lancs, fixos, mes);
  const fm = fixosDoMes(fixos, lancs, mes);
  const cats = porCategoria(lancs, mes);
  const dias = porDia(lancs, mes);
  const comp = comparaMesAnterior(lancs, mes);
  const vazio = !lancs.length && !fixos.length;

  const lancarFixo = (f: Fixo, data: string) => {
    const id = novoId("fn");
    // no mês corrente, a data é hoje (o dia em que caiu de verdade); em outro mês, o dia do fixo
    salvar("lancamentos", { id, tipo: f.tipo, valor: f.valor, descricao: f.descricao, categoria: f.categoria, carteira: f.carteira, data: mes === atual ? hoje() : data, fixoId: f.id });
    mostrarAviso(`${f.descricao}: ${reais(f.valor)} ${f.tipo === "entrada" ? "recebido" : "pago"}.`, () => excluir("lancamentos", id)());
  };

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
        <div>
          <span className="n-rot">Entrou</span>
          <span className="n-val"><Dinheiro c={r.entrou} /></span>
          <small>{r.aReceber ? <>falta receber <span className="num">{reais(r.aReceber)}</span></> : "na conta"}</small>
        </div>
        <div>
          <span className="n-rot">Saiu</span>
          <span className="n-val"><Dinheiro c={r.saiu} /></span>
          <small>{comp === null ? (r.aPagar ? <>falta pagar <span className="num">{reais(r.aPagar)}</span></> : "na conta") : <>{comp > 0 ? "+" : "−"}<span className="num">{Math.abs(Math.round(comp * 100))}%</span> de gastos que {nomeMes(somarMes(mes, -1))}</>}</small>
        </div>
        <div className={r.saldo < 0 ? "negativo" : ""}>
          <span className="n-rot">Saldo do mês</span>
          <span className="n-val"><Dinheiro c={r.saldo} /></span>
          <small>entrou − saiu</small>
        </div>
        <div className={r.previsto < 0 ? "negativo" : ""}>
          <span className="n-rot">Previsto</span>
          <span className="n-val"><Dinheiro c={r.previsto} /></span>
          <small>{r.aReceber || r.aPagar ? "com os fixos que faltam" : "fixos em dia"}</small>
        </div>
      </div>

      {vazio ? (
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
                      <span className="fixo-dia num">{data.slice(8)}</span>
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

            {r.vales.length > 0 && (
              <section className="secao">
                <header><h2>Vales</h2></header>
                <ul className="lista vales">
                  {r.vales.map((v) => (
                    <li key={v.carteira} className={v.saldo < 0 ? "negativo" : ""}>
                      <span>{nomeCarteira(v.carteira)}<small className="suave num"> entrou {reais(v.entrou)} · usou {reais(v.saiu)}</small></span>
                      <Dinheiro c={v.saldo} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="secao">
              <header><h2>Para onde foi</h2></header>
              {cats.length === 0 ? (
                <p className="suave">Sem gastos em {nomeMes(mes)}.</p>
              ) : (
                <ul className="lista categorias-gasto">
                  {cats.map((c) => (
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
    salvar("lancamentos", { id: l?.id ?? novoId("fn"), tipo, valor: v as number, descricao: descricao.trim(), categoria, carteira, data, fixoId: l?.fixoId ?? null });
    mostrarAviso(l ? "Lançamento salvo." : `${tipo === "entrada" ? "Entrada" : "Gasto"} de ${reais(v as number)} lançado${mesDe(data) !== mes ? ` em ${nomeMesAno(mesDe(data))}` : ""}.`);
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
  const [dia, setDia] = useState(f ? String(f.dia) : "5");
  const [erros, setErros] = useState<Record<string, string>>({});
  const setTipo = (t: Tipo) => {
    setTipoBruto(t);
    const cats = t === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
    if (!cats.includes(categoria)) setCategoria(t === "entrada" ? "Salário" : "Casa");
  };
  const mudarCarteira = (c: Carteira) => { setCarteira(c); if (c !== "conta" && tipo === "entrada") setCategoria("Vale"); };
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = lerValor(valor), d = lerNumero(dia);
    const er: Record<string, string> = {};
    if (!descricao.trim()) er.descricao = "Dê um nome, como Salário ou Aluguel.";
    if (v === null || Number.isNaN(v)) er.valor = "Valor em reais, como 1.500,00.";
    if (d === null || Number.isNaN(d) || !Number.isInteger(d) || d < 1 || d > 31) er.dia = "Dia do mês, de 1 a 31.";
    setErros(er);
    if (Object.keys(er).length) return;
    salvar("fixos", { id: f?.id ?? novoId("fx"), tipo, valor: v as number, descricao: descricao.trim(), categoria, carteira, dia: d as number, desde: f?.desde ?? mes });
    mostrarAviso(f ? "Fixo salvo. Vale para os próximos lançamentos." : `${descricao.trim()} entra todo mês, dia ${d}.`);
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
          <Campo rotulo="Dia do mês" erro={erros.dia} dica="Em que dia cai todo mês (1 a 31).">
            <input className="num" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} aria-invalid={!!erros.dia} />
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
