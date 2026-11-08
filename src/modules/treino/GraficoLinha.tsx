import { brCurta } from "../../data/datas.ts";
import { num } from "../../data/formato.ts";

/** Linha simples em SVG: evolução de carga ou peso. */
export default function GraficoLinha({ pontos, unidade, rotulo }: { pontos: { data: string; valor: number }[]; unidade: string; rotulo: string }) {
  if (pontos.length === 0) return <p className="suave">Ainda sem registros.</p>;
  const W = 600, H = 180, ml = 36, mr = 12, mt = 14, mb = 26;
  const vals = pontos.map((p) => p.valor);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 2) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min = Math.floor(min - pad); max = Math.ceil(max + pad);
  const x = (i: number) => ml + (pontos.length === 1 ? (W - ml - mr) / 2 : (i / (pontos.length - 1)) * (W - ml - mr));
  const y = (v: number) => mt + (1 - (v - min) / (max - min)) * (H - mt - mb);
  const d = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const marcas = [min, (min + max) / 2, max];
  const passo = Math.max(1, Math.ceil(pontos.length / 6));
  const ultimo = pontos[pontos.length - 1];
  const primeiro = pontos[0];
  const delta = ultimo.valor - primeiro.valor;
  return (
    <figure className="grafico-linha" style={{ margin: "12px 0 0" }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${rotulo}: de ${num(primeiro.valor)} ${unidade} em ${brCurta(primeiro.data)} para ${num(ultimo.valor)} ${unidade} em ${brCurta(ultimo.data)}`}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={ml} x2={W - mr} y1={y(m)} y2={y(m)} stroke="var(--linha)" />
            <text x={ml - 6} y={y(m) + 4} textAnchor="end" className="eixo">{num(m)}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--musgo)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.valor)} r={i === pontos.length - 1 ? 4 : 2.5} fill={i === pontos.length - 1 ? "var(--musgo)" : "var(--papel)"} stroke="var(--musgo)" strokeWidth="1.5" />
        ))}
        {pontos.map((p, i) => (i % passo === 0 || i === pontos.length - 1) && (
          <text key={"t" + i} x={x(i)} y={H - 6} textAnchor={pontos.length > 1 && i === pontos.length - 1 ? "end" : i === 0 && pontos.length > 1 ? "start" : "middle"} className="eixo">{brCurta(p.data)}</text>
        ))}
      </svg>
      <figcaption className="suave" style={{ fontSize: 13 }}>
        {pontos.length > 1 ? (
          <>Desde {brCurta(primeiro.data)}: <span className={`num ${delta >= 0 ? "" : ""}`} style={{ color: "var(--grafite)" }}>{delta > 0 ? "+" : ""}{num(delta)} {unidade}</span></>
        ) : `Um registro: ${num(ultimo.valor)} ${unidade}`}
      </figcaption>
    </figure>
  );
}
