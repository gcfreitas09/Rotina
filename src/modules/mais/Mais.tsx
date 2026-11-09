import Horarios from "../horarios/Horarios.tsx";
import Configuracoes from "../configuracoes/Configuracoes.tsx";
import Leitura from "../leitura/Leitura.tsx";
import Abas from "../../components/Abas.tsx";

/** Mais agrupa Horários, Leitura e Configurações. */
export default function Mais({ aba, sub }: { aba?: string; sub?: string }) {
  const atual = aba === "configuracoes" ? "configuracoes" : aba === "leitura" ? "leitura" : "horarios";
  if (atual === "leitura" && sub === "agora") return <Leitura sub="agora" />;
  return (
    <>
      <div style={{ marginBottom: 22 }} className="mais-abas" data-atual={atual}>
        <Abas itens={[["horarios", "Horários"], ["leitura", "Leitura"], ["configuracoes", "Configurações"]]} atual={atual} rotulo="Mais" base="mais" />
      </div>
      <div role="tabpanel">{atual === "horarios" ? <Horarios /> : atual === "leitura" ? <Leitura /> : <Configuracoes />}</div>
    </>
  );
}
