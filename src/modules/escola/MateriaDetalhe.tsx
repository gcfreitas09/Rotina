import { useEffect, useId, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "../../components/icones.tsx";
import type { Avaliacao, Materia, Semestre } from "../../data/types.ts";
import {
  MAXIMOS, MAX_BLOCO_PROVAS, ROTULOS, exameNecessario, faltaNoSemestre, formulaRecuperacao, recuperacaoNecessaria,
  validarNota, type ChaveAvaliacao, type Necessidade, type Regras, type ResultadoSemestre,
} from "../../config/gradingRules.ts";
import { excluir, salvar, useColecao } from "../../data/store.ts";
import { lerNumero, nota } from "../../data/formato.ts";
import { Campo, Dialogo, excluirComDesfazer } from "../../components/ui.tsx";
import { ReguaSemestre } from "../../components/Regua.tsx";
import { Conta } from "../../components/movimento.tsx";
import { navegar } from "../../rota.ts";
import { CHAVES_SEMESTRE, notas, resultado } from "./logica.ts";
import { corSituacao } from "./Escola.tsx";

export default function MateriaDetalhe({ materia: m, regras }: { materia: Materia; regras: Regras }) {
  const r = resultado(m, regras);
  const [renomear, setRenomear] = useState(false);

  const mudarSemestre = (i: 0 | 1, k: keyof Semestre, a: Avaliacao) => {
    const semestres = [...m.semestres] as Materia["semestres"];
    semestres[i] = { ...semestres[i], [k]: a };
    salvar("materias", { ...m, semestres });
  };

  const apagar = async () => {
    const ok = await excluirComDesfazer(
      { pergunta: `Excluir ${m.nome}?`, detalhe: "Todas as notas e datas desta matéria somem dos dois semestres.", feito: `${m.nome} excluída.` },
      () => excluir("materias", m.id),
    );
    if (ok) navegar("escola");
  };

  return (
    <>
      <a href="#/escola" className="botao texto voltar"><ArrowLeft size={18} strokeWidth={1.6} aria-hidden="true" /> Escola</a>
      <div className="topo" style={{ alignItems: "flex-start" }}>
        <h1>{m.nome}</h1>
        <div style={{ display: "flex" }}>
          <button className="icone-btn" onClick={() => setRenomear(true)} aria-label="Renomear matéria"><Pencil size={18} strokeWidth={1.6} /></button>
          <button className="icone-btn" onClick={apagar} aria-label="Excluir matéria"><Trash2 size={18} strokeWidth={1.6} /></button>
        </div>
      </div>

      <div className="resumo-materia">
        <div>
          <p className="sobretitulo">Média anual</p>
          <p className={`grande ${r.anual !== null && r.anual < regras.mediaAprovacao ? "atraso" : ""}`}><Conta valor={r.anual} formatar={nota} /></p>
        </div>
        <div>
          <p className="sobretitulo">Situação</p>
          <p className="situacao-grande" style={{ color: corSituacao(r.situacao) }}>{r.situacao}</p>
          {r.mediaFinal !== null && r.exameDisponivel && <p className="suave">Média final <span className="num">{nota(r.mediaFinal)}</span></p>}
        </div>
      </div>

      <div className="semestres">
      {([0, 1] as const).map((i) => (
        <SemestreBloco key={i} indice={i} s={m.semestres[i]} res={r.semestres[i]} media={regras.mediaAprovacao} aoMudar={(k, a) => mudarSemestre(i, k, a)} />
      ))}
      </div>

      {(r.exameDisponivel || m.exame.nota !== null) && (
        <section className="secao">
          <header>
            <h2>Exame final <small>vale até {nota(MAXIMOS.exame)}</small></h2>
          </header>
          <p className="suave" style={{ marginBottom: 12 }}>
            Média final = (média anual + exame) ÷ 2. Para passar: <span className="num">{nota(regras.minimoExame)}</span>.
          </p>
          <LinhaNota chave="exame" a={m.exame} aoMudar={(a) => salvar("materias", { ...m, exame: a })} />
          {r.anual !== null && m.exame.nota === null && (
            <Calculo titulo="No exame" n={exameNecessario(r.anual, regras.minimoExame)} alvo={regras.minimoExame} garantido="Já passa sem exame." />
          )}
          {r.mediaFinal !== null && r.exameDisponivel && (
            <p className="calculo">({nota(r.anual)} + {nota(m.exame.nota)}) ÷ 2 = <strong className="num">{nota(r.mediaFinal)}</strong></p>
          )}
        </section>
      )}

      {renomear && <Renomear m={m} aoFechar={() => setRenomear(false)} />}
    </>
  );
}

function SemestreBloco({ indice, s, res, media, aoMudar }: {
  indice: 0 | 1; s: Semestre; res: ResultadoSemestre; media: number; aoMudar: (k: keyof Semestre, a: Avaliacao) => void;
}) {
  const ns = notas(s);
  const falta = faltaNoSemestre(ns, media);
  const rec = recuperacaoNecessaria(ns, media);
  const mostrarRec = res.provasLancadas && (s.rec.nota !== null || res.nota < media || falta.tipo === "impossivel");
  return (
    <section className="secao">
      <header>
        <h2>{indice + 1}º semestre {res.usouRecuperacao && <small>com recuperação</small>}</h2>
        <span className={`medio ${res.completo && res.nota < media ? "atraso" : ""}`}><Conta valor={res.nota} formatar={nota} duracao={0.8} /></span>
      </header>
      <ReguaSemestre s={s} res={res} media={media} />

      <div className="notas-tabela">
        {CHAVES_SEMESTRE.map((k) => (
          (k !== "rec" || mostrarRec || s.rec.nota !== null) && (
            <LinhaNota key={k} chave={k} a={s[k]} aoMudar={(a) => aoMudar(k, a)} semData={k === "extra"} />
          )
        ))}
      </div>

      {res.extraAplicado > 0 || s.extra.nota ? (
        <p className="calculo">
          Ponto extra: entrou <span className="num">{nota(res.extraAplicado)}</span>
          {s.extra.nota && res.extraAplicado < s.extra.nota ? " — o semestre não passa de 10" : ""}.
        </p>
      ) : null}
      {s.rec.nota !== null && (
        <p className="calculo">
          Provas com recuperação: ({nota(res.blocoOriginal)} + 2 × {nota(s.rec.nota)}) ÷ 2 ={" "}
          <span className="num">{nota(formulaRecuperacao(res.blocoOriginal, s.rec.nota))}</span>
          {formulaRecuperacao(res.blocoOriginal, s.rec.nota) > MAX_BLOCO_PROVAS && <> → limitado a <span className="num">{nota(MAX_BLOCO_PROVAS)}</span>, o máximo das provas</>}
          {!res.usouRecuperacao && <> → mantida a soma original <span className="num">{nota(res.blocoOriginal)}</span></>}
          .
        </p>
      )}

      {!res.completo && (
        <Calculo
          titulo={falta.pendentes.length ? `Em ${falta.pendentes.map((k) => ROTULOS[k]).join(", ")}` : "No semestre"}
          n={falta}
          alvo={media}
          garantido={`A média ${nota(media)} já está garantida neste semestre.`}
          sufixo={falta.tipo === "precisa" && falta.pendentes.length > 1 ? `somando as ${falta.pendentes.length} avaliações (valem até ${nota(falta.maximo)} juntas)` : undefined}
        />
      )}
      {mostrarRec && s.rec.nota === null && (
        <Calculo titulo="Na recuperação" n={rec} alvo={media} garantido="Não precisa de recuperação." />
      )}
    </section>
  );
}

function Calculo({ titulo, n, alvo, garantido, sufixo }: { titulo: string; n: Necessidade; alvo: number; garantido: string; sufixo?: string }) {
  return (
    <div className="calculadora">
      <p className="sobretitulo">Quanto preciso tirar · {titulo}</p>
      {n.tipo === "garantido" && <p>{garantido}</p>}
      {n.tipo === "precisa" && (
        <p>
          <span className="medio">{nota(n.valor)}</span> <span className="suave">de {nota(n.maximo)}</span>
          {sufixo && <span className="suave" style={{ display: "block", fontSize: 13 }}>{sufixo}</span>}
        </p>
      )}
      {n.tipo === "impossivel" && (
        <p className="atraso">Não é mais possível atingir {nota(alvo)} aqui.</p>
      )}
    </div>
  );
}

function LinhaNota({ chave, a, aoMudar, semData }: { chave: ChaveAvaliacao; a: Avaliacao; aoMudar: (a: Avaliacao) => void; semData?: boolean }) {
  const [texto, setTexto] = useState(a.nota === null ? "" : nota(a.nota));
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    setTexto(a.nota === null ? "" : nota(a.nota));
    setErro(null);
  }, [a.nota]);

  const confirmarNota = () => {
    const v = lerNumero(texto);
    const e = v !== null && Number.isNaN(v) ? "Digite um número, como 7,5." : validarNota(chave, v);
    setErro(e);
    if (!e && v !== a.nota) aoMudar({ ...a, nota: v === null ? null : Math.round(v * 100) / 100 });
  };
  const id = useId();
  return (
    <div className="nota-linha">
      <label htmlFor={id} className="nota-rotulo">
        {ROTULOS[chave]}
        <span className="suave num">até {nota(MAXIMOS[chave])}</span>
      </label>
      <input
        id={id}
        className="entrada num nota-entrada"
        inputMode="decimal"
        value={texto}
        placeholder="—"
        aria-invalid={!!erro}
        aria-describedby={erro ? id + "-e" : undefined}
        onChange={(e) => {
          setTexto(e.target.value);
          const v = lerNumero(e.target.value);
          setErro(v !== null && Number.isNaN(v) ? "Digite um número, como 7,5." : validarNota(chave, v));
        }}
        onBlur={confirmarNota}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      />
      {semData ? <span /> : (
        <input
          type="date"
          className="entrada nota-data"
          aria-label={`Data de ${ROTULOS[chave]}`}
          value={a.data ?? ""}
          onChange={(e) => aoMudar({ ...a, data: e.target.value || null })}
        />
      )}
      {erro && <p className="erro-campo nota-erro" id={id + "-e"} role="alert">{erro}</p>}
    </div>
  );
}

function Renomear({ m, aoFechar }: { m: Materia; aoFechar: () => void }) {
  const todas = useColecao("materias");
  const [nome, setNome] = useState(m.nome);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Dialogo titulo="Renomear matéria" aoFechar={aoFechar}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const n = nome.trim();
          if (!n) return setErro("Dê um nome à matéria.");
          if (todas.some((x) => x.id !== m.id && x.nome.toLowerCase() === n.toLowerCase())) return setErro("Já existe uma matéria com esse nome.");
          salvar("materias", { ...m, nome: n });
          aoFechar();
        }}
      >
        <Campo rotulo="Nome" erro={erro}>
          <input value={nome} onChange={(e) => { setNome(e.target.value); setErro(null); }} aria-invalid={!!erro} />
        </Campo>
        <div className="acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao primario">Salvar nome</button>
        </div>
      </form>
    </Dialogo>
  );
}
