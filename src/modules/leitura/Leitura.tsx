import { Fragment, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Pencil, Play, Plus, Trash2 } from "../../components/icones.tsx";
import type { Config, Livro } from "../../data/types.ts";
import { excluir, salvar, salvarConfig, useColecao, useConfig } from "../../data/store.ts";
import { brCurta, hoje } from "../../data/datas.ts";
import { lerNumero, novoId } from "../../data/formato.ts";
import { Campo, Dialogo, Vazio, confirmar, excluirComDesfazer, mostrarAviso, useAgora } from "../../components/ui.tsx";
import { Conta } from "../../components/movimento.tsx";
import { liberarSom, soltarSom, tocarAlarme, useTelaAcesa } from "../../components/alerta.ts";
import { navegar } from "../../rota.ts";
import { useBuscaLivros, type SugestaoLivro } from "./catalogo.ts";
import { encerrar, lidoNoDia, linkAtalho, minutosDe, paginasDe, previsao, sequencia, sessaoAtiva, urlDeVolta } from "./logica.ts";

const MINUTOS = [15, 20, 30, 45, 60];
/** Aberto pelo ícone da Tela de Início (web app) e não numa aba do Safari. */
const emAppDaTela = () => (navigator as { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
/** Só no Safari o atalho devolve para a página; no app da Tela de Início não há como voltar sozinho (ver `urlDeVolta`). */
const voltaDoAtalho = (hash = "#/mais/leitura/agora") => urlDeVolta(emAppDaTela(), location.origin, location.pathname, hash);
/**
 * Liga o Foco ao começar. Modo "sem sair do app": nada a fazer aqui (a sessão mostra o que acionar: Toque Duplo, Botão de Ação…).
 * Senão, abre o app Atalhos. O app não mexe mais no Foco depois disso: a pessoa desliga quando quiser.
 */
function ligarFocoAoIniciar(cfg: Config, minutos: number) {
  if (cfg.focoSemSair || !cfg.atalhoLeitura) return;
  location.href = linkAtalho(cfg.atalhoLeitura, minutos, voltaDoAtalho());
}
const temFoco = (cfg: Config) => cfg.focoSemSair || !!cfg.atalhoLeitura;

/** Leitura: metas do dia, livros (página onde parou) e sessões cronometradas. Rotas: #/mais/leitura[/agora]. */
export default function Leitura({ sub }: { sub?: string }) {
  return sub === "agora" ? <LendoAgora /> : <Estante />;
}

function Estante() {
  const livros = useColecao("livros");
  const leituras = useColecao("leituras");
  const cfg = useConfig();
  const h = hoje();
  const [editando, setEditando] = useState<Livro | "novo" | null>(null);
  const [iniciando, setIniciando] = useState<Livro | null>(null);
  const ativa = sessaoAtiva(leituras);
  const lendo = livros.filter((l) => l.estado === "lendo").sort((a, b) => b._m - a._m);
  const lidos = livros.filter((l) => l.estado === "lido").sort((a, b) => (b.concluidoEm ?? "").localeCompare(a.concluidoEm ?? ""));
  const dia = lidoNoDia(leituras, h);
  const seq = sequencia(leituras, h);
  const pct = (v: number, m: number) => (m > 0 ? Math.min(100, Math.round((v / m) * 100)) : 0);

  return (
    <>
      <div className="topo">
        <div>
          <p className="sobretitulo">Leitura</p>
          <h1>Estante</h1>
        </div>
        <button className="botao primario" onClick={() => setEditando("novo")}><Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Livro</button>
      </div>

      {ativa && (
        <a className="folha leitura-ativa" href="#/mais/leitura/agora">
          <span className="sobretitulo">Lendo agora</span>
          <strong>{livros.find((l) => l.id === ativa.livroId)?.titulo ?? "Livro"}</strong>
          <span className="botao primario pequeno">Voltar para a leitura</span>
        </a>
      )}

      <div className="numeros numeros-3">
        <div>
          <span className="n-rot">Páginas hoje</span>
          <span className="n-val"><Conta className="num" valor={dia.paginas} formatar={(v) => String(Math.round(v))} /><span className="unidade">/{cfg.metaPaginasDia}</span></span>
          <span className="mini-regua" aria-hidden="true"><i style={{ width: `${pct(dia.paginas, cfg.metaPaginasDia)}%` }} /></span>
        </div>
        <div>
          <span className="n-rot">Minutos hoje</span>
          <span className="n-val"><Conta className="num" valor={dia.minutos} formatar={(v) => String(Math.round(v))} /><span className="unidade">/{cfg.metaMinutosLeitura}</span></span>
          <span className="mini-regua" aria-hidden="true"><i style={{ width: `${pct(dia.minutos, cfg.metaMinutosLeitura)}%` }} /></span>
        </div>
        <div>
          <span className="n-rot">Sequência</span>
          <span className="n-val"><Conta className="num" valor={seq} formatar={(v) => String(Math.round(v))} /><span className="unidade"> {seq === 1 ? "dia" : "dias"}</span></span>
          <small>{seq ? "dias seguidos" : "leia hoje"}</small>
        </div>
      </div>

      <div className="grade-tela grade-leitura">
        <div className="col-principal">
          <section className="secao">
            <header><h2>Lendo <small className="num">{lendo.length}</small></h2></header>
            {lendo.length === 0 ? (
              <Vazio texto="Cadastre o livro que você está lendo: nome, total de páginas e onde parou." acao="Adicionar livro" aoAgir={() => setEditando("novo")} />
            ) : (
              <ul className="lista livros">
                {lendo.map((l) => {
                  const p = previsao(l, cfg.metaPaginasDia);
                  return (
                    <li key={l.id} className="livro">
                      <div className="livro-corpo">
                        <p className="livro-titulo">{l.titulo}</p>
                        {l.autor && <p className="livro-autor">{l.autor}</p>}
                        <p className="livro-pagina num">pág. {l.pagina} de {l.paginas}<span className="suave"> · faltam {p.faltam}{p.dias ? ` (≈ ${p.dias} ${p.dias === 1 ? "dia" : "dias"} na sua meta)` : ""}</span></p>
                        <span className="mini-regua" aria-label={`${pct(l.pagina, l.paginas)}% lido`}><i style={{ width: `${pct(l.pagina, l.paginas)}%` }} /></span>
                      </div>
                      <div className="livro-acoes">
                        {ativa ? (
                          ativa.livroId === l.id && <button className="botao primario" onClick={() => navegar("mais/leitura/agora")}><Play size={16} strokeWidth={1.8} aria-hidden="true" /> Continuar</button>
                        ) : (
                          <button className="botao primario" onClick={() => setIniciando(l)}><Play size={16} strokeWidth={1.8} aria-hidden="true" /> Iniciar leitura</button>
                        )}
                        <button className="icone-btn" onClick={() => setEditando(l)} aria-label={`Editar ${l.titulo}`}><Pencil size={17} strokeWidth={1.6} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {lidos.length > 0 && (
            <section className="secao">
              <header><h2>Lidos <small className="num">{lidos.length}</small></h2></header>
              <ul className="lista livros">
                {lidos.map((l) => (
                  <li key={l.id} className="livro lido">
                    <div className="livro-corpo">
                      <p className="livro-titulo">{l.titulo}</p>
                      <p className="livro-autor">{l.autor}{l.autor && l.concluidoEm && " · "}{l.concluidoEm && <span className="num">terminado em {brCurta(l.concluidoEm)}</span>}</p>
                    </div>
                    <button className="icone-btn" onClick={() => setEditando(l)} aria-label={`Editar ${l.titulo}`}><Pencil size={17} strokeWidth={1.6} /></button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="col-lateral">
          <section className="secao">
            <header><h2>Metas do dia</h2></header>
            <div className="linha-campos">
              <MetaNumero rotulo="Páginas" chave="metaPaginasDia" max={1000} />
              <MetaNumero rotulo="Minutos" chave="metaMinutosLeitura" max={600} />
            </div>
          </section>
          <FocoIphone />
        </div>
      </div>

      {editando && <LivroForm livro={editando === "novo" ? null : editando} aoFechar={() => setEditando(null)} />}
      {iniciando && <IniciarForm livro={iniciando} aoFechar={() => setIniciando(null)} />}
    </>
  );
}

function MetaNumero({ rotulo, chave, max }: { rotulo: string; chave: "metaPaginasDia" | "metaMinutosLeitura"; max: number }) {
  const cfg = useConfig();
  const [t, setT] = useState(String(cfg[chave]));
  const [erro, setErro] = useState<string | null>(null);
  const valorSalvo = cfg[chave];
  useEffect(() => setT(String(valorSalvo)), [valorSalvo]);
  const salvarSe = () => {
    const v = lerNumero(t);
    if (v === null || Number.isNaN(v) || !Number.isInteger(v) || v < 0 || v > max) return setErro(`Um número inteiro de 0 a ${max}.`);
    setErro(null);
    if (v !== cfg[chave]) { salvarConfig({ [chave]: v }); mostrarAviso(`Meta de ${rotulo.toLowerCase()}: ${v} por dia.`); }
  };
  return (
    <Campo rotulo={rotulo} erro={erro}>
      <input className="num" inputMode="numeric" value={t} aria-invalid={!!erro} onChange={(e) => setT(e.target.value)} onBlur={salvarSe} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
    </Campo>
  );
}

/** Configuração do atalho do iPhone que liga o Foco "Leitura". */
function FocoIphone() {
  const cfg = useConfig();
  const [nome, setNome] = useState(cfg.atalhoLeitura);
  useEffect(() => setNome(cfg.atalhoLeitura), [cfg.atalhoLeitura]);
  const salvarNome = () => {
    const n = nome.trim();
    if (n !== cfg.atalhoLeitura) { salvarConfig({ atalhoLeitura: n }); mostrarAviso(n ? `Ao iniciar a leitura, o app roda o atalho "${n}".` : "Iniciar leitura não liga mais o foco do iPhone."); }
  };
  return (
    <section className="secao foco-iphone">
      <header><h2>Foco no iPhone</h2></header>
      <label className="opcao-linha">
        <input type="checkbox" className="check" checked={cfg.focoSemSair} onChange={(e) => { salvarConfig({ focoSemSair: e.target.checked }); mostrarAviso(e.target.checked ? "O Foco liga sem sair do app: você aciona o atalho." : "O Foco volta a abrir o app Atalhos."); }} />
        <span>Ligar o Foco sem sair do app <small className="suave">(recomendado se você usa o Rotina pela Tela de Início)</small></span>
      </label>
      <Campo rotulo="Nome do atalho (só para abrir o Atalhos)" dica={cfg.focoSemSair ? "Não é preciso com a chave acima ligada." : 'Deixe vazio para não usar. Com o nome, "Iniciar leitura" abre o app Atalhos e liga o Foco. No app da Tela de Início o iPhone não volta sozinho: você toca no ícone do Rotina.'}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={salvarNome} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} placeholder="Ex.: Iniciar leitura" />
      </Campo>
      <details className="passo-a-passo">
        <summary>Como montar no iPhone (uma vez só)</summary>
        <ol>
          <li><b>Criar o Foco.</b> Ajustes → Foco → + → Leitura. Em <i>Pessoas</i> e <i>Apps</i>, não permita ninguém (assim nenhuma notificação chega). Em <i>Telas</i>, escolha uma página da Tela de Início só com o Rotina.</li>
          <li><b>Criar o atalho</b> no app Atalhos, com <b>uma ação só</b>: <i>Definir Foco</i> → <i>Leitura</i> → <i>Ativar</i> (sem horário: o Foco fica ligado até você desligar). Nome sugerido: Iniciar leitura.</li>
          <li><b>Ligar sem sair do app</b> (chave acima): ao iniciar a leitura, o Rotina avisa e você aciona o atalho por um gesto, que roda por cima do app, sem abrir o Atalhos: <i>Toque Duplo</i> atrás do iPhone (Ajustes → Acessibilidade → Toque → Toque Atrás), <i>Botão de Ação</i> (Ajustes → Botão de Ação → Atalho) ou o botão <i>Atalhos</i> da Central de Controle (editar → Adicionar controle).</li>
          <li><b>Preparar o Acesso Guiado</b> (é ele que impede de sair para outro app): Ajustes → Acessibilidade → Acesso Guiado → ligar. Em <i>Ajustes do código</i>, defina o código (ou ligue o Face ID).</li>
          <li><b>Ler:</b> toque em <i>Iniciar leitura</i>, ligue o Foco (gesto) e clique <b>3 vezes no botão lateral</b> → <i>Opções</i> → <i>Limite de tempo</i> (os mesmos minutos) → <i>Iniciar</i>. Ao acabar, o alarme toca. Para desligar o Foco: Central de Controle → Foco → Leitura.</li>
        </ol>
        <p className="suave">Se você preferir que o Rotina abra o app Atalhos (campo "Nome do atalho"), o iPhone para lá e não volta sozinho para o app da Tela de Início. Dica: no fim do atalho, tente a ação <i>Abrir App</i> e procure <i>Rotina</i>; se ele não aparecer na lista, o iOS não deixa.</p>
        <p className="suave">Por que não volta sozinho com o nome do atalho: o iPhone não deixa um atalho ou site voltar para um web app instalado. Qualquer link abre o Safari, que não enxerga a sua leitura, e o endereço <code>webapp://</code> deixou de funcionar no iOS 26. E nenhum site liga o Acesso Guiado: só você (botão lateral, Siri ou Central de Controle).</p>
        <p className="suave">Som de fim de tempo: o app toca um alarme de uns 6 segundos. Se não tocar, confira o volume e a chave de silêncio do iPhone (o app tenta tocar mesmo no silencioso, mas o iOS pode bloquear).</p>
      </details>
    </section>
  );
}

function LivroForm({ livro, aoFechar }: { livro: Livro | null; aoFechar: () => void }) {
  const [titulo, setTitulo] = useState(livro?.titulo ?? "");
  const [autor, setAutor] = useState(livro?.autor ?? "");
  const [paginas, setPaginas] = useState(livro ? String(livro.paginas) : "");
  const [pagina, setPagina] = useState(livro ? String(livro.pagina) : "0");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [daLista, setDaLista] = useState<string | null>(null); // total de páginas veio do catálogo (edição mediana)
  const idLista = useId();
  const refPaginas = useRef<HTMLInputElement>(null);
  const busca = useBuscaLivros(titulo, aberta && !livro);
  const mostrarLista = aberta && !livro && titulo.trim().length >= 3 && (busca.estado !== "parada");
  const escolher = (s: SugestaoLivro) => {
    setTitulo(s.titulo);
    setAutor(s.autor);
    if (s.paginas) { setPaginas(String(s.paginas)); setDaLista(`${s.paginas} págs. é a edição mais comum: confira na sua.`); }
    else { setDaLista(null); setTimeout(() => refPaginas.current?.focus(), 0); }
    setErros({});
    setAberta(false);
    setAtivo(-1);
  };
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    const total = lerNumero(paginas), atual = lerNumero(pagina);
    if (!titulo.trim()) er.titulo = "Escreva o nome do livro.";
    if (total === null || Number.isNaN(total) || !Number.isInteger(total) || total < 1 || total > 10000) er.paginas = "Total de páginas: um número inteiro, como 256.";
    if (atual === null || Number.isNaN(atual) || !Number.isInteger(atual) || atual < 0) er.pagina = "Página onde parou: um número inteiro (0 se ainda não começou).";
    else if (total && atual > total) er.pagina = `O livro tem ${total} páginas.`;
    setErros(er);
    if (Object.keys(er).length) return;
    const terminou = (atual as number) >= (total as number);
    salvar("livros", {
      id: livro?.id ?? novoId("lv"), titulo: titulo.trim(), autor: autor.trim(), paginas: total as number, pagina: atual as number,
      estado: terminou ? "lido" : "lendo", concluidoEm: terminou ? livro?.concluidoEm ?? hoje() : null,
    });
    mostrarAviso(livro ? "Livro salvo." : `${titulo.trim()} está na estante.`);
    aoFechar();
  };
  const apagar = async () => {
    if (!livro) return;
    if (await excluirComDesfazer({ pergunta: `Tirar ${livro.titulo} da estante?`, detalhe: "As leituras já feitas continuam contando nos dias.", feito: "Livro tirado da estante." }, () => excluir("livros", livro.id))) aoFechar();
  };
  return (
    <Dialogo titulo={livro ? "Editar livro" : "Novo livro"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo rotulo="Livro" erro={erros.titulo} dica={livro ? undefined : "Comece a escrever e escolha o livro na lista, ou termine de escrever do seu jeito."}>
          <input
            value={titulo}
            onChange={(e) => { setTitulo(e.target.value); setAberta(true); setAtivo(-1); }}
            onFocus={() => setAberta(true)}
            onBlur={() => setAberta(false)}
            onKeyDown={(e) => {
              if (!mostrarLista || !busca.itens.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((i) => (i + 1) % busca.itens.length); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((i) => (i <= 0 ? busca.itens.length - 1 : i - 1)); }
              else if (e.key === "Enter" && ativo >= 0) { e.preventDefault(); escolher(busca.itens[ativo]); }
              else if (e.key === "Escape") { e.stopPropagation(); setAberta(false); }
            }}
            placeholder="Ex.: Dom Casmurro"
            aria-invalid={!!erros.titulo}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={mostrarLista}
            aria-controls={idLista}
            aria-activedescendant={ativo >= 0 ? `${idLista}-${ativo}` : undefined}
            autoComplete="off"
          />
        </Campo>
        {mostrarLista && (
          <ul className="sugestoes sugestoes-livros" id={idLista} role="listbox" aria-label="Livros encontrados">
            {busca.itens.map((s, i) => (
              <Fragment key={s.chave}>
                <li id={`${idLista}-${i}`} role="option" aria-selected={i === ativo} onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(s)}>
                  <span className="capa-livro" aria-hidden="true"><BookOpen size={16} strokeWidth={1.5} />{s.capa && <img src={s.capa} alt="" width="34" height="50" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = "none")} />}</span>
                  <span className="sugestao-livro">
                    <strong>{s.titulo}</strong>
                    <small>{[s.autor, s.ano, s.paginas ? `${s.paginas} págs.` : null].filter(Boolean).join(" · ") || "sem mais dados"}</small>
                  </span>
                </li>
              </Fragment>
            ))}
            {busca.estado === "buscando" && <li role="presentation" className="sugestoes-status">Procurando livros…</li>}
            {busca.estado === "erro" && <li role="presentation" className="sugestoes-status">Não consegui buscar agora (sem internet?). Escreva o nome e preencha o resto.</li>}
            {busca.estado === "ok" && busca.itens.length === 0 && <li role="presentation" className="sugestoes-status">Nenhum livro com esse nome. Use o nome que você escreveu e preencha o resto.</li>}
            {busca.estado === "ok" && busca.itens.length > 0 && <li role="presentation" className="sugestoes-status">Fonte: Open Library. Não é o seu livro? Continue escrevendo.</li>}
          </ul>
        )}
        <Campo rotulo="Autor (opcional)"><input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Ex.: Machado de Assis" /></Campo>
        <div className="linha-campos">
          <Campo rotulo="Total de páginas" erro={erros.paginas} dica={daLista ?? undefined}><input ref={refPaginas} className="num" inputMode="numeric" value={paginas} onChange={(e) => { setPaginas(e.target.value); setDaLista(null); }} placeholder="256" aria-invalid={!!erros.paginas} /></Campo>
          <Campo rotulo="Página onde parou" erro={erros.pagina}><input className="num" inputMode="numeric" value={pagina} onChange={(e) => setPagina(e.target.value)} aria-invalid={!!erros.pagina} /></Campo>
        </div>
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          {livro ? <button type="button" className="botao texto" onClick={apagar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Tirar da estante</button> : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
            <button className="botao primario">{livro ? "Salvar livro" : "Pôr na estante"}</button>
          </div>
        </div>
      </form>
    </Dialogo>
  );
}

function IniciarForm({ livro, aoFechar }: { livro: Livro; aoFechar: () => void }) {
  const cfg = useConfig();
  const [min, setMin] = useState(String(cfg.metaMinutosLeitura || 30));
  const [pagina, setPagina] = useState(String(livro.pagina));
  const [foco, setFoco] = useState(temFoco(cfg));
  const [erro, setErro] = useState<string | null>(null);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const m = lerNumero(min), p = lerNumero(pagina);
    if (m === null || Number.isNaN(m) || !Number.isInteger(m) || m < 1 || m > 600) return setErro("Tempo: minutos inteiros, de 1 a 600.");
    if (p === null || Number.isNaN(p) || !Number.isInteger(p) || p < 0 || p > livro.paginas) return setErro(`Página: de 0 a ${livro.paginas}.`);
    const ligarFoco = foco && temFoco(cfg);
    liberarSom(true); // este toque libera o som do alarme de fim de tempo
    salvar("leituras", { id: novoId("le"), livroId: livro.id, data: hoje(), inicio: Date.now(), planejadoMin: m, fim: null, paginaInicio: p, paginaFim: null, focoIphone: ligarFoco });
    if (p !== livro.pagina) salvar("livros", { ...livro, pagina: p });
    aoFechar();
    navegar("mais/leitura/agora");
    if (ligarFoco) ligarFocoAoIniciar(cfg, m);
  };
  return (
    <Dialogo titulo="Iniciar leitura" aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar} noValidate>
        <p className="livro-titulo" style={{ margin: 0 }}>{livro.titulo}</p>
        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Quanto tempo</span>
          <div className="opcoes" role="group" aria-label="Minutos de leitura">
            {MINUTOS.map((m) => (
              <button key={m} type="button" className="opcao opcao-neutra" aria-pressed={min === String(m)} onClick={() => setMin(String(m))}>{m} min</button>
            ))}
          </div>
          <div className="linha-campos">
            <Campo rotulo="Minutos"><input className="num" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} /></Campo>
            <Campo rotulo="Começo na página"><input className="num" inputMode="numeric" value={pagina} onChange={(e) => setPagina(e.target.value)} /></Campo>
          </div>
        </fieldset>
        {temFoco(cfg) ? (
          <label className="opcao-linha">
            <input type="checkbox" className="check" checked={foco} onChange={(e) => setFoco(e.target.checked)} />
            <span>Ligar o Foco no iPhone <small className="suave">{cfg.focoSemSair ? "(você aciona o atalho, sem sair daqui)" : `(abre o atalho "${cfg.atalhoLeitura}")`}</small></span>
          </label>
        ) : (
          <p className="suave" style={{ fontSize: 13 }}>Para silenciar o iPhone durante a leitura, configure "Foco no iPhone" na tela de Leitura.</p>
        )}
        {foco && emAppDaTela() && !cfg.focoSemSair && cfg.atalhoLeitura && (
          <p className="suave" style={{ fontSize: 13, margin: 0 }}>
            No app da Tela de Início, o iPhone para no Atalhos e não volta sozinho.{" "}
            <button type="button" className="link-botao" onClick={() => { salvarConfig({ focoSemSair: true }); mostrarAviso("Agora o Foco liga sem sair do app: você aciona o atalho."); }}>Ligar sem sair do app</button>
          </p>
        )}
        {erro && <p className="erro-campo" role="alert">{erro}</p>}
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario"><Play size={16} strokeWidth={1.8} aria-hidden="true" /> Começar a ler</button>
        </div>
      </form>
    </Dialogo>
  );
}

/** Sessão em andamento: contagem regressiva na lousa; ao encerrar, pergunta a página onde parou. */
function LendoAgora() {
  const leituras = useColecao("leituras");
  const livros = useColecao("livros");
  const ativa = sessaoAtiva(leituras);
  const livro = ativa && livros.find((l) => l.id === ativa.livroId);
  const agora = useAgora(1000).getTime();
  const [encerrando, setEncerrando] = useState(false);
  const [pagina, setPagina] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const avisou = useRef(false);
  useTelaAcesa(!!ativa);

  const fimPlanejado = ativa ? ativa.inicio + ativa.planejadoMin * 60000 : 0;
  const restanteMs = fimPlanejado - agora;
  const cumprido = !!ativa && restanteMs <= 0;
  // O som precisa de um toque para ser liberado no iPhone: libera no primeiro toque da sessão (e de novo se o app voltou do fundo).
  useEffect(() => {
    if (!ativa) return;
    const liberar = () => liberarSom(true);
    document.addEventListener("pointerdown", liberar, { capture: true, passive: true });
    return () => { document.removeEventListener("pointerdown", liberar, true); soltarSom(); };
  }, [!!ativa]); // eslint-disable-line react-hooks/exhaustive-deps
  // Acabou o tempo com o app aberto: toca o alarme (uma vez). O app não desliga o Foco: a pessoa desliga quando quiser.
  useEffect(() => {
    if (!ativa || !cumprido || restanteMs <= -60_000 || avisou.current) return;
    avisou.current = true;
    mostrarAviso(ativa.focoIphone ? "Tempo de leitura cumprido. Desligue o Foco quando quiser." : "Tempo de leitura cumprido.");
    void tocarAlarme(4);
  }, [ativa, cumprido, restanteMs]);
  const maisCinco = () => {
    if (!ativa) return;
    liberarSom(true);
    salvar("leituras", { ...ativa, planejadoMin: ativa.planejadoMin + 5 });
    avisou.current = false;
  };
  // Preenche só uma vez, com a página de início. Antes o efeito reagia ao campo vazio e devolvia o número a cada apagada.
  const preencheu = useRef(false);
  useEffect(() => { if (ativa && !preencheu.current) { preencheu.current = true; setPagina(String(ativa.paginaInicio)); } }, [ativa]);

  const voltar = <a href="#/mais/leitura" className="botao texto voltar"><ArrowLeft size={18} strokeWidth={1.6} aria-hidden="true" /> Leitura</a>;
  if (!ativa || !livro) {
    return <>{voltar}<h1 style={{ marginBottom: 16 }}>Leitura</h1><Vazio texto="Nenhuma leitura em andamento." acao="Ver livros" aoAgir={() => navegar("mais/leitura")} /></>;
  }

  const seg = Math.abs(Math.round(restanteMs / 1000));
  const relogio = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
  const fracao = Math.max(0, Math.min(1, restanteMs / (ativa.planejadoMin * 60000)));

  const salvarFim = (e: React.FormEvent) => {
    e.preventDefault();
    const p = lerNumero(pagina);
    if (p === null || Number.isNaN(p) || !Number.isInteger(p) || p < 0 || p > livro.paginas) return setErro(`Página: de 0 a ${livro.paginas}.`);
    const r = encerrar(ativa, livro, p, Date.now(), hoje());
    salvar("leituras", r.leitura);
    salvar("livros", r.livro);
    const pags = paginasDe(r.leitura), mins = minutosDe(r.leitura);
    const resumo = r.livro.estado === "lido" ? `Você terminou ${livro.titulo}!` : `${pags} ${pags === 1 ? "página" : "páginas"} em ${mins} min. Parou na ${p}.`;
    mostrarAviso(ativa.focoIphone ? `${resumo} Desligue o Foco quando quiser.` : resumo);
    navegar("mais/leitura");
  };

  const descartar = async () => {
    if (!(await confirmar("Descartar esta leitura?", "O tempo não conta nas metas. A página do livro continua como estava.", "Descartar"))) return;
    excluir("leituras", ativa.id);
    navegar("mais/leitura");
  };

  return (
    <div className="lendo">
      {voltar}
      <p className="sobretitulo">{cumprido ? "Tempo cumprido" : "Lendo"}</p>
      <h1 className="lendo-titulo">{livro.titulo}</h1>
      <p className="suave">{livro.autor}{livro.autor && " · "}<span className="num">começou na pág. {ativa.paginaInicio} de {livro.paginas}</span></p>

      <div className={`lousa contador lendo-relogio ${cumprido ? "cumprido" : ""}`} role="timer" aria-live="off" aria-label={cumprido ? `Tempo cumprido, ${relogio} a mais` : `Faltam ${relogio}`}>
        <div className="contador-descanso">
          <svg viewBox="0 0 120 120" className="anel-giz" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="anel-fundo" />
            <circle cx="60" cy="60" r="52" className="anel-giro" style={{ strokeDasharray: 326.7, strokeDashoffset: 326.7 * (1 - fracao) }} />
          </svg>
          <div className="contador-centro">
            <span className="contador-rotulo">{cumprido ? "a mais" : "faltam"}</span>
            <span className="contador-tempo num">{cumprido ? "+" : ""}{relogio}</span>
          </div>
        </div>
        <p className="contador-proxima">{cumprido ? `Meta de ${ativa.planejadoMin} min cumprida. Pode continuar lendo.` : `${ativa.planejadoMin} min de leitura`}</p>
        {!encerrando && (
          <div className="contador-botoes">
            <button className="botao giz" onClick={maisCinco}><Plus size={16} strokeWidth={2} aria-hidden="true" /> 5 min</button>
            <button className="botao giz" aria-pressed={cumprido} onClick={() => setEncerrando(true)}>Encerrar leitura</button>
          </div>
        )}
      </div>

      {encerrando && (
        <form className="folha form encerrar-leitura" onSubmit={salvarFim} noValidate>
          <Campo rotulo="Em que página você parou?" erro={erro} dica={`O livro tem ${livro.paginas} páginas.`}>
            <input className="num" inputMode="numeric" value={pagina} onChange={(e) => setPagina(e.target.value)} autoFocus aria-invalid={!!erro} />
          </Campo>
          <div className="acoes" style={{ justifyContent: "space-between" }}>
            <button type="button" className="botao texto" onClick={descartar}><Trash2 size={16} strokeWidth={1.6} aria-hidden="true" /> Descartar</button>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="botao" onClick={() => setEncerrando(false)}>Voltar a ler</button>
              <button className="botao primario">Salvar leitura</button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
