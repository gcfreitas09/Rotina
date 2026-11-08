/**
 * Movimento do Rotina (GSAP). Um momento por tela: as seções entram em cascata,
 * números contam até o valor e réguas enchem. Tudo some com "reduzir movimento".
 */
import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
gsap.defaults({ ease: "power3.out", duration: 0.5 });

export const reduzido = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Envolve a tela: a cada troca de `chave`, os filhos com [data-anima] entram em cascata. */
export function Cena({ chave, children }: { chave: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const itens = gsap.utils.toArray<HTMLElement>(".topo, .hoje-cab, .lousa, .numeros > *, .painel > *, .secao, .alerta, .abas, .voltar, .resumo-materia, [data-anima]", ref.current);
        gsap.fromTo(itens, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06, clearProps: "transform,opacity,visibility" });
        // réguas enchem a partir do zero
        gsap.from(gsap.utils.toArray<HTMLElement>(".regua-seg > i, .grafico-barra > span, .mini-regua > i", ref.current), {
          scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "expo.out", stagger: 0.02, delay: 0.15, clearProps: "transform",
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [chave], revertOnUpdate: true },
  );
  return <div ref={ref} className="cena">{children}</div>;
}

/** Número que conta do zero até o valor (formatado por `formatar`). */
export function Conta({ valor, formatar, className, duracao = 1 }: { valor: number | null; formatar: (v: number) => string; className?: string; duracao?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef(0);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || valor === null) return;
      if (reduzido()) { el.textContent = formatar(valor); anterior.current = valor; return; }
      const obj = { v: anterior.current };
      gsap.to(obj, {
        v: valor, duration: duracao, ease: "power2.out",
        onUpdate: () => { el.textContent = formatar(obj.v); },
      });
      anterior.current = valor;
    },
    { dependencies: [valor] },
  );
  return <span ref={ref} className={className}>{valor === null ? "—" : formatar(valor)}</span>;
}

/** Pequeno "pulo" num elemento (ex.: ao marcar algo como feito). */
export function pulso(el: Element | null) {
  if (!el || reduzido()) return;
  gsap.fromTo(el, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: "back.out(3)", clearProps: "transform" });
}

export { gsap, useGSAP };
