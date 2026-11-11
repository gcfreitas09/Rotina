import { useEffect, useRef } from "react";
import { Cena, gsap, reduzido, useGSAP } from "./components/movimento.tsx";
import { BookOpen, Wallet, GraduationCap, HeartPulse, LayoutGrid, ListChecks, Sunrise, type Icone } from "./components/icones.tsx";
import { useRota } from "./rota.ts";
import { useConfig } from "./data/store.ts";
import { useSync } from "./data/sync.ts";
import { Camadas } from "./components/ui.tsx";
import Hoje from "./modules/hoje/Hoje.tsx";
import Tarefas from "./modules/tarefas/Tarefas.tsx";
import Escola from "./modules/escola/Escola.tsx";
import Saude from "./modules/saude/Saude.tsx";
import Mais from "./modules/mais/Mais.tsx";

const ITENS: { id: string; nome: string; Icone: Icone }[] = [
  { id: "hoje", nome: "Hoje", Icone: Sunrise },
  { id: "tarefas", nome: "Tarefas", Icone: ListChecks },
  { id: "escola", nome: "Escola", Icone: GraduationCap },
  { id: "saude", nome: "Saúde", Icone: HeartPulse },
  { id: "mais", nome: "Mais", Icone: LayoutGrid },
];

function useTema() {
  const { tema } = useConfig();
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () => {
      const escuro = tema === "escuro" || (tema === "sistema" && mq.matches);
      document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", escuro ? "#141414" : "#f4f1ea");
      try {
        localStorage.setItem("rotina:tema", escuro ? "escuro" : "claro");
      } catch { /* sem storage: só não lembra o tema antes de carregar */ }
    };
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, [tema]);
}

const TEXTO_SYNC: Record<string, string> = {
  ok: "Sincronizado",
  sincronizando: "Sincronizando…",
  erro: "Erro ao sincronizar",
  offline: "Sem conexão — salvo neste aparelho",
  "sem-login": "Sincronia: entre na conta",
  desligado: "Só neste aparelho",
};

export default function App() {
  useTema();
  const rota = useRota();
  const sync = useSync();
  const secao = ITENS.some((i) => i.id === rota[0]) ? rota[0] : "hoje";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [secao]);

  const tela =
    secao === "tarefas" ? <Tarefas /> :
    secao === "escola" ? <Escola /> :
    secao === "saude" ? <Saude aba={rota[1]} sub={rota[2]} extra={rota[3]} /> :
    secao === "mais" ? <Mais aba={rota[1]} sub={rota[2]} /> :
    <Hoje />;

  const nav = ITENS.map(({ id, nome, Icone }) => (
    <a key={id} href={`#/${id}`} aria-current={secao === id ? "page" : undefined}>
      <Icone size={21} strokeWidth={1.7} aria-hidden="true" />
      <span>{nome}</span>
    </a>
  ));
  // No desktop a Leitura e as Finanças têm item próprio no menu lateral (no celular ela fica em Mais, para a barra continuar com 5 itens).
  const naLeitura = secao === "mais" && (rota[1] === "leitura" || rota[1] === "financas");
  const navLateral = ITENS.flatMap(({ id, nome, Icone }) => {
    const item = (
      <a key={id} href={`#/${id}`} aria-current={secao === id && !naLeitura ? "page" : undefined}>
        <Icone size={21} strokeWidth={1.7} aria-hidden="true" />
        <span>{nome}</span>
      </a>
    );
    if (id !== "mais") return [item];
    return [
      <a key="leitura" href="#/mais/leitura" aria-current={secao === "mais" && rota[1] === "leitura" ? "page" : undefined}>
        <BookOpen size={21} strokeWidth={1.7} aria-hidden="true" />
        <span>Leitura</span>
      </a>,
      <a key="financas" href="#/mais/financas" aria-current={secao === "mais" && rota[1] === "financas" ? "page" : undefined}>
        <Wallet size={21} strokeWidth={1.7} aria-hidden="true" />
        <span>Finanças</span>
      </a>,
      item,
    ];
  });

  // pílula da barra inferior desliza até o item ativo
  const barra = useRef<HTMLElement>(null);
  const indice = ITENS.findIndex((i) => i.id === secao);
  useGSAP(() => {
    const p = barra.current?.querySelector(".pilula");
    if (!p) return;
    gsap.to(p, { xPercent: indice * 100, duration: reduzido() ? 0 : 0.55, ease: "elastic.out(1, 0.75)" });
  }, { dependencies: [indice], scope: barra });

  return (
    <div className="app">
      <nav className="lateral" aria-label="Seções">
        <div className="marca"><b>Rotina</b><span className="marca-regua" aria-hidden="true" /></div>
        {navLateral}
        <p className="rodape-lat">
          <a href="#/mais/configuracoes" style={{ all: "unset", cursor: "pointer" }}>
            <i className={sync.status === "ok" ? "ok" : ""} aria-hidden="true" />{TEXTO_SYNC[sync.status]}
          </a>
        </p>
      </nav>
      <main className="principal" id="conteudo">
        <Cena chave={rota.join("/")}>{tela}</Cena>
      </main>
      <nav className="barra" aria-label="Seções" ref={barra}>
        <span className="pilula" aria-hidden="true" />
        {nav}
      </nav>
      <Camadas />
    </div>
  );
}
