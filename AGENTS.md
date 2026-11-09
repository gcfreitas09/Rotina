# Rotina — organização pessoal (estudante que trabalha)

## O que é
Web app pessoal, mobile-first, em português do Brasil: Hoje, Tarefas, Escola (notas e médias),
Saúde (Dieta + Treino) e Mais (Horários + Configurações). Usado no celular várias vezes ao dia e no desktop.
- Dev: `npm run dev` → http://localhost:5173 · Preview do build: `npm run preview` → http://localhost:4173
- MAMP (se a pasta for para `htdocs/rotina`): http://localhost:8888/rotina/ (`.htaccess` serve `dist/`)
- Produção: ainda não publicado (precisa de HTTPS para o celular instalar como app).
- GitHub: `git@github.com:gcfreitas09/rotina.git` (branch `main`, autor dos commits igual ao dos outros projetos).
  Fora do repositório por design: `.env.local` (override opcional), `dist/`, `node_modules/`, `rotina-site.zip`.
  Em outro computador: `npm install` e `npm run build` (o Supabase já vem embutido).
- Vercel: https://rotina-gcf.vercel.app (build `npm run build`, saída `dist/`; rotas por hash, sem configuração extra).

## Restrições do pedido (palavras do Guilherme)
- Todo texto em pt-BR; datas dd/mm/aaaa; semana começa na segunda; notas com vírgula e uma casa (7,5).
- "O app NÃO pode parecer feito por IA": sem roxo/violeta, sem gradiente, sem glow, **sem emoji**,
  sem grade de cards iguais. Layout editorial: listas, divisórias finas, números grandes.
- Paleta fixa: fundo #F4F1EA (claro) / #141414 (escuro), texto grafite, **um** destaque: verde-musgo
  #3F5E3A. Vermelho discreto só para atraso e nota abaixo da média.
- Fontes: Bricolage Grotesque (títulos), Inter (texto), JetBrains Mono com tabular-nums (números).
- Toque ≥ 44 px, foco visível, `prefers-reduced-motion`.
- 08/11/2026: "está muito sem vida… capriche, use efeitos" e "use a tela toda, sem medo… mobile first".
  Isso substitui o "animações curtas e discretas" do pedido original. Roxo, emoji, glow e um destaque só continuam valendo.
- Ações destrutivas: confirmação + aviso com "Desfazer".
- Valores máximos e fórmulas de nota **só** em `src/config/gradingRules.ts`.

## Regras de nota (confirmadas pelo Guilherme em 08/11/2026)
- Semestre = P1 (3,5) + P2 (3,5) + T1 (2,0) + T2 (1,0), soma até 10.
- Recuperação (vale 7): bloco das provas = **(P1 + P2 + 2 × Rec) / 3**, e só vale se trouxer benefício (se der menos ou igual a
  P1 + P2, a recuperação é ignorada e ficam as provas). Fonte: documento oficial da escola, seção "Recuperações semestrais"
  (o Guilherme mandou a imagem em 08/11/2026). Com P1+P2 ≤ 7 e Rec ≤ 7 o bloco nunca passa de 7 (21/3), então não há limite artificial.
  **Histórico do erro:** o Guilherme tinha dito "÷ 2" de cabeça e o app foi feito assim (com um limite de 7 para esconder que passava);
  dava nota muito acima da real (P1+P2 = 3,5 e Rec = 5 → 6,75 em vez de 4,5). Na dúvida, o documento da escola vale mais que a memória.
  Só `formulaRecuperacao` e `recuperacaoNecessaria` (inversa: rec = (3 × bloco − soma) / 2) em `gradingRules.ts` conhecem a conta.
- "Quanto preciso tirar": com prova ainda por fazer, mostra a **nota mínima na prova** supondo nota máxima nos trabalhos que faltam
  (`minimoNaProva`; pedido do Guilherme, 08/11/2026, no lugar de "quanto falta no semestre"). Com as duas provas já feitas, sobra só
  a soma dos trabalhos (`faltaNoSemestre`).
- Ponto extra (0,5): soma no semestre, mas o semestre nunca passa de 10.
- Média anual = (S1 + S2) / 2. Exame só se anual < média; final = (anual + exame) / 2; passa com ≥ mínimo (padrão 5,0).

## Comandos
- `npm install` — só React, GSAP (+ @gsap/react), supabase-js, fontes e Vite/TS. Ícones ficam em `src/components/icones.tsx` (desenhos do Lucide copiados: o pacote pesava 50 MB). **Nunca** puppeteer/lighthouse aqui.
- `npm run dev` · `npm run build` (tsc + vite → `dist/`) · `npm test` (fórmulas e mescla, `node --test`)
- `npm run publicar` — build + `rotina-site.zip` (só `dist/`). Suba só o zip.
- `node scripts/verificar.mjs navegador|lighthouse|movimento|flashcards` — gates do `GATES.md`; usa `~/.claude/tools/qa`.
  Screenshots vão para a pasta temporária (ou `ROTINA_SHOTS`), nunca para o projeto.
- `node scripts/icones.mjs` — regenera PNG/ICO a partir de `web/public/icone.svg`.

## Mapa
- `web/index.html` é a entrada do Vite (root `web/`); `index.html` da raiz só redireciona para `dist/`.
- `src/config/gradingRules.ts` — máximos, fórmulas, situação, "quanto preciso tirar", validação.
- `src/data/storage.ts` — ÚNICO arquivo que toca o localStorage (`storage.<modulo>.get/save`), backup, mescla.
- `src/data/store.ts` — estado + hooks (`useColecao`, `salvar`, `excluir` com desfazer).
- `src/data/sync.ts` + `supabase/schema.sql` — sincronia. `src/data/grupos.ts` — "Repetir".
- `src/data/exemplos.ts` — dados de exemplo; todo id começa com `ex-` ("Limpar exemplos" usa isso).
- `src/modules/flashcards/` — pastas por matéria → cartões → estudar (rota `#/escola/flashcards[/<pasta>[/estudar]]`, aba dentro da Escola). `logica.ts` = caixas de Leitner (intervalos 0/0/1/3/7/14 dias).
  Cartão tem `dificuldade` (facil/medio/dificil; ausente = medio) só para organizar e filtrar, não muda o intervalo. Estudo: ordem "Inteligente" (caixa, depois difícil antes de fácil) ou "Aleatória" (mistura tudo); filtro por dificuldade; opções ficam em memória (`opcoesEstudo`), pedido de 08/11/2026.
  Filtro = faixa `Segmentos` com a contagem de cada dificuldade + chave "Ordem aleatória" (as pílulas anteriores foram recusadas pelo Guilherme).
  **Listas no texto do cartão**: linha que começa com `- ` (ou `* `) vira item com bolinha (`TextoCartao`, CSS `.item-lista::before`); o texto guardado continua com `- `. Enter numa linha de lista continua a lista, Enter numa vazia encerra (`continuarLista` em `logica.ts`).
  **Resposta em comparação** (`comparacao: { itens[], linhas[{criterio, valores[]}] }`, até 3 itens): chave no formulário do cartão abre `EditorComparacao`; `limparComparacao` (logica.ts, testada) tira coluna sem nome e linha vazia antes de salvar; no verso aparece em grade (`ComparacaoVista`, `.comp`, spans com role=table, não `<table>`, porque o cartão é um `<button>`). Enter nos campos pula para o próximo, não envia o cartão.
  **Imagem no cartão** (`imagem`, `imagemVerso`): `imagem.ts` reduz para 900 px e grava JPEG 0,76 em data URL dentro do registro (vai junto na sincronia). Nada de PNG/WebP cru: Safari não codifica WebP e o localStorage tem ~5 MB. `storage.gravar` devolve false sem espaço; `store.substituir` então não altera o estado e dispara `rotina:sem-espaco` (aviso em `ui.tsx`).
- `src/modules/dieta/nutricao.ts` — kcal/proteína automáticas: lê a quantidade ("2 ovos", "1/2 xícara", "150 g"), acha o alimento
  (`PREFERIDO` = forma comum de cada nome genérico, por nome exato da TACO) e converte medida caseira em gramas (`MEDIDAS`, aproximadas).
  `taco.json` é gerado por `node scripts/taco.mjs`: TACO 4ª ed. (brolesi.github.io/taco) + `USDA` (preparações que faltam) +
  `ROTULOS` = mediana dos rótulos brasileiros da Open Food Facts (mín. 5 produtos). Cada item de ROTULOS tem faixa de kcal/100 g:
  muitos cadastros da OFF trazem o valor de UMA PORÇÃO no campo "por 100 g" (pasta de amendoim com 98 kcal) — a faixa os descarta.
  Carrega sob demanda (chunk ~11 KB gz). `LinhaAlimento.tsx` = linha do formulário; `buscaOnline.ts` = produtos de marca.
  Campo digitado à mão (`manualKcal`/`manualProt`) nunca é sobrescrito; salvo com `autoKcal`/`autoProt`, `ref` (id local) ou
  `base` (produto de marca com os valores do rótulo, para recalcular sem internet).
- `src/modules/dieta/diario.ts` — diário do dia (testado em `tests/diario.test.ts`): check por alimento. Refeição inteira comida fica em
  `DiaDieta.feitas` (como antes, registros antigos continuam valendo); comida em parte vai para `comidos` ("refeicaoId/alimentoId"),
  e o check da refeição fica indeterminado. "Comi fora do plano" = `DiaDieta.extras` (Alimento, mesmo cálculo automático).
  Resumo do dia: % de alimentos do plano comidos + kcal/proteína (plano + fora). Pedido do Guilherme em 08/11/2026.
  Os checks valem para o dia escolhido nesta semana (seg a dom): hoje e dias que já passaram marcam na data daquele dia;
  dia que ainda não chegou não tem check. Hoje sem refeição no plano → botão "Usar o plano de <dia> hoje" (soma o dia ao grupo).
- `api/alimentos.js` (função do Vercel) + `api/_off.js` — `/api/alimentos?q=` busca produtos do Brasil na Open Food Facts
  (search.openfoodfacts.org não manda CORS, por isso não dá para chamar do navegador). O mesmo `_off.js` roda no `npm run dev`
  e no `preview` via plugin em `vite.config.ts`. No MAMP não há essa rota: a lista avisa e fica só a tabela local.
- `src/modules/treino/Treinando.tsx` — "Iniciar treino" (rota `#/saude/treino/agora[/<fichaId>]`): modo foco, uma série por vez.
  Contador de repetições na lousa (cada toque = um risco de giz, grupos de 5), atalhos com a meta, peso ±1/±2,5, "Concluir série"
  abre o descanso no mesmo painel (anel, ±15 s, pular; no fim vibra e apita), série extra, anterior/próximo, resumo e "Salvar treino".
  Aba "Lista" = o modo antigo (corrigir séries). Tela fica acesa (Wake Lock). Lógica em `treino/sessao.ts` (testada).
- `src/modules/leitura/` — aba Leitura em Mais (`#/mais/leitura`, sessão em `#/mais/leitura/agora`): livros (`livros`), sessões com
  tempo (`leituras`, `fim: null` = em andamento), metas do dia em `Config` (`metaPaginasDia`, `metaMinutosLeitura`).
  Foco do iPhone: site não liga Foco nem bloqueia apps; o app abre o atalho do usuário (`Config.atalhoLeitura`) por
  `shortcuts://x-callback-url/run-shortcut` com os minutos (0 = desligar) e volta pelo `x-success`. Só desliga ao encerrar
  se a sessão ligou (`focoIphone`). Passo a passo do atalho fica na própria tela.
  Campo "Livro": ao digitar, lista de opções clicáveis da Open Library (`leitura/catalogo.ts`, direto do navegador: libera CORS;
  a API do Google Livros está sem cota sem chave). Preenche livro, autor e páginas (edição mediana: o app avisa para conferir).
  Resultados vêm sujos, então `ranquear` filtra (todas as palavras digitadas), tira resumos/repetidas e prefere obra conhecida em
  português. Sem internet, a lista avisa e o cadastro à mão continua valendo.
  No desktop a Leitura tem item próprio no menu lateral (`navLateral` em `App.tsx`, entre Saúde e Mais); no celular fica em
  Mais para a barra de baixo seguir com 5 itens (pedido do Guilherme, 08/11/2026).
- `src/modules/<modulo>/` — uma pasta por tela. `src/components/` — diálogo, aviso, Repetir, régua.
- Gerado, não editar: `dist/`, `rotina-site.zip`, PNG/ICO em `web/public/`.

## Decisões e o porquê
- **Assinatura: a lousa** — verde-musgo escuro da sala de aula (`--lousa`), texto cor de giz (`--giz`),
  quadriculado de caderno e poeira de giz. Aparece no topo do Hoje, na lateral do desktop, na barra
  inferior do celular, no aviso e no cronômetro. Não espalhar para outros lugares.
- **A régua** (`components/Regua.tsx`) é a medida: 10 pontos do semestre com o peso de cada avaliação,
  horas do dia na lousa, divisória entre seções (traços a cada 10 px, maior a cada 50 px).
- Superfícies: papel com grão (fundo) + `.folha` (com sombra) só para o que precisa saltar: painel do Hoje,
  resumo da matéria, faixa de números. Listas continuam editoriais.
- Movimento (`components/movimento.tsx`, GSAP): `Cena` faz a entrada em cascata de cada tela; `Conta` faz
  número contar; réguas enchem; pílula da barra e traço das abas deslizam; `pulso` no check; copo d'água
  com onda (`Copo.tsx`); anel no cronômetro. Tudo desliga com `prefers-reduced-motion` (gate `movimento`).
- Um destaque só: a agulha do "agora" é giz branco, não amarelo.
- Hoje: a lousa carrega saudação, compromisso, **placar** (4 números) e a régua do dia; abaixo, painel em 2 colunas
  (tarefas | água + treino/prova + flashcards) e refeições em "bilhetes". Sem bloco solto: o que sobra de altura vira
  campo de anotar tarefa. Flashcards: cartão 3D que vira, erro volta para a caixa 1 e repete na mesma sessão.
- Escola (desktop): a **direita** (média geral/aprovado/em risco, próximas avaliações, comparativo) rola com a página;
  a **lista de matérias** à esquerda é fixa (`.col-fixa`, sticky top 24 px) e desce junto com a rolagem, então não
  sobra vazio embaixo dela. Pedido do Guilherme (08/11/2026): não mover o comparativo nem o resumo para a esquerda.
- **Tela toda, mobile first**: `.principal` sem largura máxima no desktop. Uma coluna por padrão;
  ≥ 1100 px: `.grade-tela` (principal + lateral fixa ao rolar), semestres lado a lado, tarefas em 2 colunas,
  painel do Hoje em 3 colunas, Configurações em 2; ≥ 1400 px: lousa e números lado a lado.
- **Cores dos tipos de horário: vivas e todas diferentes** (pedido do Guilherme em 08/11/2026, vale mais que o "um destaque
  só" do pedido original): aula verde, trabalho azul, academia laranja, futevôlei amarelo, estudo framboesa, livre cinza.
  Continua proibido roxo/violeta. Duas versões por tipo (`.tipo-<id>` claro, `:root[data-tema="escuro"]` mais clara) e uma
  terceira só na lousa (`.lousa .tipo-<id>`), que é escura nos dois temas. O resto do app segue com o musgo como destaque.
  Tipo novo de horário = `TipoBloco` em `data/types.ts` + `TIPOS` em `modules/horarios/Horarios.tsx` + as 3 cores em `styles.css`.
- Todo registro tem `_m` (alterado em ms) e `_x` (lápide). Sincronia: vence o `_m` maior, por registro;
  exclusão é lápide para chegar ao outro aparelho. O SQL recusa escrita mais velha (trigger).
- "Repetir": item semanal (horário, refeição) = um registro por dia com o mesmo `grupo`.
  Editar pergunta "Só este dia" ou "Todos os N dias"; desmarcar dia em "todos" exclui aquele dia.
  Ficha de treino guarda `dias[]`; um dia só tem uma ficha (dar o dia a uma tira da outra).
- Rotas por hash (`#/escola/<id>`) para rodar em qualquer subpasta sem configurar servidor.
- Fontes self-hosted, só subconjunto latino (`src/fontes.css`). supabase-js carrega sob demanda.
- `noindex`: app pessoal, não é para o Google (regra de SEO global não se aplica).

## Comportamentos pedidos (não desfazer)
- **Urgência das tarefas por cor** (`urgencia()` em `modules/tarefas/logica.ts`, testada em `tests/urgencia.test.ts`):
  prazo (atrasada 4, hoje 3, amanhã 2, até 7 dias 1, depois 0) + prioridade (alta +1, baixa −1); 4+ urgente (vermelho),
  3 alta (laranja), 2 média (amarelo), menos tranquila (verde); atrasada é sempre urgente. Aparece como faixa lateral,
  selo e borda do quadradinho; concluída fica neutra. O texto do selo usa a cor do tema (amarelo sobre claro não tem contraste).
- **Cadastrar matéria não abre a matéria**: fica na lista da Escola com aviso "X cadastrada"; as notas se lançam depois,
  entrando na matéria. (Já criar pasta de flashcards abre a pasta, para escrever os cartões na hora.)

## Desempenho no celular (regras; pedido do Guilherme: "deixe que nem no desktop")
- **Tela parada não repinta.** Em animação que nunca para, só `transform` e `opacity` (rodam na GPU). Nunca animar
  `box-shadow`, `width`, `top`, SVG ou `background` em loop. O copo d'água usa onda em CSS (`.onda`, translateX) e GSAP
  só para subir o nível, uma vez. O anel da marca "agora" anima `transform`/`opacity` num pseudo-elemento.
- **Sem `mix-blend-mode`, sem `filter`/`backdrop-filter` em tela cheia, sem camada `position: fixed` gigante.** O grão do
  papel e a poeira de giz são ladrilhos PNG de 96 px (`src/assets/grao-*.png`, gerados por `scripts/grao.mjs`) como
  `background-image`; o fundo escuro do diálogo é cor lisa, sem desfoque.
- `prefers-reduced-motion` usa `animation-iteration-count: 1` (com 1 ms infinito a animação piscaria 1000x/s).
- Gate `parado` (`verificar.mjs parado`): mede pinturas com o Chrome. Antes da correção: Hoje e Dieta = 360 pinturas em 3 s
  (~120/s); depois: 0. Medir sempre pintura/composição, não só quadros de JavaScript: o rAF do headless mostra 60 fps mesmo travando.

## Armadilhas já resolvidas
- Zoom no celular (pedido do Guilherme, 08/11/2026): o Safari dá zoom ao tocar em campo com letra < 16 px → em tela de toque todo
  `input`/`select`/`textarea` fica com 16 px (`@media (pointer: coarse)` em `styles.css`, com `!important` de propósito), o viewport tem
  `maximum-scale=1` e o `html` tem `touch-action: manipulation` (sem zoom no toque duplo). Campo novo não precisa de nada, a regra pega.
- `.col-principal { order: 1 }` (feito para a Escola no celular) valia para todas as telas e jogava a coluna principal para
  baixo (livros da Leitura depois das metas, Treino de hoje depois do gráfico) → escopo `.grade-escola`. Regra: `order` só
  com o seletor da tela.
- Repetições "8 a 10" eram recusadas (campo só aceitava inteiro e abria teclado numérico, sem traço) → `treino/reps.ts`
  (`lerReps`/`formatarReps`), `Exercicio.repsMax`; o campo é texto. Regra: campo que aceita faixa não usa `inputMode="numeric"`.
- Subtarefa no formulário de tarefa "estourava": o checkbox mora dentro de `.campo`, e `.campo input { width: 100% }`
  esticava o quadradinho até o fim do formulário (358–506 px), empurrando o texto para fora e criando scroll lateral →
  a regra agora exclui `[type=checkbox|radio]`, `.dialogo` tem `overflow-x: hidden` e o texto da subtarefa quebra linha.
  Regra: nunca estilizar `input` genérico dentro de `.campo` sem excluir checkbox/radio. Coberto no gate `navegador`.
- Lista fixa da Escola com `overflow-y: auto` ganhava scroll lateral no hover (o chevron desliza 3 px) e cortava a ponta das
  letras → `.col-fixa` com `overflow-x: hidden`, respiro de 10 px e linha com `padding-right: 6px`. Regra: todo
  container com `overflow-y: auto` precisa de `overflow-x: hidden`, e nenhum filho pode passar da borda no hover. Gate `hover`.
- Barra inferior flutua sobre o fim da tela → `scroll-padding-bottom: 110px` no html (foco não some atrás dela).
  No teste, centralizar o elemento antes de clicar.
- `<dl>` com links dentro derrubou acessibilidade no Lighthouse → faixa de números é `div` + `span`.
- "Média geral" tem que vir de `notaAtual()` (escola/logica.ts) nas duas telas; soma parcial de semestre aberto não conta.
- Aviso (toast) cobria os botões do diálogo no celular → diálogo tem z-index 70, acima do aviso (60).
- Rótulo "7,0" da média batia nos nomes da régua → rótulo fica acima do trilho.
- Teste com puppeteer: `click({clickCount:3})` não seleciona; usar `el.select()` antes de digitar.
- Importar backup: registros com `_m` antigo não subiam → importar chama `sincronizarTudo()`.

## Definição de pronto
`npm test` · `npm run build` · `node scripts/verificar.mjs navegador` · `node scripts/verificar.mjs lighthouse`
· `node ~/.claude/tools/peso.mjs . --entregavel dist` — e olhar os screenshots (1440/900/390, claro e escuro).

## Pendências (dependem do Guilherme)
- **Supabase "rotinas"** (ref `jkqvkbxbuudjrmottxdt`): a URL e a chave **publishable** estão embutidas em
  `src/config/supabase.ts` (commitadas, de propósito: são públicas por design e o app não pode pedir isso ao usuário —
  pedido do Guilherme em 08/11/2026, depois de ver o Vercel pedindo URL e chave). Quem protege os dados é a RLS de
  `rotina_registros`. **Nunca** colocar a chave `secret`/`service_role` no código. `.env.local` é só override opcional.
  Fluxo do usuário: Configurações → Sincronização → e-mail e senha (Criar conta / Entrar), igual nos dois aparelhos.
  Falta fazer no painel do Supabase (o MCP ainda não está autenticado, então não deu para fazer daqui):
  (1) Authentication → URL Configuration: **Site URL = `https://rotina-gcf.vercel.app`** e a mesma URL em Redirect URLs
  (senão o link do e-mail de confirmação aponta para localhost); (2) opcional: desligar "Confirm email";
  (3) conferir que `supabase/schema.sql` foi rodado (a tabela existe: anônimo recebe 42501).
  O conector está em `.mcp.json` (autenticar com `/mcp` num `claude` interativo) e as skills oficiais em
  `.claude/skills/` (`supabase`, `supabase-postgres-best-practices`; trava em `skills-lock.json`).
- Publicar `dist/` numa hospedagem com HTTPS (o celular precisa de uma URL, não do localhost).
- Os dados do app antigo não migram (outro formato). Recadastrar ou mandar o JSON para adaptar.
