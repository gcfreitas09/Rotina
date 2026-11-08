import { nota } from "../../data/formato.ts";

interface Linha {
  nome: string;
  s1: number;
  s2: number;
  anual: number | null;
  completos: [boolean, boolean];
}

const SERIES = [
  { k: "s1", nome: "1º semestre", cor: "var(--linha-forte)" },
  { k: "s2", nome: "2º semestre", cor: "var(--grafite-suave)" },
  { k: "anual", nome: "Média anual", cor: "var(--musgo)" },
] as const;

/** Barras horizontais de 0 a 10 por matéria — lê bem no celular sem girar o texto. */
export default function GraficoNotas({ dados, media }: { dados: Linha[]; media: number }) {
  return (
    <figure className="grafico" style={{ margin: 0 }}>
      <figcaption className="legenda">
        {SERIES.map((s) => (
          <span key={s.k}><i style={{ background: s.cor }} />{s.nome}</span>
        ))}
        <span><i className="legenda-marca" />Média {nota(media)}</span>
      </figcaption>
      <div className="grafico-linhas">
        {dados.map((d) => (
          <div className="grafico-materia" key={d.nome}>
            <p className="grafico-nome">{d.nome}</p>
            <div className="grafico-barras" style={{ ["--media" as string]: media / 10 }}>
              {SERIES.map((s) => {
                const v = d[s.k];
                const parcial = (s.k === "s1" && !d.completos[0]) || (s.k === "s2" && !d.completos[1]);
                return (
                  <div key={s.k} className="grafico-barra">
                    <span style={{ width: `${(v ?? 0) * 10}%`, background: s.cor, opacity: parcial ? 0.45 : 1 }} />
                    <b className={`num ${parcial ? "suave" : v !== null && v < media ? "atraso" : ""}`}>
                      <span className="sr">{s.nome}: </span>
                      {nota(v)}{parcial && "…"}
                    </b>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
