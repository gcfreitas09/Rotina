/**
 * Gráficos das Finanças em SVG puro (sem biblioteca). Regras: um eixo só, linha de 2 px, barras com ponta arredondada de 4 px
 * apoiadas na base, legenda quando há 2+ séries, rótulo direto só no ponto que importa, dica (tooltip) ao tocar/passar,
 * tabela para quem não enxerga a cor. Cores: --graf-entrou (musgo) e --graf-saiu (mostarda), testadas para daltonismo.
 * A linha "desenha" uma vez ao aparecer (GSAP), nunca em loop; com movimento reduzido, aparece pronta.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap, reduzido, useGSAP } from "../../components/movimento.tsx";
import { mesCurto, nomeMesAno, reais, reaisCurto, type PontoMes } from "./logica.ts";

function useLargura<T extends HTMLElement>(inicial = 340) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(inicial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => { const n = Math.round(el.getBoundingClientRect().width); if (n > 0) setW((v) => (Math.abs(v - n) > 1 ? n : v)); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Escala "bonita": 0 incluído e marcas em 1/2/5 × 10^n. */
function escala(min: number, max: number, marcas = 3) {
  const lo = Math.min(0, min), hi = Math.max(0, max, 1);
  const bruto = (hi - lo) / marcas;
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? 10 * pot;
  const a = Math.floor(lo / passo) * passo, b = Math.ceil(hi / passo) * passo;
  const ticks: number[] = [];
  for (let v = a; v <= b + passo / 2; v += passo) ticks.push(v);
  return { a, b, ticks };
}

function Dica({ x, w, children }: { x: number; w: number; children: ReactNode }) {
  const esquerda = x > w / 2;
  return <div className="graf-dica" style={esquerda ? { right: w - x + 10 } : { left: x + 10 }} role="status">{children}</div>;
}

function useDesenhar(dep: unknown) {
  const ref = useRef<SVGSVGElement>(null);
  useGSAP(() => {
    if (reduzido()) return;
    const linhas = ref.current?.querySelectorAll<SVGPathElement>(".graf-traco");
    linhas?.forEach((p) => gsap.fromTo(p, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.out", clearProps: "strokeDashoffset" }));
    const barras = ref.current?.querySelectorAll(".graf-barra");
    if (barras?.length) gsap.from(barras, { scaleY: 0, transformOrigin: "50% 100%", duration: 0.6, ease: "power3.out", stagger: 0.03 });
  }, { dependencies: [dep], scope: ref });
  return ref;
}

const M = { t: 14, r: 12, b: 26, l: 70 };

/** Quanto tem na conta no fim de cada mês (o acumulado). Uma série: o título nomeia, sem legenda. */
export function GraficoAcumulado({ pontos }: { pontos: PontoMes[] }) {
  const [caixa, w] = useLargura<HTMLDivElement>();
  const svg = useDesenhar(pontos.length);
  const [i, setI] = useState<number | null>(null);
  const h = 190;
  const { a, b, ticks } = escala(Math.min(...pontos.map((p) => p.acumulado)), Math.max(...pontos.map((p) => p.acumulado)));
  const X = (k: number) => M.l + (pontos.length < 2 ? 0 : (k / (pontos.length - 1)) * (w - M.l - M.r));
  const Y = (v: number) => M.t + (1 - (v - a) / (b - a || 1)) * (h - M.t - M.b);
  const linha = pontos.map((p, k) => `${k ? "L" : "M"}${X(k)},${Y(p.acumulado)}`).join("");
  const area = `${linha}L${X(pontos.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z`;
  const ult = pontos[pontos.length - 1];
  const tocar = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const k = Math.round(((e.clientX - r.left - M.l) / (w - M.l - M.r)) * (pontos.length - 1));
    setI(Math.max(0, Math.min(pontos.length - 1, k)));
  };
  return (
    <figure className="grafico">
      <div className="graf-caixa" ref={caixa}>
        <svg ref={svg} width={w} height={h} role="img" aria-label={`Acumulado na conta: ${pontos.map((p) => `${nomeMesAno(p.mes)} ${reais(p.acumulado)}`).join("; ")}`}
          onPointerMove={tocar} onPointerDown={tocar} onPointerLeave={() => setI(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? "graf-zero" : "graf-grade"} x1={M.l} x2={w - M.r} y1={Y(t)} y2={Y(t)} />
              <text className="graf-eixo" x={M.l - 8} y={Y(t)} dy="0.32em" textAnchor="end">{reaisCurto(t)}</text>
            </g>
          ))}
          {pontos.map((p, k) => (k % (pontos.length > 7 ? 2 : 1) === (pontos.length - 1) % (pontos.length > 7 ? 2 : 1) || k === pontos.length - 1) && (
            <text key={p.mes} className="graf-eixo" x={X(k)} y={h - 8} textAnchor={k === pontos.length - 1 ? "end" : "middle"}>{mesCurto(p.mes)}</text>
          ))}
          <path className="graf-area" d={area} />
          <path className="graf-traco graf-linha-entrou" d={linha} pathLength={1} strokeDasharray="1" />
          <circle className="graf-ponto" cx={X(pontos.length - 1)} cy={Y(ult.acumulado)} r={4.5} />
          {i !== null && (
            <>
              <line className="graf-mira" x1={X(i)} x2={X(i)} y1={M.t} y2={h - M.b} />
              <circle className="graf-ponto" cx={X(i)} cy={Y(pontos[i].acumulado)} r={5} />
            </>
          )}
        </svg>
        {i !== null && (
          <Dica x={X(i)} w={w}>
            <strong>{nomeMesAno(pontos[i].mes)}</strong>
            <span>Na conta: <b className="num">{reais(pontos[i].acumulado)}</b></span>
            <span className="suave num">entrou {reais(pontos[i].entrou)} · saiu {reais(pontos[i].saiu)}</span>
          </Dica>
        )}
      </div>
      <Tabela pontos={pontos} />
    </figure>
  );
}

/** Entrou × saiu por mês (conta). Duas séries: legenda + rótulo do mês atual. */
export function GraficoEntrouSaiu({ pontos }: { pontos: PontoMes[] }) {
  const [caixa, w] = useLargura<HTMLDivElement>();
  const svg = useDesenhar(pontos.length);
  const [i, setI] = useState<number | null>(null);
  const h = 190;
  const { a, b, ticks } = escala(0, Math.max(...pontos.flatMap((p) => [p.entrou, p.saiu])));
  const Y = (v: number) => M.t + (1 - (v - a) / (b - a || 1)) * (h - M.t - M.b);
  const grupo = (w - M.l - M.r) / pontos.length;
  const barra = Math.max(4, Math.min(22, (grupo - 10) / 2 - 1));
  const xg = (k: number) => M.l + k * grupo + grupo / 2;
  // alvo de toque = a coluna inteira do mês, não só a barra
  const tocarGrupo = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const k = Math.floor((e.clientX - r.left - M.l) / grupo);
    setI(k >= 0 && k < pontos.length ? k : null);
  };
  const coluna = (x: number, v: number, cls: string, key: string) => {
    if (v <= 0) return null;
    const y = Y(v), base = Y(0), r = Math.min(4, (base - y) / 2, barra / 2);
    return <path key={key} className={`graf-barra ${cls}`} d={`M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + barra - r}Q${x + barra},${y} ${x + barra},${y + r}V${base}Z`} />;
  };
  return (
    <figure className="grafico">
      <p className="graf-legenda" aria-hidden="true"><span><i className="cor-entrou" />Entrou</span><span><i className="cor-saiu" />Saiu</span></p>
      <div className="graf-caixa" ref={caixa}>
        <svg ref={svg} width={w} height={h} role="img" aria-label={`Entrou e saiu por mês: ${pontos.map((p) => `${nomeMesAno(p.mes)}, entrou ${reais(p.entrou)}, saiu ${reais(p.saiu)}`).join("; ")}`}
          onPointerMove={tocarGrupo} onPointerDown={tocarGrupo} onPointerLeave={() => setI(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? "graf-zero" : "graf-grade"} x1={M.l} x2={w - M.r} y1={Y(t)} y2={Y(t)} />
              <text className="graf-eixo" x={M.l - 8} y={Y(t)} dy="0.32em" textAnchor="end">{reaisCurto(t)}</text>
            </g>
          ))}
          {pontos.map((p, k) => (
            <g key={p.mes}>
              {i === k && <rect className="graf-foco" x={xg(k) - grupo / 2 + 2} y={M.t} width={grupo - 4} height={h - M.t - M.b} rx={6} />}
              {coluna(xg(k) - barra - 1, p.entrou, "barra-entrou", "e")}
              {coluna(xg(k) + 1, p.saiu, "barra-saiu", "s")}
              <text className={`graf-eixo ${k === pontos.length - 1 ? "forte" : ""}`} x={xg(k)} y={h - 8} textAnchor="middle">{mesCurto(p.mes)}</text>
            </g>
          ))}
        </svg>
        {i !== null && (
          <Dica x={xg(i)} w={w}>
            <strong>{nomeMesAno(pontos[i].mes)}</strong>
            <span><i className="cor-entrou" />Entrou <b className="num">{reais(pontos[i].entrou)}</b></span>
            <span><i className="cor-saiu" />Saiu <b className="num">{reais(pontos[i].saiu)}</b></span>
            <span className="suave num">sobrou {reais(pontos[i].entrou - pontos[i].saiu)}</span>
          </Dica>
        )}
      </div>
      <Tabela pontos={pontos} />
    </figure>
  );
}

/** Ritmo do mês: gasto acumulado dia a dia (este mês até hoje, projeção até o fim) contra o mês anterior. */
export function GraficoRitmo({ atual, antes, hoje, nomeAtual, nomeAntes }: { atual: number[]; antes: number[]; hoje: number; nomeAtual: string; nomeAntes: string }) {
  const [caixa, w] = useLargura<HTMLDivElement>();
  const svg = useDesenhar(atual.length);
  const [i, setI] = useState<number | null>(null);
  const h = 200;
  const n = atual.length;
  const proj = (atual[hoje - 1] / hoje) * n;
  const temAntes = antes[antes.length - 1] > 0;
  const { a, b, ticks } = escala(0, Math.max(proj, temAntes ? antes[antes.length - 1] : 0, 1));
  const X = (dia: number) => M.l + ((dia - 1) / (n - 1)) * (w - M.l - M.r); // dia 1..n
  const Y = (v: number) => M.t + (1 - (v - a) / (b - a || 1)) * (h - M.t - M.b);
  const caminho = (vals: number[], ate: number) => vals.slice(0, ate).map((v, k) => `${k ? "L" : "M"}${X(k + 1)},${Y(v)}`).join("");
  const xAntes = (k: number) => M.l + (k / (antes.length - 1)) * (w - M.l - M.r);
  const linhaAntes = antes.map((v, k) => `${k ? "L" : "M"}${xAntes(k)},${Y(v)}`).join("");
  const tocar = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const d = Math.round(((e.clientX - r.left - M.l) / (w - M.l - M.r)) * (n - 1)) + 1;
    setI(Math.max(1, Math.min(n, d)));
  };
  return (
    <figure className="grafico">
      <p className="graf-legenda" aria-hidden="true">
        <span><i className="cor-entrou" />{nomeAtual}</span>
        <span><i className="cor-projecao" />no ritmo de agora</span>
        {temAntes && <span><i className="cor-antes" />{nomeAntes}</span>}
      </p>
      <div className="graf-caixa" ref={caixa}>
        <svg ref={svg} width={w} height={h} role="img" aria-label={`Gasto até o dia ${hoje}: ${reais(atual[hoje - 1])}. No ritmo de agora, o mês fecha em ${reais(Math.round(proj))}.`}
          onPointerMove={tocar} onPointerDown={tocar} onPointerLeave={() => setI(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? "graf-zero" : "graf-grade"} x1={M.l} x2={w - M.r} y1={Y(t)} y2={Y(t)} />
              <text className="graf-eixo" x={M.l - 8} y={Y(t)} dy="0.32em" textAnchor="end">{reaisCurto(t)}</text>
            </g>
          ))}
          {[1, 10, 20, n].map((d) => <text key={d} className="graf-eixo" x={X(d)} y={h - 8} textAnchor={d === 1 ? "start" : d === n ? "end" : "middle"}>dia {d}</text>)}
          {temAntes && <path className="graf-linha-antes" d={linhaAntes} />}
          <path className="graf-linha-projecao" d={`M${X(hoje)},${Y(atual[hoje - 1])}L${X(n)},${Y(proj)}`} />
          <path className="graf-traco graf-linha-entrou" d={caminho(atual, hoje)} pathLength={1} strokeDasharray="1" />
          <circle className="graf-ponto" cx={X(hoje)} cy={Y(atual[hoje - 1])} r={4.5} />
          <text className="graf-rotulo" x={X(hoje)} y={Y(atual[hoje - 1]) - 10} textAnchor={hoje > n * 0.7 ? "end" : "middle"}>hoje {reaisCurto(atual[hoje - 1])}</text>
          {i !== null && <line className="graf-mira" x1={X(i)} x2={X(i)} y1={M.t} y2={h - M.b} />}
        </svg>
        {i !== null && (
          <Dica x={X(i)} w={w}>
            <strong>Até o dia {i}</strong>
            {i <= hoje ? <span><i className="cor-entrou" />{nomeAtual}: <b className="num">{reais(atual[i - 1])}</b></span>
              : <span><i className="cor-projecao" />No ritmo: <b className="num">{reais(Math.round((atual[hoje - 1] / hoje) * i))}</b></span>}
            {temAntes && <span><i className="cor-antes" />{nomeAntes}: <b className="num">{reais(antes[Math.min(i, antes.length) - 1])}</b></span>}
          </Dica>
        )}
      </div>
    </figure>
  );
}

function Tabela({ pontos }: { pontos: PontoMes[] }) {
  return (
    <details className="graf-tabela">
      <summary>Ver em tabela</summary>
      <div className="tabela-rolagem">
        <table>
          <thead><tr><th>Mês</th><th>Entrou</th><th>Saiu</th><th>Na conta</th></tr></thead>
          <tbody>
            {pontos.map((p) => <tr key={p.mes}><td>{nomeMesAno(p.mes)}</td><td className="num">{reais(p.entrou)}</td><td className="num">{reais(p.saiu)}</td><td className="num">{reais(p.acumulado)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </details>
  );
}
