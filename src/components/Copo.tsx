/**
 * Copo d'água. O nível sobe com mola (GSAP, uma vez por mudança). A ondulação é só CSS com `transform`:
 * roda na GPU e não repinta nada. (A versão anterior animava o desenho SVG em loop infinito e repintava
 * a tela ~120 vezes por segundo, o que travava o celular.)
 */
import { useRef } from "react";
import { gsap, reduzido, useGSAP } from "./movimento.tsx";

const H = 154; // altura do desenho, em unidades do viewBox (largura 120)
const CORPO = "M14 8 L106 8 L96 140 Q95 146 89 146 L31 146 Q25 146 24 140 Z";

export default function Copo({ ml, meta }: { ml: number; meta: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);
  const frac = Math.max(0, Math.min(1, ml / meta));

  useGSAP(
    () => {
      const agua = ref.current?.querySelector(".copo-agua");
      if (!agua) return;
      const topo = ((1 - frac) * 132 + 4) / H; // superfície, como fração da altura do copo
      const alvo = topo * 100;
      if (reduzido()) {
        gsap.set(agua, { yPercent: alvo });
      } else if (primeira.current) {
        gsap.fromTo(agua, { yPercent: 100 }, { yPercent: alvo, duration: 1.1, ease: "elastic.out(1, 0.6)" });
      } else {
        gsap.to(agua, { yPercent: alvo, duration: 1.1, ease: "elastic.out(1, 0.6)" });
      }
      primeira.current = false;
    },
    { dependencies: [frac], scope: ref },
  );

  // marcas de 250 ml, como num copo medidor
  const marcas = Array.from({ length: Math.max(0, Math.floor(meta / 250) - 1) }, (_, i) => {
    const y = 146 - (((i + 1) * 250) / meta) * 132 - 4;
    return <line key={i} x1={i % 2 ? 84 : 78} x2="96" y1={y} y2={y} className="copo-marca" />;
  });

  return (
    <div className="copo" ref={ref} aria-hidden="true">
      <div className="copo-corpo">
        <div className="copo-agua">
          <i className="onda onda-2" />
          <i className="onda onda-1" />
          <i className="massa" />
        </div>
      </div>
      <svg className="copo-vidro" viewBox={`0 0 120 ${H}`}>
        {marcas}
        <path d={CORPO} className="copo-borda" />
        <path d="M22 18 L30 128" className="copo-brilho" />
      </svg>
    </div>
  );
}
