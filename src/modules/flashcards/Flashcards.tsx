import { useMemo, useRef, useState } from "react";
import Segmentos from "../../components/Segmentos.tsx";
import { ArrowLeft, ImagePlus, Pencil, Plus, Trash2, X } from "../../components/icones.tsx";
import type { Baralho, Cartao, Comparacao, Dificuldade } from "../../data/types.ts";
import { excluir, salvar, useColecao } from "../../data/store.ts";
import { hoje } from "../../data/datas.ts";
import { novoId } from "../../data/formato.ts";
import { Campo, Dialogo, Vazio, excluirComDesfazer, mostrarAviso } from "../../components/ui.tsx";
import { Conta, gsap, reduzido, useGSAP } from "../../components/movimento.tsx";
import { navegar } from "../../rota.ts";
import { comprimirImagem } from "./imagem.ts";
import { DIFICULDADES, MAX_ITENS_COMPARACAO, OPCOES_PADRAO, comparacaoVazia, limparComparacao, ULTIMA_CAIXA, continuarLista, dificuldadeDe, dominio, fila, linhasDoTexto, paraRevisar, responder, type OpcoesEstudo } from "./logica.ts";

/** Texto do cartão: linha que começa com "- " ganha bolinha de item. */
function TextoCartao({ texto }: { texto: string }) {
  return (
    <span className="texto-md">
      {linhasDoTexto(texto).map((l, i) => (
        <span key={i} className={l.item ? "item-lista" : "linha-txt"}>{l.texto || "\u00a0"}</span>
      ))}
    </span>
  );
}

/** Enter numa linha de lista continua a lista (como em apps de notas). */
function teclaLista(e: React.KeyboardEvent<HTMLTextAreaElement>, definir: (v: string) => void) {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
  const el = e.currentTarget;
  if (el.selectionStart !== el.selectionEnd) return;
  const r = continuarLista(el.value, el.selectionStart);
  if (!r) return;
  e.preventDefault();
  definir(r.valor);
  requestAnimationFrame(() => el.setSelectionRange(r.cursor, r.cursor));
}

/** Comparação na resposta: colunas = o que se compara, linhas = aspectos com a resposta de cada coluna. */
function ComparacaoVista({ c }: { c: Comparacao }) {
  return (
    <span className="comp" role="table" aria-label={`Comparação entre ${c.itens.join(" e ")}`} style={{ ["--cols" as string]: c.itens.length }}>
      <span className="comp-linha comp-topo" role="row">
        <span className="comp-cel" role="columnheader" aria-hidden="true" />
        {c.itens.map((n, i) => <span key={i} className="comp-cel comp-item" role="columnheader">{n}</span>)}
      </span>
      {c.linhas.map((l, i) => (
        <span key={i} className="comp-linha" role="row">
          <span className="comp-cel comp-criterio" role="rowheader">{l.criterio}</span>
          {c.itens.map((_, k) => <span key={k} className="comp-cel" role="cell">{l.valores[k]}</span>)}
        </span>
      ))}
    </span>
  );
}

/** Editor da comparação: nomes do que se compara no topo, um aspecto por linha com a resposta de cada um. */
function EditorComparacao({ valor, aoMudar }: { valor: Comparacao; aoMudar: (c: Comparacao) => void }) {
  const raiz = useRef<HTMLDivElement>(null);
  const n = valor.itens.length;
  const nomeItem = (i: number) => valor.itens[i].trim() || `item ${i + 1}`;
  const setItem = (i: number, t: string) => aoMudar({ ...valor, itens: valor.itens.map((x, k) => (k === i ? t : x)) });
  const setLinha = (j: number, parte: Partial<Comparacao["linhas"][number]>) => aoMudar({ ...valor, linhas: valor.linhas.map((l, k) => (k === j ? { ...l, ...parte } : l)) });
  const setValor = (j: number, i: number, t: string) => setLinha(j, { valores: valor.linhas[j].valores.map((x, k) => (k === i ? t : x)) });
  // Enter não envia o cartão: pula para o próximo campo.
  const proximo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const todos = [...(raiz.current?.querySelectorAll<HTMLInputElement>("input") ?? [])];
    todos[todos.indexOf(e.currentTarget) + 1]?.focus();
  };
  return (
    <div className="comp-editor" ref={raiz} style={{ ["--cols" as string]: n }}>
      <div className="comp-ed-linha">
        <span className="comp-ed-rotulo">Comparar</span>
        {valor.itens.map((t, i) => (
          <span key={i} className="comp-ed-cel">
            <input className="entrada" value={t} onChange={(e) => setItem(i, e.target.value)} onKeyDown={proximo} placeholder={["Mitose", "Meiose", "Fissão"][i] ?? "Item"} aria-label={`Nome do item ${i + 1}`} />
            {n > 2 && <button type="button" className="icone-btn comp-x" aria-label={`Remover coluna ${nomeItem(i)}`} onClick={() => aoMudar({ itens: valor.itens.filter((_, k) => k !== i), linhas: valor.linhas.map((l) => ({ ...l, valores: l.valores.filter((_, k) => k !== i) })) })}><X size={16} strokeWidth={1.8} /></button>}
          </span>
        ))}
      </div>
      {valor.linhas.map((l, j) => (
        <div key={j} className="comp-ed-linha">
          <span className="comp-ed-cel comp-ed-criterio">
            <input className="entrada" value={l.criterio} onChange={(e) => setLinha(j, { criterio: e.target.value })} onKeyDown={proximo} placeholder="Aspecto" aria-label={`Aspecto da linha ${j + 1}`} />
          </span>
          {valor.itens.map((_, i) => (
            <span key={i} className="comp-ed-cel">
              <input className="entrada" value={l.valores[i] ?? ""} onChange={(e) => setValor(j, i, e.target.value)} onKeyDown={proximo} placeholder="Resposta" aria-label={`${l.criterio.trim() || `Linha ${j + 1}`}: ${nomeItem(i)}`} />
            </span>
          ))}
          {valor.linhas.length > 1 && <button type="button" className="icone-btn comp-x" aria-label={`Remover linha ${l.criterio.trim() || j + 1}`} onClick={() => aoMudar({ ...valor, linhas: valor.linhas.filter((_, k) => k !== j) })}><X size={16} strokeWidth={1.8} /></button>}
        </div>
      ))}
      <div className="comp-ed-acoes">
        <button type="button" className="botao pequeno" onClick={() => aoMudar({ ...valor, linhas: [...valor.linhas, { criterio: "", valores: valor.itens.map(() => "") }] })}><Plus size={16} strokeWidth={2} aria-hidden="true" /> Adicionar linha</button>
        {n < MAX_ITENS_COMPARACAO && <button type="button" className="botao pequeno" onClick={() => aoMudar({ itens: [...valor.itens, ""], linhas: valor.linhas.map((l) => ({ ...l, valores: [...l.valores, ""] })) })}><Plus size={16} strokeWidth={2} aria-hidden="true" /> Adicionar item</button>}
      </div>
    </div>
  );
}

/** Liga a resposta em comparação e mostra o editor. */
function BlocoComparacao({ ligada, aoLigar, valor, aoMudar }: { ligada: boolean; aoLigar: (v: boolean) => void; valor: Comparacao; aoMudar: (c: Comparacao) => void }) {
  return (
    <div className="campo-comp">
      <button type="button" role="switch" aria-checked={ligada} className="interruptor" onClick={() => aoLigar(!ligada)}>
        <span className="interruptor-trilho" aria-hidden="true"><i /></span>
        <span className="interruptor-texto">
          <strong>Resposta em comparação</strong>
          <small>Compare dois ou três itens, aspecto por aspecto.</small>
        </span>
      </button>
      {ligada && <EditorComparacao valor={valor} aoMudar={aoMudar} />}
    </div>
  );
}

/** Como estudar (ordem e dificuldade). Fica na memória enquanto o app está aberto. */
let opcoesEstudo: OpcoesEstudo = OPCOES_PADRAO;

function SeletorDificuldade({ valor, aoMudar, rotulo }: { valor: Dificuldade; aoMudar: (d: Dificuldade) => void; rotulo: string }) {
  return (
    <div className="opcoes" role="group" aria-label={rotulo}>
      {DIFICULDADES.map((d) => (
        <button type="button" key={d.id} className={`opcao dif-${d.id}`} aria-pressed={valor === d.id} onClick={() => aoMudar(d.id)}>{d.nome}</button>
      ))}
    </div>
  );
}

function SeloDificuldade({ c }: { c: Cartao }) {
  const d = dificuldadeDe(c);
  return <span className={`selo-dif dif-${d}`}>{DIFICULDADES.find((x) => x.id === d)?.nome}</span>;
}

/** Dificuldade (faixa com a contagem de cada uma) e ordem aleatória da próxima sessão de estudo. */
function OpcoesDeEstudo({ cartoes }: { cartoes: Cartao[] }) {
  const [o, setO] = useState(opcoesEstudo);
  const mudar = (n: OpcoesEstudo) => { opcoesEstudo = n; setO(n); };
  const itens = [
    { id: "todas" as const, nome: "Todas", n: cartoes.length },
    ...DIFICULDADES.map((d) => ({ id: d.id, nome: d.nome, n: cartoes.filter((c) => dificuldadeDe(c) === d.id).length })),
  ];
  const aleatoria = o.ordem === "aleatoria";
  return (
    <div className="opcoes-estudo">
      <Segmentos itens={itens} atual={o.dificuldade ?? "todas"} aoMudar={(id) => mudar({ ...o, dificuldade: id === "todas" ? null : id })} rotulo="Filtrar por dificuldade" />
      <button type="button" role="switch" aria-checked={aleatoria} className="interruptor" onClick={() => mudar({ ...o, ordem: aleatoria ? "caixa" : "aleatoria" })}>
        <span className="interruptor-trilho" aria-hidden="true"><i /></span>
        <span className="interruptor-texto">
          <strong>Ordem aleatória</strong>
          <small>{aleatoria ? "Mistura tudo, sem olhar a caixa." : "Vencidos primeiro, caixa menor e difíceis antes."}</small>
        </span>
      </button>
    </div>
  );
}

/** Escolher, trocar e remover a imagem de um lado do cartão. */
function CampoImagem({ valor, aoMudar, rotulo }: { valor?: string; aoMudar: (v?: string) => void; rotulo: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const escolher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    setLendo(true);
    setErro(null);
    try {
      aoMudar(await comprimirImagem(arq));
    } catch (x) {
      setErro(x instanceof Error ? x.message : "Não deu para usar essa imagem.");
    } finally {
      setLendo(false);
    }
  };
  return (
    <div className="campo-imagem">
      <span className="campo-imagem-rotulo">{rotulo}</span>
      {valor ? (
        <div className="campo-imagem-previa">
          <img src={valor} alt={`Prévia: ${rotulo.toLowerCase()}`} />
          <button type="button" className="icone-btn" onClick={() => aoMudar(undefined)} aria-label={`Remover ${rotulo.toLowerCase()}`}><X size={18} strokeWidth={1.8} /></button>
        </div>
      ) : null}
      <button type="button" className="botao pequeno" onClick={() => ref.current?.click()} disabled={lendo}>
        <ImagePlus size={16} strokeWidth={1.7} aria-hidden="true" /> {lendo ? "Preparando…" : valor ? "Trocar imagem" : "Adicionar imagem"}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={escolher} aria-label={rotulo} />
      {erro && <p className="erro-campo" role="alert">{erro}</p>}
    </div>
  );
}

/** Flashcards: pastas por matéria → cartões → estudar. Rotas: #/escola/flashcards[/<pasta>[/estudar]] */
export default function Flashcards({ pasta, acao }: { pasta?: string; acao?: string }) {
  const baralhos = useColecao("baralhos");
  const b = baralhos.find((x) => x.id === pasta);
  if (b && acao === "estudar") return <Estudar b={b} />;
  if (b) return <Pasta b={b} />;
  return <Pastas />;
}

function Pastas() {
  const baralhos = useColecao("baralhos");
  const cartoes = useColecao("cartoes");
  const [criando, setCriando] = useState(false);
  const h = hoje();
  const porMateria = useMemo(() => {
    const m = new Map<string, Baralho[]>();
    for (const b of [...baralhos].sort((a, z) => a.nome.localeCompare(z.nome, "pt-BR"))) m.set(b.materia, [...(m.get(b.materia) ?? []), b]);
    return [...m.entries()].sort((a, z) => a[0].localeCompare(z[0], "pt-BR"));
  }, [baralhos]);
  const revisar = cartoes.filter((c) => paraRevisar(c, h)).length;

  return (
    <>
      <div className="topo">
        <div>
          <p className="sobretitulo">Estudo</p>
          <h1>Flashcards</h1>
        </div>
        <button className="botao primario" onClick={() => setCriando(true)}><Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Nova pasta</button>
      </div>

      {baralhos.length > 0 && (
        <div className="numeros numeros-3">
          <div><span className="n-rot">Para revisar hoje</span><span className="n-val"><Conta className={`num ${revisar ? "" : "suave"}`} valor={revisar} formatar={(v) => String(Math.round(v))} /></span><small>{revisar ? "cartões vencidos" : "tudo em dia"}</small></div>
          <div><span className="n-rot">Cartões</span><span className="n-val"><Conta className="num" valor={cartoes.length} formatar={(v) => String(Math.round(v))} /></span><small>em {baralhos.length} pasta{baralhos.length === 1 ? "" : "s"}</small></div>
          <div><span className="n-rot">Domínio</span><span className="n-val"><Conta className="num" valor={Math.round(dominio(cartoes) * 100)} formatar={(v) => String(Math.round(v))} /><span className="unidade">%</span></span><small>quanto já está firme</small></div>
        </div>
      )}

      {porMateria.length === 0 ? (
        <Vazio texto="Nenhuma pasta ainda. Crie uma por matéria, como Biologia ou História, e comece a escrever cartões." acao="Criar primeira pasta" aoAgir={() => setCriando(true)} />
      ) : (
        porMateria.map(([materia, lista]) => (
          <section className="secao" key={materia}>
            <header><h2>{materia}</h2><span className="suave">{lista.length} pasta{lista.length === 1 ? "" : "s"}</span></header>
            <div className="pastas">
              {lista.map((b) => {
                const cs = cartoes.filter((c) => c.baralhoId === b.id);
                const rev = cs.filter((c) => paraRevisar(c, h)).length;
                const dom = dominio(cs);
                return (
                  <div className="pasta" key={b.id}>
                    <a href={`#/escola/flashcards/${b.id}`} className="pasta-corpo">
                      <span className="pasta-pilha" aria-hidden="true"><i /><i /><i /></span>
                      <strong>{b.nome}</strong>
                      <span className="suave">{cs.length} cart{cs.length === 1 ? "ão" : "ões"}{rev > 0 && <> · <b className="pasta-rev">{rev} para hoje</b></>}</span>
                      <span className="mini-regua" aria-label={`Domínio ${Math.round(dom * 100)}%`}><i style={{ width: `${dom * 100}%` }} /></span>
                    </a>
                    <button className="botao primario pequeno" disabled={!cs.length} onClick={() => navegar(`escola/flashcards/${b.id}/estudar`)}>
                      Estudar{rev ? ` (${rev})` : ""}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
      {criando && <PastaForm aoFechar={() => setCriando(false)} />}
    </>
  );
}

function PastaForm({ b, aoFechar }: { b?: Baralho; aoFechar: () => void }) {
  const materias = useColecao("materias");
  const baralhos = useColecao("baralhos");
  const opcoes = [...new Set([...materias.map((m) => m.nome), ...baralhos.map((x) => x.materia)])].sort((a, z) => a.localeCompare(z, "pt-BR"));
  const [materia, setMateria] = useState(b?.materia ?? opcoes[0] ?? "__nova");
  const [nova, setNova] = useState("");
  const [nome, setNome] = useState(b?.nome ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materia === "__nova" ? nova.trim() : materia;
    const er: Record<string, string> = {};
    if (!mat) er.materia = "Escreva o nome da matéria, como Química.";
    if (!nome.trim()) er.nome = "Dê um nome à pasta, como Revolução Francesa ou Citologia.";
    setErros(er);
    if (Object.keys(er).length) return;
    const id = b?.id ?? novoId("b");
    salvar("baralhos", { id, materia: mat, nome: nome.trim() });
    aoFechar();
    if (!b) navegar(`escola/flashcards/${id}`);
  };
  return (
    <Dialogo titulo={b ? "Editar pasta" : "Nova pasta"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Matéria" erro={materia === "__nova" ? undefined : erros.materia}>
          <select value={materia} onChange={(e) => setMateria(e.target.value)}>
            {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="__nova">Outra matéria…</option>
          </select>
        </Campo>
        {materia === "__nova" && (
          <Campo rotulo="Nome da matéria" erro={erros.materia}>
            <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Ex.: Química" aria-invalid={!!erros.materia} />
          </Campo>
        )}
        <Campo rotulo="Nome da pasta" erro={erros.nome} dica="Um assunto da matéria. Dá para ter várias pastas na mesma matéria.">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Revolução Francesa" aria-invalid={!!erros.nome} />
        </Campo>
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario">{b ? "Salvar pasta" : "Criar pasta"}</button>
        </div>
      </form>
    </Dialogo>
  );
}

function Pasta({ b }: { b: Baralho }) {
  const todos = useColecao("cartoes");
  const cartoes = todos.filter((c) => c.baralhoId === b.id).sort((a, z) => z._m - a._m);
  const [frente, setFrente] = useState("");
  const [verso, setVerso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [dif, setDif] = useState<Dificuldade>("medio");
  const [img, setImg] = useState<string | undefined>();
  const [imgVerso, setImgVerso] = useState<string | undefined>();
  const [compLigada, setCompLigada] = useState(false);
  const [comp, setComp] = useState<Comparacao>(comparacaoVazia);
  const [editando, setEditando] = useState<Cartao | null>(null);
  const [editPasta, setEditPasta] = useState(false);
  const refFrente = useRef<HTMLTextAreaElement>(null);
  const h = hoje();
  const rev = cartoes.filter((c) => paraRevisar(c, h)).length;

  const adicionar = (e: React.FormEvent) => {
    e.preventDefault();
    const compLimpa = compLigada ? limparComparacao(comp) : undefined;
    if (compLigada && !compLimpa) return setErro("Na comparação, dê nome a pelo menos dois itens e preencha uma linha.");
    if ((!frente.trim() && !img) || (!verso.trim() && !imgVerso && !compLimpa)) return setErro("Escreva (ou envie uma imagem) para a pergunta e para a resposta.");
    salvar("cartoes", { id: novoId("c"), baralhoId: b.id, frente: frente.trim(), verso: verso.trim(), caixa: 1, proxima: h, acertos: 0, erros: 0, dificuldade: dif, ...(img ? { imagem: img } : {}), ...(imgVerso ? { imagemVerso: imgVerso } : {}), ...(compLimpa ? { comparacao: compLimpa } : {}) });
    setCompLigada(false); setComp(comparacaoVazia());
    setFrente(""); setVerso(""); setErro(null); setImg(undefined); setImgVerso(undefined);
    refFrente.current?.focus();
    mostrarAviso("Cartão adicionado.");
  };

  const apagarPasta = async () => {
    const ok = await excluirComDesfazer(
      { pergunta: `Excluir a pasta ${b.nome}?`, detalhe: `Os ${cartoes.length} cartões dela também saem.`, feito: "Pasta excluída." },
      () => {
        const d1 = excluir("cartoes", cartoes.map((c) => c.id));
        const d2 = excluir("baralhos", b.id);
        return () => { d2(); d1(); };
      },
    );
    if (ok) navegar("escola/flashcards");
  };

  return (
    <>
      <a href="#/escola/flashcards" className="botao texto voltar"><ArrowLeft size={18} strokeWidth={1.6} aria-hidden="true" /> Flashcards</a>
      <div className="topo" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="sobretitulo">{b.materia}</p>
          <h1>{b.nome}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button className="icone-btn" onClick={() => setEditPasta(true)} aria-label="Editar pasta"><Pencil size={18} strokeWidth={1.6} /></button>
          <button className="icone-btn" onClick={apagarPasta} aria-label="Excluir pasta"><Trash2 size={18} strokeWidth={1.6} /></button>
        </div>
      </div>

      <div className="grade-tela grade-pasta">
        <div className="col-principal">
          <section className="secao">
            <header>
              <h2>Cartões <small>{cartoes.length}</small></h2>
              <button className="botao primario" disabled={!cartoes.length} onClick={() => navegar(`escola/flashcards/${b.id}/estudar`)}>
                Estudar {rev ? `${rev} de hoje` : "agora"}
              </button>
            </header>
            {cartoes.length > 0 && <OpcoesDeEstudo cartoes={cartoes} />}
            {cartoes.length === 0 ? (
              <p className="suave">Nenhum cartão ainda. Escreva a primeira pergunta ao lado.</p>
            ) : (
              <ul className="cartoes-lista">
                {cartoes.map((c) => (
                  <li key={c.id} className="ficha-cartao">
                    {c.imagem && <img className="ficha-img" src={c.imagem} alt={c.frente || "Imagem da pergunta"} loading="lazy" decoding="async" />}
                    <div className="ficha-texto">
                      {c.frente && <p className="ficha-frente">{c.frente.replace(/^\s*[-*]\s+/gm, "• ")}</p>}
                      {(c.verso || c.imagemVerso || c.comparacao) && <p className="ficha-verso">{c.verso ? c.verso.replace(/^\s*[-*]\s+/gm, "• ") : c.comparacao ? `Comparação: ${c.comparacao.itens.join(" × ")}` : "Resposta em imagem"}</p>}
                    </div>
                    <div className="ficha-rodape">
                      <SeloDificuldade c={c} />
                      <span className="caixas" aria-label={`Caixa ${c.caixa} de ${ULTIMA_CAIXA}`}>
                        {Array.from({ length: ULTIMA_CAIXA }, (_, i) => <i key={i} className={i < c.caixa ? "cheia" : ""} />)}
                      </span>
                      <span className="suave">{paraRevisar(c, h) ? "revisar hoje" : `próxima ${c.proxima.slice(8)}/${c.proxima.slice(5, 7)}`}</span>
                      <button className="icone-btn" onClick={() => setEditando(c)} aria-label={`Editar cartão ${c.frente}`}><Pencil size={16} strokeWidth={1.6} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="col-lateral">
          <section className="secao">
            <form className="folha form novo-cartao" onSubmit={adicionar} noValidate>
              <h2>Novo cartão</h2>
              <Campo rotulo="Pergunta (frente)">
                <textarea ref={refFrente} rows={3} value={frente} onChange={(e) => setFrente(e.target.value)} onKeyDown={(e) => teclaLista(e, setFrente)} placeholder="Ex.: O que foi a Revolução Francesa?" />
              </Campo>
              <CampoImagem valor={img} aoMudar={setImg} rotulo="Imagem da pergunta" />
              <Campo rotulo="Resposta (verso)" dica="Comece a linha com - e espaço para fazer uma lista.">
                <textarea rows={4} value={verso} onChange={(e) => setVerso(e.target.value)} onKeyDown={(e) => teclaLista(e, setVerso)} placeholder="Ex.: Revolução na França (1789–1799) que derrubou a monarquia absolutista…" />
              </Campo>
              <CampoImagem valor={imgVerso} aoMudar={setImgVerso} rotulo="Imagem da resposta" />
              <BlocoComparacao ligada={compLigada} aoLigar={setCompLigada} valor={comp} aoMudar={setComp} />
              <Campo rotulo="Dificuldade"><SeletorDificuldade valor={dif} aoMudar={setDif} rotulo="Dificuldade do cartão" /></Campo>
              {erro && <p className="erro-campo" role="alert">{erro}</p>}
              <button className="botao primario"><Plus size={16} strokeWidth={2} aria-hidden="true" /> Adicionar cartão</button>
            </form>
          </section>
        </div>
      </div>

      {editando && <CartaoForm c={editando} aoFechar={() => setEditando(null)} />}
      {editPasta && <PastaForm b={b} aoFechar={() => setEditPasta(false)} />}
    </>
  );
}

function CartaoForm({ c, aoFechar }: { c: Cartao; aoFechar: () => void }) {
  const [frente, setFrente] = useState(c.frente);
  const [verso, setVerso] = useState(c.verso);
  const [dif, setDif] = useState<Dificuldade>(dificuldadeDe(c));
  const [img, setImg] = useState(c.imagem);
  const [imgVerso, setImgVerso] = useState(c.imagemVerso);
  const [compLigada, setCompLigada] = useState(!!c.comparacao);
  const [comp, setComp] = useState<Comparacao>(c.comparacao ?? comparacaoVazia());
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Dialogo titulo="Editar cartão" aoFechar={aoFechar}>
      <form className="form" noValidate onSubmit={(e) => {
        e.preventDefault();
        const compLimpa = compLigada ? limparComparacao(comp) : undefined;
        if (compLigada && !compLimpa) return setErro("Na comparação, dê nome a pelo menos dois itens e preencha uma linha.");
        if ((!frente.trim() && !img) || (!verso.trim() && !imgVerso && !compLimpa)) return setErro("Escreva (ou envie uma imagem) para a pergunta e para a resposta.");
        const { imagem: _a, imagemVerso: _b, comparacao: _c, ...resto } = c;
        salvar("cartoes", { ...resto, frente: frente.trim(), verso: verso.trim(), dificuldade: dif, ...(img ? { imagem: img } : {}), ...(imgVerso ? { imagemVerso: imgVerso } : {}), ...(compLimpa ? { comparacao: compLimpa } : {}) });
        aoFechar();
      }}>
        <Campo rotulo="Pergunta (frente)"><textarea rows={3} value={frente} onChange={(e) => setFrente(e.target.value)} onKeyDown={(e) => teclaLista(e, setFrente)} /></Campo>
        <CampoImagem valor={img} aoMudar={setImg} rotulo="Imagem da pergunta" />
        <Campo rotulo="Resposta (verso)" dica="Comece a linha com - e espaço para fazer uma lista."><textarea rows={4} value={verso} onChange={(e) => setVerso(e.target.value)} onKeyDown={(e) => teclaLista(e, setVerso)} /></Campo>
        <CampoImagem valor={imgVerso} aoMudar={setImgVerso} rotulo="Imagem da resposta" />
        <BlocoComparacao ligada={compLigada} aoLigar={setCompLigada} valor={comp} aoMudar={setComp} />
        <Campo rotulo="Dificuldade"><SeletorDificuldade valor={dif} aoMudar={setDif} rotulo="Dificuldade do cartão" /></Campo>
        {erro && <p className="erro-campo" role="alert">{erro}</p>}
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          <button type="button" className="botao texto" onClick={async () => {
            if (await excluirComDesfazer({ pergunta: "Excluir este cartão?", detalhe: c.frente, feito: "Cartão excluído." }, () => excluir("cartoes", c.id))) aoFechar();
          }}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Excluir</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">Salvar cartão</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

function Estudar({ b }: { b: Baralho }) {
  const todos = useColecao("cartoes");
  const h = hoje();
  const doBaralho = todos.filter((c) => c.baralhoId === b.id);
  const [ids, setIds] = useState<string[] | null>(() => {
    const f = fila(doBaralho, h, false, opcoesEstudo);
    return f.length ? f.map((c) => c.id) : null;
  });
  const [pos, setPos] = useState(0);
  const [virado, setVirado] = useState(false);
  const [placar, setPlacar] = useState({ certo: 0, errado: 0 });
  const palco = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: palco });

  const atual = ids ? doBaralho.find((c) => c.id === ids[pos]) : undefined;
  const total = ids?.length ?? 0;

  const responderCartao = contextSafe((acertou: boolean) => {
    if (!atual || !ids) return;
    salvar("cartoes", responder(atual, acertou, h));
    setPlacar((p) => (acertou ? { ...p, certo: p.certo + 1 } : { ...p, errado: p.errado + 1 }));
    const seguir = () => {
      if (!acertou) setIds([...ids, atual.id]); // errou: volta para o fim da fila de hoje
      setPos((p) => p + 1);
      setVirado(false);
    };
    const el = palco.current?.querySelector(".cartao-3d");
    if (!el || reduzido()) return seguir();
    gsap.to(el, {
      x: acertou ? 260 : -260, rotation: acertou ? 10 : -10, autoAlpha: 0, duration: 0.32, ease: "power2.in",
      onComplete: () => {
        seguir();
        gsap.fromTo(el, { x: 0, rotation: 0, y: 24, autoAlpha: 0, scale: 0.96 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)", clearProps: "all" });
      },
    });
  });

  const voltar = <a href={`#/escola/flashcards/${b.id}`} className="botao texto voltar"><ArrowLeft size={18} strokeWidth={1.6} aria-hidden="true" /> {b.nome}</a>;

  if (!ids) {
    return (
      <>
        {voltar}
        <div className="topo"><h1>Tudo revisado</h1></div>
        {fila(doBaralho, h, true, opcoesEstudo).length === 0 ? (
          <Vazio texto="Nenhum cartão desta pasta tem essa dificuldade. Mude o filtro na pasta ou marque a dificuldade nos cartões." />
        ) : (
          <Vazio
            texto={opcoesEstudo.dificuldade ? "Nenhum cartão dessa dificuldade vence hoje. Quer passar por todos eles mesmo assim?" : "Nenhum cartão desta pasta vence hoje. Quer passar por todos mesmo assim?"}
            acao="Estudar todos"
            aoAgir={() => { setIds(fila(doBaralho, h, true, opcoesEstudo).map((c) => c.id)); setPos(0); }}
          />
        )}
      </>
    );
  }

  if (!atual) {
    return (
      <>
        {voltar}
        <div className="topo"><div><p className="sobretitulo">{b.materia} · {b.nome}</p><h1>Sessão concluída</h1></div></div>
        <div className="numeros numeros-3">
          <div><span className="n-rot">Acertos</span><span className="n-val"><Conta className="num" valor={placar.certo} formatar={(v) => String(Math.round(v))} /></span><small>sobem de caixa</small></div>
          <div><span className="n-rot">Erros</span><span className="n-val"><Conta className={`num ${placar.errado ? "atraso" : ""}`} valor={placar.errado} formatar={(v) => String(Math.round(v))} /></span><small>voltam para a caixa 1</small></div>
          <div><span className="n-rot">Domínio da pasta</span><span className="n-val"><Conta className="num" valor={Math.round(dominio(doBaralho) * 100)} formatar={(v) => String(Math.round(v))} /><span className="unidade">%</span></span><small>{doBaralho.length} cartões</small></div>
        </div>
        <div className="acoes" style={{ justifyContent: "flex-start" }}>
          <a className="botao primario" href={`#/escola/flashcards/${b.id}`}>Voltar para a pasta</a>
          <a className="botao" href="#/escola/flashcards">Outras pastas</a>
        </div>
      </>
    );
  }

  return (
    <div
      className="estudo"
      ref={palco}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); setVirado((v) => !v); }
        if (virado && e.key === "1") responderCartao(false);
        if (virado && e.key === "2") responderCartao(true);
      }}
    >
      {voltar}
      <div className="estudo-topo">
        <p className="sobretitulo">{b.materia} · {b.nome}</p>
        <p className="num suave">{Math.min(pos + 1, total)} / {total}</p>
      </div>
      <div className="estudo-progresso" aria-hidden="true"><i style={{ width: `${(pos / total) * 100}%` }} /></div>

      <button className={`cartao-3d ${virado ? "virado" : ""}`} onClick={() => setVirado((v) => !v)} aria-label={virado ? `Resposta: ${atual.verso || (atual.comparacao ? "comparação" : "imagem")}. Toque para ver a pergunta.` : `Pergunta: ${atual.frente || "imagem"}. Toque para ver a resposta.`}>
        <span className={`face frente ${atual.imagem ? "com-img" : ""}`}>
          <span className="face-rotulo">Pergunta</span>
          {atual.imagem && <img className="face-img" src={atual.imagem} alt={atual.frente || "Imagem da pergunta"} draggable={false} />}
          {atual.frente && <span className="face-texto"><TextoCartao texto={atual.frente} /></span>}
          <span className="face-dica">Toque para virar</span>
        </span>
        <span className={`face verso ${atual.imagemVerso ? "com-img" : ""} ${atual.comparacao ? "com-comp" : ""}`}>
          <span className="face-rotulo">Resposta</span>
          {atual.imagemVerso && <img className="face-img" src={atual.imagemVerso} alt={atual.verso || "Imagem da resposta"} draggable={false} />}
          {atual.verso && <span className="face-texto"><TextoCartao texto={atual.verso} /></span>}
          {atual.comparacao && <ComparacaoVista c={atual.comparacao} />}
        </span>
      </button>

      <div className="estudo-dif">
        <span className="opcoes-rotulo">Este cartão é</span>
        <SeletorDificuldade valor={dificuldadeDe(atual)} aoMudar={(d) => salvar("cartoes", { ...atual, dificuldade: d })} rotulo="Dificuldade deste cartão" />
      </div>

      <div className={`estudo-respostas ${virado ? "visivel" : ""}`}>
        <button className="botao resposta-errei" disabled={!virado} onClick={() => responderCartao(false)}>Errei <kbd>1</kbd></button>
        <button className="botao primario" disabled={!virado} onClick={() => responderCartao(true)}>Acertei <kbd>2</kbd></button>
      </div>
    </div>
  );
}
