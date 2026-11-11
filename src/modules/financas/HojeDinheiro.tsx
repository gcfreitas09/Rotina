/** Cartão "Dinheiro" no Hoje: quanto dá para gastar hoje, contas que caem hoje (com Recebi/Paguei) e lançar rápido. */
import { useColecao, useConfig } from "../../data/store.ts";
import { brCurta, hoje } from "../../data/datas.ts";
import { Anotar, Dinheiro, lancarFixo } from "./acoes.tsx";
import { contasDoDia, fechamento, mesDe, nomeMes, reais, resumoMes, ritmoDoMes, somarMes } from "./logica.ts";

export default function HojeDinheiro() {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const cfg = useConfig();
  const h = hoje();
  const mes = mesDe(h);
  const ritmo = ritmoDoMes(lancs, fixos, mes, h);
  const r = resumoMes(lancs, fixos, mes);
  const contas = contasDoDia(fixos, lancs, h);
  const gastoHoje = lancs.filter((l) => l.data === h && l.tipo === "saida").reduce((t, l) => t + l.valor, 0);
  const ant = somarMes(mes, -1);
  const resumoPronto = Number(h.slice(8)) <= 7 && cfg.resumoVisto !== ant && !!fechamento(lancs, fixos, ant);
  const usa = lancs.length > 0 || fixos.length > 0;

  return (
    <section className="folha painel-dinheiro">
      <header><h2>Dinheiro</h2><a href="#/mais/financas" className="botao texto pequeno">Finanças</a></header>
      {usa && ritmo && (
        <div className="dinheiro-hoje">
          <p className={`grande ${ritmo.porDia ? "" : "negativo"}`}><Dinheiro c={ritmo.porDia} /></p>
          <p className="suave pequeno-texto">
            {ritmo.porDia ? "dá para gastar hoje" : "o mês já fecha no vermelho"}
            {gastoHoje > 0 && <> · já foi <span className="num">{reais(gastoHoje)}</span></>}
            <br />na conta: <span className="num">{reais(r.acumulado)}</span>
          </p>
        </div>
      )}
      {contas.length > 0 && (
        <ul className="contas-hoje" aria-label="Contas de hoje">
          {contas.map(({ fixo: f, data, ate, atrasado }) => (
            <li key={f.id} className={atrasado ? "atrasada" : ""}>
              <span className="conta-corpo">
                <span className="conta-nome">{f.descricao}</span>
                <span className="conta-quando">{atrasado ? `era até ${brCurta(ate)}` : data === h || ate === h ? "hoje" : `entre ${brCurta(data)} e ${brCurta(ate)}`}</span>
              </span>
              <Dinheiro c={f.tipo === "entrada" ? f.valor : -f.valor} sinal />
              <button className="botao pequeno" onClick={() => lancarFixo(f, data)}>{f.tipo === "entrada" ? "Recebi" : "Paguei"}</button>
            </li>
          ))}
        </ul>
      )}
      {resumoPronto && <a className="resumo-pronto" href="#/mais/financas">O resumo de {nomeMes(ant)} está pronto</a>}
      <Anotar compacto />
    </section>
  );
}
