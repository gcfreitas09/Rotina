/** Cartão "Dinheiro" no Hoje: o que você tem (mesmo cálculo das Finanças), contas que caem hoje (Recebi/Paguei) e o Anotar. */
import { useColecao, useConfig } from "../../data/store.ts";
import { brCurta, hoje } from "../../data/datas.ts";
import { Anotar, Dinheiro, chipCarteira, lancarFixo } from "./acoes.tsx";
import { carteirasEmUso, contasDoDia, fechamento, mesDe, nomeMes, reais, ritmoDoMes, saldoAgora, somarMes } from "./logica.ts";

export default function HojeDinheiro() {
  const lancs = useColecao("lancamentos");
  const fixos = useColecao("fixos");
  const cfg = useConfig();
  const h = hoje();
  const mes = mesDe(h);
  const ritmo = ritmoDoMes(lancs, fixos, mes, h);
  const contas = contasDoDia(fixos, lancs, h);
  const dinheiro = saldoAgora(lancs, "conta", h);
  const vales = carteirasEmUso(lancs, fixos).filter((c) => c !== "conta");
  const gastoHoje = lancs.filter((l) => l.data === h && l.tipo === "saida").reduce((t, l) => t + l.valor, 0);
  const ant = somarMes(mes, -1);
  const resumoPronto = Number(h.slice(8)) <= 7 && cfg.resumoVisto !== ant && !!fechamento(lancs, fixos, ant);
  const usa = lancs.length > 0 || fixos.length > 0;

  return (
    <section className="folha painel-dinheiro">
      <header><h2>Dinheiro</h2><a href="#/mais/financas" className="botao texto pequeno">Finanças</a></header>
      {usa ? (
        <div className="dinheiro-hoje">
          <p className={`grande ${dinheiro < 0 ? "negativo" : ""}`}><Dinheiro c={dinheiro} /></p>
          <p className="suave pequeno-texto">
            {ritmo && (ritmo.porDia ? <>dá para gastar <span className="num">{reais(ritmo.porDia)}</span>/dia</> : "o mês não fecha")}
            {gastoHoje > 0 && <> · hoje já foi <span className="num">{reais(gastoHoje)}</span></>}
          </p>
        </div>
      ) : (
        <p className="suave pequeno-texto">Diga quanto tem em <a href="#/mais/financas">Finanças</a> e anote aqui o que gastar.</p>
      )}
      {usa && <p className="vales-hoje">{vales.map((c) => <span key={c}>{chipCarteira(c)} <b className={saldoAgora(lancs, c, h) < 0 ? "negativo" : ""}>{reais(saldoAgora(lancs, c, h))}</b></span>)}</p>}
      {contas.length > 0 && (
        <ul className="contas-hoje" aria-label="Contas de hoje">
          {contas.map(({ fixo: f, data, ate, atrasado }) => (
            <li key={f.id} className={atrasado ? "atrasada" : ""}>
              <span className="conta-corpo">
                <span className="conta-nome">{f.descricao} <span className={`selo-carteira c-${f.carteira}`}>{chipCarteira(f.carteira)}</span></span>
                <span className="conta-quando">{atrasado ? `era até ${brCurta(ate)}` : data === h || ate === h ? "hoje" : `entre ${brCurta(data)} e ${brCurta(ate)}`}</span>
              </span>
              <Dinheiro c={f.tipo === "entrada" ? f.valor : -f.valor} sinal />
              <button className="botao pequeno" onClick={() => lancarFixo(f, data)}>{f.tipo === "entrada" ? "Recebi" : "Paguei"}</button>
            </li>
          ))}
        </ul>
      )}
      {resumoPronto && <a className="resumo-pronto" href="#/mais/financas/mes">O resumo de {nomeMes(ant)} está pronto</a>}
      <Anotar compacto />
    </section>
  );
}
