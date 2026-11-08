import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Upload } from "../../components/icones.tsx";
import type { Config, NomeColecao, Tema } from "../../data/types.ts";
import { COLECOES } from "../../data/types.ts";
import { excluirTudo, incorporar, salvarConfig, useColecao, useConfig } from "../../data/store.ts";
import { exportar, validarBackup } from "../../data/storage.ts";
import { limparExemplos, temExemplos } from "../../data/exemplos.ts";
import {
  entrar, sair, sincronizar, sincronizarTudo, useSync,
} from "../../data/sync.ts";
import { lerNumero, nota } from "../../data/formato.ts";
import { hoje } from "../../data/datas.ts";
import { Campo, confirmar, mostrarAviso } from "../../components/ui.tsx";

export default function Configuracoes() {
  const cfg = useConfig();
  useColecao("materias"); // re-renderiza quando exemplos somem/voltam
  return (
    <>
      <div className="topo"><h1>Configurações</h1></div>
      <div className="grade-config">

      <section className="secao">
        <header><h2>Você</h2></header>
        <TextoConfig rotulo="Seu nome" valor={cfg.nome} aoSalvar={(nome) => salvarConfig({ nome })} placeholder="Como quer ser chamado na tela Hoje" />
      </section>

      <section className="secao">
        <header><h2>Escola</h2></header>
        <div className="linha-campos">
          <NumeroConfig rotulo="Média para aprovar" chave="mediaAprovacao" cfg={cfg} min={0} max={10} formatar={nota} dica="Padrão 7,0" />
          <NumeroConfig rotulo="Mínimo para passar no exame" chave="minimoExame" cfg={cfg} min={0} max={10} formatar={nota} dica="Padrão 5,0" />
        </div>
      </section>

      <section className="secao">
        <header><h2>Saúde</h2></header>
        <div className="linha-campos">
          <NumeroConfig rotulo="Meta de água (ml)" chave="metaAguaMl" cfg={cfg} min={250} max={8000} formatar={(v) => String(v)} dica="Ex.: 2500" inteiro />
          <NumeroConfig rotulo="Descanso entre séries (s)" chave="descansoSeg" cfg={cfg} min={15} max={600} formatar={(v) => String(v)} dica="Ex.: 90" inteiro />
        </div>
      </section>

      <section className="secao">
        <header><h2>Tema</h2></header>
        <div className="filtros" role="group" aria-label="Tema">
          {([["claro", "Claro"], ["escuro", "Escuro"], ["sistema", "Igual ao aparelho"]] as [Tema, string][]).map(([t, n]) => (
            <button key={t} className="chip" aria-pressed={cfg.tema === t} onClick={() => salvarConfig({ tema: t })}>{n}</button>
          ))}
        </div>
      </section>

      <Sincronizacao />
      <Dados />
      </div>
    </>
  );
}

function TextoConfig({ rotulo, valor, aoSalvar, placeholder }: { rotulo: string; valor: string; aoSalvar: (v: string) => void; placeholder?: string }) {
  const [t, setT] = useState(valor);
  useEffect(() => setT(valor), [valor]);
  return (
    <Campo rotulo={rotulo}>
      <input value={t} placeholder={placeholder} onChange={(e) => setT(e.target.value)} onBlur={() => t.trim() !== valor && aoSalvar(t.trim())} />
    </Campo>
  );
}

function NumeroConfig({ rotulo, chave, cfg, min, max, formatar, dica, inteiro }: {
  rotulo: string; chave: "mediaAprovacao" | "minimoExame" | "metaAguaMl" | "descansoSeg"; cfg: Config;
  min: number; max: number; formatar: (v: number) => string; dica: string; inteiro?: boolean;
}) {
  const [t, setT] = useState(formatar(cfg[chave]));
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => setT(formatar(cfg[chave])), [cfg, chave, formatar]);
  const salvarSe = () => {
    const v = lerNumero(t);
    if (v === null || Number.isNaN(v) || v < min || v > max || (inteiro && !Number.isInteger(v))) {
      setErro(`Use ${inteiro ? "um número inteiro" : "um número"} entre ${formatar(min)} e ${formatar(max)}.`);
      return;
    }
    setErro(null);
    if (v !== cfg[chave]) {
      salvarConfig({ [chave]: v });
      mostrarAviso(`${rotulo}: ${formatar(v)}.`);
    }
  };
  return (
    <Campo rotulo={rotulo} erro={erro} dica={dica}>
      <input className="num" inputMode={inteiro ? "numeric" : "decimal"} value={t} aria-invalid={!!erro}
        onChange={(e) => setT(e.target.value)} onBlur={salvarSe} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
    </Campo>
  );
}

const STATUS: Record<string, string> = {
  ok: "Sincronizado",
  sincronizando: "Sincronizando…",
  erro: "Erro",
  offline: "Sem conexão — as mudanças sobem quando a internet voltar",
  "sem-login": "Entre na sua conta para ligar a sincronia",
  desligado: "Desligada — os dados ficam só neste aparelho",
};

function Sincronizacao() {
  const s = useSync();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const acao = async (criar: boolean) => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErro("Digite um e-mail válido.");
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    setOcupado(true);
    const e = await entrar(email.trim(), senha, criar);
    setOcupado(false);
    setErro(e);
    if (!e) {
      setSenha("");
      mostrarAviso("Conectado. Os dados deste aparelho e da conta foram juntados.");
    }
  };

  return (
    <section className="secao">
      <header><h2>Sincronização</h2></header>
      <p className="suave" style={{ marginBottom: 14 }}>
        Junta os dados do celular e do computador numa conta. Nada é apagado na junção: quando o mesmo item foi mudado nos dois, fica a mudança mais recente.
      </p>
      <p style={{ marginBottom: 14 }}>
        <strong>{STATUS[s.status]}</strong>
        {s.email && <span className="suave"> · {s.email}</span>}
        {s.ultimaVez && s.status === "ok" && <span className="suave"> · às {new Date(s.ultimaVez).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
        {s.erro && <span className="erro-campo" style={{ display: "block" }}>{s.erro}</span>}
      </p>

      {s.status === "sem-login" && (
        <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); void acao(false); }}>
          <div className="linha-campos">
            <Campo rotulo="E-mail"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Campo>
            <Campo rotulo="Senha"><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></Campo>
          </div>
          {erro && <p className="erro-campo" role="alert">{erro}</p>}
          <div className="acoes" style={{ justifyContent: "flex-start" }}>
            <button className="botao primario" disabled={ocupado}>Entrar e sincronizar</button>
            <button type="button" className="botao" disabled={ocupado} onClick={() => void acao(true)}>Criar conta</button>
          </div>
          <p className="suave" style={{ fontSize: 13 }}>Use a mesma conta no celular e no computador.</p>
        </form>
      )}

      {s.email && (
        <div className="acoes" style={{ justifyContent: "flex-start" }}>
          <button className="botao primario" onClick={() => void sincronizar()} disabled={s.status === "sincronizando"}>
            <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" /> Sincronizar agora
          </button>
          <button className="botao" onClick={() => void sincronizarTudo().then(() => mostrarAviso("Tudo reenviado e baixado de novo."))} disabled={s.status === "sincronizando"}>
            Reenviar tudo
          </button>
          <button className="botao texto" onClick={() => void sair()}>Sair da conta</button>
        </div>
      )}
    </section>
  );
}

function Dados() {
  const arquivo = useRef<HTMLInputElement>(null);
  const exemplos = temExemplos();

  const baixar = () => {
    const blob = new Blob([JSON.stringify(exportar(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rotina-backup-${hoje()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    mostrarAviso("Backup baixado.");
  };

  const importar = async (f: File) => {
    try {
      const b = validarBackup(JSON.parse(await f.text()));
      let n = 0;
      for (const c of COLECOES as NomeColecao[]) {
        const l = b.dados[c];
        if (l?.length && incorporar(c, l as never[], true)) n += l.length;
      }
      mostrarAviso(n ? "Backup importado e juntado com os dados atuais." : "Nada novo no backup: os dados atuais já estão mais recentes.");
      // Registros importados podem ser mais antigos que o último envio: reenvia tudo para a conta.
      if (n) void sincronizarTudo();
    } catch (e) {
      mostrarAviso(e instanceof SyntaxError ? "O arquivo não é um JSON válido." : (e as Error).message);
    }
  };

  return (
    <section className="secao">
      <header><h2>Dados</h2></header>
      <div className="acoes" style={{ justifyContent: "flex-start" }}>
        <button className="botao" onClick={baixar}><Download size={16} strokeWidth={1.8} aria-hidden="true" /> Exportar backup (JSON)</button>
        <button className="botao" onClick={() => arquivo.current?.click()}><Upload size={16} strokeWidth={1.8} aria-hidden="true" /> Importar backup</button>
        <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = ""; }} />
      </div>
      <p className="suave" style={{ fontSize: 13, margin: "8px 0 18px" }}>Importar junta com o que já existe; não apaga nada.</p>
      <div className="acoes" style={{ justifyContent: "flex-start" }}>
        {exemplos && (
          <button className="botao" onClick={async () => {
            if (await confirmar("Limpar os dados de exemplo?", "Saem as matérias, tarefas, horários, refeições e fichas de exemplo. O que você criou continua.", "Limpar exemplos"))
              mostrarAviso("Exemplos removidos.", limparExemplos());
          }}>Limpar exemplos</button>
        )}
        <button className="botao perigo" onClick={async () => {
          if (await confirmar("Apagar todos os dados?", "Tudo some deste aparelho e, com a sincronia ligada, também da conta e dos outros aparelhos. Exporte um backup antes se quiser guardar.", "Apagar tudo")) {
            excluirTudo();
            mostrarAviso("Todos os dados foram apagados.");
          }
        }}>Apagar todos os dados</button>
      </div>
    </section>
  );
}
