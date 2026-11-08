/** Copo d'água: o nível sobe com animação e a superfície ondula. */
import { useId, useRef } from "react";
import { gsap, reduzido, useGSAP } from "./movimento.tsx";

const W = 120, H = 150;
// copo levemente cônico
const CORPO = `M14 8 L106 8 L96 140 Q95 146 89 146 L31 146 Q25 146 24 140 Z`;

export default function Copo({ ml, meta }: { ml: number; meta: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  const frac = Math.max(0, Math.min(1, ml / meta));
  const anterior = useRef<number | null>(null);

  useGSAP(() => {
    const agua = ref.current?.querySelector(".copo-agua");
    if (!agua) return;
    const alvo = (1 - frac) * (H - 18) + 4; // topo da água
    if (reduzido() || anterior.current === null) gsap.set(agua, { y: reduzido() ? alvo : H });
    gsap.to(agua, { y: alvo, duration: reduzido() ? 0 : 1.1, ease: "elastic.out(1, 0.6)" });
    anterior.current = frac;
  }, { dependencies: [frac], scope: ref });

  useGSAP(() => {
    if (reduzido()) return;
    gsap.to(".onda-1", { x: -60, duration: 2.4, ease: "none", repeat: -1 });
    gsap.to(".onda-2", { x: 60, duration: 3.2, ease: "none", repeat: -1 });
  }, { scope: ref });

  const onda = (y: number) => {
    let d = `M-60 ${y}`;
    for (let x = -60; x < W + 60; x += 30) d += ` q7.5 -5 15 0 t15 0`;
    return d + ` L${W + 60} ${H + 20} L-60 ${H + 20} Z`;
  };

  return (
    <svg ref={ref} className="copo" viewBox={`0 0 ${W} ${H + 4}`} aria-hidden="true">
      <defs>
        <clipPath id={`c${id}`}><path d={CORPO} /></clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--musgo-vivo)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--musgo)" />
        </linearGradient>
      </defs>
      <path d={CORPO} className="copo-fundo" />
      <g clipPath={`url(#c${id})`}>
        <g className="copo-agua">
          <path className="onda-2" d={onda(4)} fill="var(--musgo-vivo)" opacity="0.45" />
          <path className="onda-1" d={onda(8)} fill={`url(#g${id})`} />
        </g>
        {/* marcas de 250 ml, como num copo medidor */}
        {Array.from({ length: Math.floor(meta / 250) - 1 }, (_, i) => {
          const y = 146 - ((i + 1) * 250 / meta) * (H - 18) - 4;
          return <line key={i} x1={i % 2 ? 84 : 78} x2="96" y1={y} y2={y} className="copo-marca" />;
        })}
      </g>
      <path d={CORPO} className="copo-borda" />
      <path d="M22 18 L30 128" className="copo-brilho" />
    </svg>
  );
}
