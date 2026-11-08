/**
 * "Repetir": um item semanal vira um registro por dia, todos com o mesmo `grupo`.
 * Assim cada dia pode ter horário próprio, e ainda dá para editar todos de uma vez.
 */
import type { Bloco, Dia, Refeicao } from "./types.ts";
import { excluir, lista, salvarVarios } from "./store.ts";
import { novoId } from "./formato.ts";

type ColGrupo = "blocos" | "refeicoes";
type ItemGrupo = Bloco | Refeicao;
type Campos<T> = Omit<T, "id" | "_m" | "_x" | "grupo" | "dia">;

export function doGrupo<C extends ColGrupo>(c: C, grupo: string): ItemGrupo[] {
  return lista(c).filter((r) => r.grupo === grupo);
}

/** Cria um registro por dia escolhido. */
export function criarRepetido<C extends ColGrupo>(c: C, campos: Campos<ItemGrupo>, dias: Dia[]) {
  const grupo = novoId("g");
  salvarVarios(c, dias.map((dia) => ({ ...campos, id: `${grupo}-${dia}`, grupo, dia, _m: 0 })) as never[]);
}

/**
 * Edita todos os dias do grupo: atualiza os que ficam, cria os dias novos
 * (copiando os campos) e exclui os dias desmarcados. Devolve o desfazer da exclusão.
 */
export function editarGrupo<C extends ColGrupo>(c: C, grupo: string, campos: Campos<ItemGrupo>, dias: Dia[]): (() => void) | null {
  const atuais = doGrupo(c, grupo);
  const porDia = new Map(atuais.map((r) => [r.dia, r]));
  const salvarL: ItemGrupo[] = [];
  for (const dia of dias) {
    const r = porDia.get(dia);
    salvarL.push({ ...(r ?? {}), ...campos, id: r?.id ?? `${grupo}-${dia}-${novoId()}`, grupo, dia, _m: 0, _x: false } as ItemGrupo);
  }
  if (salvarL.length) salvarVarios(c, salvarL as never[]);
  const sair = atuais.filter((r) => !dias.includes(r.dia)).map((r) => r.id);
  return sair.length ? excluir(c, sair) : null;
}

/** Edita só um dia. Se mudar o dia, o registro sai do grupo para não confundir. */
export function editarUm<C extends ColGrupo>(c: C, item: ItemGrupo, campos: Campos<ItemGrupo>, dia: Dia) {
  const grupo = dia === item.dia ? item.grupo : novoId("g");
  salvarVarios(c, [{ ...item, ...campos, grupo, dia, _m: 0 } as never]);
}
