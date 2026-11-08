import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { X } from "./icones.tsx";
import type { Dia } from "../data/types.ts";
import { DIAS, DIAS_CURTOS, DIAS_LONGOS } from "../data/datas.ts";

// ------------------------------------------------------------ diálogo

export function Dialogo({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const primeiro = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-fechar])");
    primeiro?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      if (e.key === "Tab" && ref.current) {
        const foco = [...ref.current.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href]")].filter((el) => !el.hasAttribute("disabled"));
        const a = foco[0], z = foco[foco.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z?.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a?.focus(); }
      }
    };
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
      anterior?.focus?.();
    };
  }, [aoFechar]);
  return (
    <div className="fundo-dialogo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <header>
          <h2 id={id}>{titulo}</h2>
          <button className="icone-btn" data-fechar onClick={aoFechar} aria-label="Fechar">
            <X size={20} strokeWidth={1.6} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ confirmação e aviso com desfazer

type Pedido = { titulo: string; texto: string; botao: string; resolver: (ok: boolean) => void } | null;
type Aviso = { texto: string; desfazer?: () => void; id: number } | null;

let pedido: Pedido = null;
let aviso: Aviso = null;
const ouv = new Set<() => void>();
const avisar = () => ouv.forEach((f) => f());
const assinar = (f: () => void) => (ouv.add(f), () => ouv.delete(f));

export function confirmar(titulo: string, texto: string, botao = "Excluir"): Promise<boolean> {
  return new Promise((resolver) => {
    pedido = { titulo, texto, botao, resolver };
    avisar();
  });
}

let timerAviso: ReturnType<typeof setTimeout> | undefined;
export function mostrarAviso(texto: string, desfazer?: () => void) {
  clearTimeout(timerAviso);
  aviso = { texto, desfazer, id: Date.now() };
  avisar();
  timerAviso = setTimeout(() => {
    aviso = null;
    avisar();
  }, desfazer ? 7000 : 3500);
}

/** Pede confirmação, executa a exclusão e mostra "Desfazer". */
export async function excluirComDesfazer(
  t: { pergunta: string; detalhe: string; feito: string },
  executar: () => () => void,
) {
  if (!(await confirmar(t.pergunta, t.detalhe))) return false;
  mostrarAviso(t.feito, executar());
  return true;
}

export function Camadas() {
  const p = useSyncExternalStore(assinar, () => pedido);
  const a = useSyncExternalStore(assinar, () => aviso);
  const fim = (ok: boolean) => {
    p?.resolver(ok);
    pedido = null;
    avisar();
  };
  return (
    <>
      {p && (
        <Dialogo titulo={p.titulo} aoFechar={() => fim(false)}>
          <p className="suave" style={{ marginBottom: 20 }}>{p.texto}</p>
          <div className="acoes">
            <button className="botao" onClick={() => fim(false)}>Cancelar</button>
            <button className="botao perigo" onClick={() => fim(true)}>{p.botao}</button>
          </div>
        </Dialogo>
      )}
      <div aria-live="polite">
        {a && (
          <div className="aviso" key={a.id} role="status">
            <p>{a.texto}</p>
            {a.desfazer && (
              <button
                onClick={() => {
                  a.desfazer?.();
                  aviso = null;
                  avisar();
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ------------------------------------------------------------ campos

export function Campo({ rotulo, erro, children, dica }: { rotulo: string; erro?: string | null; children: ReactNode; dica?: string }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {dica && !erro && <small className="suave">{dica}</small>}
      {erro && <small className="erro" role="alert">{erro}</small>}
    </label>
  );
}

export function Vazio({ texto, acao, aoAgir }: { texto: string; acao?: string; aoAgir?: () => void }) {
  return (
    <div className="vazio">
      <p>{texto}</p>
      {acao && <button className="botao primario" onClick={aoAgir}>{acao}</button>}
    </div>
  );
}

/** Seletor de dias com atalhos — é o "Repetir" de tudo que é semanal. */
export function DiasRepetir({ valor, aoMudar, rotulo = "Repetir em" }: { valor: Dia[]; aoMudar: (d: Dia[]) => void; rotulo?: string }) {
  const tem = (d: Dia) => valor.includes(d);
  const alternar = (d: Dia) => aoMudar(tem(d) ? valor.filter((x) => x !== d) : [...valor, d].sort() as Dia[]);
  const igual = (l: Dia[]) => l.length === valor.length && l.every(tem);
  const atalhos: [string, Dia[]][] = [
    ["Seg a sex", [0, 1, 2, 3, 4]],
    ["Fim de semana", [5, 6]],
    ["Todos os dias", DIAS],
  ];
  return (
    <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
      <span>{rotulo}</span>
      <div className="dias">
        {DIAS.map((d) => (
          <button type="button" key={d} aria-pressed={tem(d)} aria-label={DIAS_LONGOS[d]} onClick={() => alternar(d)}>
            {DIAS_CURTOS[d]}
          </button>
        ))}
      </div>
      <div className="dias-atalhos">
        {atalhos.map(([nome, l]) => (
          <button type="button" key={nome} className="chip" aria-pressed={igual(l)} onClick={() => aoMudar(l)}>
            {nome}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Pergunta "só este dia ou todos" ao editar algo criado com Repetir. */
export function EscopoGrupo({ valor, aoMudar, total }: { valor: "um" | "todos"; aoMudar: (v: "um" | "todos") => void; total: number }) {
  if (total <= 1) return null;
  return (
    <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
      <span>Aplicar mudanças em</span>
      <div className="filtros" style={{ padding: 0 }}>
        <button type="button" className="chip" aria-pressed={valor === "um"} onClick={() => aoMudar("um")}>Só este dia</button>
        <button type="button" className="chip" aria-pressed={valor === "todos"} onClick={() => aoMudar("todos")}>
          Todos os {total} dias
        </button>
      </div>
    </fieldset>
  );
}

export function useAgora(intervaloMs = 30_000): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}
