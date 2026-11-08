import Horarios from "../horarios/Horarios.tsx";
import Configuracoes from "../configuracoes/Configuracoes.tsx";
import Abas from "../../components/Abas.tsx";

/** Mais agrupa Horários e Configurações. */
export default function Mais({ aba }: { aba?: string }) {
  const atual = aba === "configuracoes" ? "configuracoes" : "horarios";
  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <Abas itens={[["horarios", "Horários"], ["configuracoes", "Configurações"]]} atual={atual} rotulo="Mais" base="mais" />
      </div>
      <div role="tabpanel">{atual === "horarios" ? <Horarios /> : <Configuracoes />}</div>
    </>
  );
}
