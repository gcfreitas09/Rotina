/**
 * Projeto Supabase "rotinas", embutido no app para ninguém precisar digitar URL nem chave.
 *
 * Os dois valores são PÚBLICOS por design: vão no JavaScript de qualquer site que usa o Supabase.
 * Quem protege os dados é a RLS da tabela `rotina_registros` (supabase/schema.sql): cada pessoa só
 * lê e escreve as próprias linhas, e só depois de entrar com e-mail e senha.
 *
 * NUNCA colocar aqui a chave "secret" / "service_role": essa dá acesso total ao banco.
 * Para apontar para outro projeto, use VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (têm prioridade).
 */
export const SUPABASE_URL = "https://jkqvkbxbuudjrmottxdt.supabase.co";
export const SUPABASE_CHAVE_PUBLICA = "sb_publishable_Yb6qBR3ocn5rgLuLXvsFwg_cmET_PSP";
