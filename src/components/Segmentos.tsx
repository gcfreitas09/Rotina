import { useRef } from "react";
import { gsap, reduzido, useGSAP } from "./movimento.tsx";

export interface Segmento<T extends string> {
  id: T;
  nome: string;
  /** Número grande em cima do nome (opcional). */
  n?: number;
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
      const posicionar = (animar: boolean) => {
        const alvo = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
        const marca = el?.querySelector<HTMLElement>(".seg-marca");
        if (!alvo || !marca) return;
        // overwrite: a troca nova substitui a animação em andamento (duas animações da mesma pílula brigavam: ela ia ao destino,
        // voltava ao ponto antigo e só então deslizava)
        gsap.to(marca, { x: alvo.offsetLeft, width: alvo.offsetWidth, duration: animar && !reduzido() ? 0.5 : 0, ease: "power3.inOut", overwrite: true });
      };
      posicionar(true);
      // a largura das células muda com a tela (girar o celular, redimensionar): a pílula acompanha sem animar.
      // O observador dispara uma vez ao ser criado: só reage se a largura mudou de verdade.
      let largura = el?.offsetWidth ?? 0;
      const ro = el ? new ResizeObserver(() => { const l = el.offsetWidth; if (l === largura) return; largura = l; posicionar(false); }) : null;
      if (el) ro?.observe(el);
      return () => ro?.disconnect();
    },
    { dependencies: [atual, itens.length], scope: ref },
  );
  return (
    <div className="segmentos" role="group" aria-label={rotulo} ref={ref} style={{ ["--n" as string]: itens.length }}>
      <span className="seg-marca" aria-hidden="true" />
      {itens.map((i) => (
        <button key={i.id} className="seg" aria-pressed={atual === i.id} onClick={() => aoMudar(i.id)}>
          {i.n !== undefined && <span className="num seg-n">{i.n}</span>}
          <span className="seg-t">{i.nome}</span>
        </button>
      ))}
    </div>
  );
}
