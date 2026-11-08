/**
 * A régua — assinatura visual do Rotina. Uma escala com marcações, como a régua
 * do estojo: os 10 pontos do semestre, os ml de água, as horas do dia.
 */
import type { ResultadoSemestre } from "../config/gradingRules.ts";
import { MAXIMOS, MAX_SEMESTRE } from "../config/gradingRules.ts";
import type { Semestre } from "../data/types.ts";
import { nota } from "../data/formato.ts";

/** Semestre: segmentos com a largura do peso de cada avaliação (3,5 · 3,5 · 2 · 1). */
export function ReguaSemestre({ s, res, media }: { s: Semestre; res: ResultadoSemestre; media: number }) {
  const pct = (v: number, max: number) => `${Math.max(0, Math.min(1, v / max)) * 100}%`;
  const provas = res.blocoFinal;
  const p1 = s.p1.nota ?? 0;
  const p2 = s.p2.nota ?? 0;
  // Com recuperação, o bloco das provas inteiro mostra o valor recalculado.
  const seg = res.usouRecuperacao
    ? [
        { k: "rec", rot: "Provas com rec.", max: MAXIMOS.p1 + MAXIMOS.p2, v: provas },
        { k: "t1", rot: "T1", max: MAXIMOS.t1, v: s.t1.nota ?? 0 },
        { k: "t2", rot: "T2", max: MAXIMOS.t2, v: s.t2.nota ?? 0 },
      ]
    : [
        { k: "p1", rot: "P1", max: MAXIMOS.p1, v: p1 },
        { k: "p2", rot: "P2", max: MAXIMOS.p2, v: p2 },
        { k: "t1", rot: "T1", max: MAXIMOS.t1, v: s.t1.nota ?? 0 },
        { k: "t2", rot: "T2", max: MAXIMOS.t2, v: s.t2.nota ?? 0 },
      ];
  return (
    <div aria-hidden="true">
      <div className="regua">
        <div className="regua-trilho">
          {seg.map((g) => (
            <div key={g.k} className={`regua-seg ${g.k === "rec" ? "rec" : ""}`} style={{ flex: g.max }}>
              <i style={{ width: pct(g.v, g.max) }} />
            </div>
          ))}
        </div>
        <div className="regua-ticks" />
        <div className="regua-marca" style={{ left: pct(media, MAX_SEMESTRE) }}>
          <span>{nota(media)}</span>
        </div>
      </div>
      <div className="regua-rotulos">
        {seg.map((g) => (
          <span key={g.k} style={{ flex: g.max }}>{g.rot}</span>
        ))}
      </div>
    </div>
  );
}

/** Régua simples de 0 a `max`, com marcação a cada `passo`. */
export function ReguaSimples({ valor, max, passo, marca, rotulo }: { valor: number; max: number; passo: number; marca?: number; rotulo: string }) {
  const p = Math.max(0, Math.min(1, valor / max)) * 100;
  const divisoes = Math.max(1, Math.round(max / passo));
  return (
    <div role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(valor)}>
      <div className="regua" style={{ height: 24 }}>
        <div className="regua-trilho">
          <div className="regua-seg" style={{ flex: 1 }}>
            <i style={{ width: `${p}%` }} />
          </div>
        </div>
        <div
          className="regua-ticks"
          style={{ backgroundSize: `calc(100% / ${divisoes}) 100%` }}
        />
        {marca !== undefined && <div className="regua-marca" style={{ left: `${(marca / max) * 100}%`, height: 22 }} />}
      </div>
    </div>
  );
}
