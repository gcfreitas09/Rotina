import { useState } from "react";
import { Plus, ChevronRight } from "../../components/icones.tsx";
import { salvar, useColecao, useConfig } from "../../data/store.ts";
import { hoje, br, contagem, diasEntre } from "../../data/datas.ts";
import { nota, novoId } from "../../data/formato.ts";
import { Campo, Dialogo, Vazio, mostrarAviso } from "../../components/ui.tsx";
import { navegar, useRota } from "../../rota.ts";
import { Conta } from "../../components/movimento.tsx";
import Abas from "../../components/Abas.tsx";
import Flashcards from "../flashcards/Flashcards.tsx";
import { agendadas, notaAtual, resultado, semestreVazio } from "./logica.ts";
import MateriaDetalhe from "./MateriaDetalhe.tsx";
import GraficoNotas from "./GraficoNotas.tsx";
import type { Situacao } from "../../config/gradingRules.ts";

export function corSituacao(s: Situacao): string {
  return s === "Aprovado" ? "var(--musgo)" : s === "Cursando" ? "var(--grafite-suave)" : "var(--atraso)";
}

function MiniRegua({ valor, media }: { valor: number; media: number }) {
  return (
    <span className="mini-regua" aria-hidden="true">
      <i className={valor < media ? "abaixo" : ""} style={{ width: `${Math.min(100, valor * 10)}%` }} />
      <b style={{ left: `${media * 10}%` }} />
    </span>
  );
}

export default function Escola() {
  const rota = useRota();
  const materias = useColecao("materias");
  const cfg = useConfig();
  const [criando, setCriando] = useState(false);
  const regras = { mediaAprovacao: cfg.mediaAprovacao, minimoExame: cfg.minimoExame };

  const aberta = materias.find((m) => m.id === rota[1]);
  if (rota[1] && aberta) return <MateriaDetalhe materia={aberta} regras={regras} />;
  const abas = (
    <div style={{ marginBottom: 22 }}>
      <Abas itens={[["notas", "Notas e provas"], ["flashcards", "Flashcards"]]} atual={rota[1] === "flashcards" ? "flashcards" : "notas"} rotulo="Escola" base="escola" />
    </div>
  );
  if (rota[1] === "flashcards") return <>{abas}<Flashcards pasta={rota[2]} acao={rota[3]} /></>;

  const ordenadas = [...materias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const res = ordenadas.map((m) => ({ m, r: resultado(m, regras) }));
  const abaixo = res.filter((x) => x.r.abaixoDaMedia).length;
  const fechadas = res.map((x) => notaAtual(x.r)).filter((v): v is number => v !== null);
  const proximas = agendadas(materias, hoje()).slice(0, 8);

  return (
    <>
      {abas}
      <div className="topo">
        <div>
          <p className="sobretitulo">Média para aprovar <span className="num">{nota(cfg.mediaAprovacao)}</span></p>
          <h1>Escola</h1>
        </div>
        <button className="botao primario" onClick={() => setCriando(true)}>
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Nova matéria
        </button>
      </div>

      <div className="grade-tela grade-escola">
      <div className="col-principal col-fixa">

      <section className="secao">
        <header>
          <h2>
            Matérias
            {abaixo > 0 && <small className="atraso">{abaixo} abaixo da média</small>}
          </h2>
        </header>
        {ordenadas.length === 0 ? (
          <Vazio texto="Nenhuma matéria cadastrada." acao="Cadastrar matéria" aoAgir={() => setCriando(true)} />
        ) : (
          <>
            <div className="materia-cab suave" aria-hidden="true">
              <span />
              <span>1º sem.</span>
              <span>2º sem.</span>
              <span>Anual</span>
              <span />
            </div>
            <ul className="lista">
              {res.map(({ m, r }) => (
                <li key={m.id}>
                  <a className={`materia-linha ${r.abaixoDaMedia ? "abaixo" : ""}`} href={`#/escola/${m.id}`}>
                    <span className="materia-nome">
                      <span className="item-titulo">{m.nome}</span>
                      <span className="materia-tags">
                        <span className="selo" style={{ color: corSituacao(r.situacao) }}>
                          {r.situacao}
                          {r.mediaFinal !== null && r.exameDisponivel && ` · final ${nota(r.mediaFinal)}`}
                        </span>
                        {r.semestres.some((s) => s.usouRecuperacao) && <span className="etiqueta suave">com recuperação</span>}
                      </span>
                      {notaAtual(r) !== null && <MiniRegua valor={notaAtual(r)!} media={cfg.mediaAprovacao} />}
                    </span>
                    {r.semestres.map((s, i) => (
                      <span key={i} className={`num materia-nota ${s.completo && s.nota < cfg.mediaAprovacao ? "atraso" : ""}`}>
                        <span className="sr">{i + 1}º semestre: </span>
                        {s.completo ? nota(s.nota) : <span className="suave">{nota(s.nota)}…</span>}
                      </span>
                    ))}
                    <span className={`num materia-nota anual ${r.anual !== null && r.anual < cfg.mediaAprovacao ? "atraso" : ""}`}>
                      <span className="sr">Média anual: </span>
                      {nota(r.anual)}
                    </span>
                    <ChevronRight size={18} strokeWidth={1.5} className="suave" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="suave" style={{ fontSize: 12.5, marginTop: 8 }}>
              Reticências indicam semestre com avaliações ainda sem nota.
            </p>
          </>
        )}
      </section>

      </div>
      <div className="col-lateral col-resumo">
      {res.length > 0 && (
        <div className="numeros numeros-3">
          <div>
            <span className="n-rot">Média geral</span>
            <span className="n-val"><Conta className="num" valor={fechadas.length ? fechadas.reduce((t, v) => t + v, 0) / fechadas.length : null} formatar={nota} /></span>
            <small>{fechadas.length} de {res.length} com nota fechada</small>
          </div>
          <div>
            <span className="n-rot">Aprovado</span>
            <span className="n-val"><Conta className="num" valor={res.filter((x) => x.r.situacao === "Aprovado").length} formatar={(v) => String(Math.round(v))} /></span>
            <small>de {res.length}</small>
          </div>
          <div>
            <span className="n-rot">Em risco</span>
            <span className="n-val"><Conta className={`num ${abaixo ? "atraso" : ""}`} valor={abaixo} formatar={(v) => String(Math.round(v))} /></span>
            <small>{abaixo ? "recuperação ou exame" : "nenhuma"}</small>
          </div>
        </div>
      )}
      <section className="secao">
        <header><h2>Próximas avaliações</h2></header>
        {proximas.length === 0 ? (
          <p className="suave">Nenhuma avaliação com data. Adicione a data na página de cada matéria.</p>
        ) : (
          <ul className="lista">
            {proximas.map((p, i) => {
              const d = diasEntre(hoje(), p.data);
              return (
                <li key={i}>
                  <button className="item item-corpo" style={{ width: "100%" }} onClick={() => navegar(`escola/${p.materiaId}`)}>
                    <span className="contagem num" style={{ color: d <= 3 ? "var(--atraso)" : undefined }}>
                      {d}
                      <small>{d === 1 ? "dia" : "dias"}</small>
                    </span>
                    <span style={{ flex: 1 }}>
                      <span className="item-titulo">{p.materia}</span>
                      <span className="item-meta"><span>{p.rotulo}</span><span>{br(p.data)} · {contagem(d)}</span></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {materias.length > 0 && (
        <section className="secao">
          <header><h2>Comparativo</h2></header>
          <GraficoNotas dados={res.map(({ m, r }) => ({ nome: m.nome, s1: r.semestres[0].nota, s2: r.semestres[1].nota, anual: r.anual, completos: [r.semestres[0].completo, r.semestres[1].completo] }))} media={cfg.mediaAprovacao} />
        </section>
      )}
      </div>
      </div>

      {criando && <NovaMateria aoFechar={() => setCriando(false)} />}
    </>
  );
}

function NovaMateria({ aoFechar }: { aoFechar: () => void }) {
  const materias = useColecao("materias");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const criar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return setErro("Dê um nome à matéria.");
    if (materias.some((m) => m.nome.toLowerCase() === n.toLowerCase())) return setErro("Já existe uma matéria com esse nome.");
    const id = novoId("m");
    salvar("materias", { id, nome: n, semestres: [semestreVazio(), semestreVazio()], exame: { nota: null, data: null } });
    aoFechar(); // fica na lista: para lançar notas, é só abrir a matéria depois
    mostrarAviso(`${n} cadastrada.`);
  };
  return (
    <Dialogo titulo="Nova matéria" aoFechar={aoFechar}>
      <form className="form" onSubmit={criar} noValidate>
        <Campo rotulo="Nome" erro={erro} dica="Já vem com P1, P2, Trabalho 1, Trabalho 2, ponto extra e recuperação nos dois semestres, mais o exame final.">
          <input value={nome} onChange={(e) => { setNome(e.target.value); setErro(null); }} placeholder="Ex.: Química" aria-invalid={!!erro} />
        </Campo>
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario">Criar matéria</button>
        </div>
      </form>
    </Dialogo>
  );
}
