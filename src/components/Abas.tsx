import { useRef } from "react";
import { gsap, reduzido, useGSAP } from "./movimento.tsx";
import { navegar } from "../rota.ts";

/** Abas com o traço verde que desliza até a aba ativa. */
export default function Abas({ itens, atual, rotulo, base }: { itens: [string, string][]; atual: string; rotulo: string; base: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current;
    const posicionar = (animar: boolean) => {
      const alvo = el?.querySelector<HTMLElement>('[aria-selected="true"]');
      const traco = el?.querySelector<HTMLElement>(".traco");
      if (!alvo || !traco) return;
      gsap.to(traco, { x: alvo.offsetLeft, width: alvo.offsetWidth, duration: animar && !reduzido() ? 0.45 : 0, ease: "power3.inOut" });
    };
    posicionar(true);
    // aba escondida/mostrada por largura de tela (ex.: Leitura some no desktop): o traço acompanha sem animar
    const ro = el ? new ResizeObserver(() => posicionar(false)) : null;
    if (el) ro?.observe(el);
    return () => ro?.disconnect();
  }, { dependencies: [atual], scope: ref });
  return (
    <div className="abas" role="tablist" aria-label={rotulo} ref={ref}>
      {itens.map(([id, nome]) => (
        <button key={id} role="tab" data-aba={id} aria-selected={atual === id} onClick={() => navegar(`${base}/${id}`)}>{nome}</button>
      ))}
      <span className="traco" aria-hidden="true" />
    </div>
  );
}
