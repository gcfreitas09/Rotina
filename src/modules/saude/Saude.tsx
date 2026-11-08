import Dieta from "../dieta/Dieta.tsx";
import Treino from "../treino/Treino.tsx";
import Treinando from "../treino/Treinando.tsx";
import Abas from "../../components/Abas.tsx";

/** Saúde agrupa Dieta e Treino em abas. */
export default function Saude({ aba, sub }: { aba?: string; sub?: string }) {
  const atual = aba === "treino" ? "treino" : "dieta";
  if (atual === "treino" && sub === "agora") return <Treinando />;
  return (
    <>
      <div className="topo"><h1>Saúde</h1></div>
      <Abas itens={[["dieta", "Dieta"], ["treino", "Treino"]]} atual={atual} rotulo="Saúde" base="saude" />
      <div role="tabpanel">{atual === "dieta" ? <Dieta /> : <Treino />}</div>
    </>
  );
}
