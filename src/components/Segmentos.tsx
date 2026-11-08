import { useRef } from "react";
import { gsap, reduzido, useGSAP } from "./movimento.tsx";

export interface Segmento<T extends string> {
  id: T;
  nome: string;
  /** Número grande em cima do nome. */
  n: number;
}

/**
 * Controle segmentado: uma faixa com N células iguais (número em cima, nome embaixo)
 * e a pílula de seleção que desliza até a célula ativa. Nunca rola para o lado:
 * as células dividem a largura disponível.
 */
export default function Segmentos<T extends string>({ itens, atual, aoMudar, rotulo }: { itens: Segmento<T>[]; atual: T; aoMudar: (id: T) => void; rotulo: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      const alvo = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
      const marca = el?.querySelector<HTMLElement>(".seg-marca");
      if (!alvo || !marca) return;
      gsap.to(marca, { x: alvo.offsetLeft, width: alvo.offsetWidth, duration: reduzido() ? 0 : 0.5, ease: "power3.inOut" });
    },
    { dependencies: [atual, itens.length], scope: ref },
  );
  return (
    <div className="segmentos" role="group" aria-label={rotulo} ref={ref} style={{ ["--n" as string]: itens.length }}>
      <span className="seg-marca" aria-hidden="true" />
      {itens.map((i) => (
        <button key={i.id} className="seg" aria-pressed={atual === i.id} onClick={() => aoMudar(i.id)}>
          <span className="num seg-n">{i.n}</span>
          <span className="seg-t">{i.nome}</span>
        </button>
      ))}
    </div>
  );
}
