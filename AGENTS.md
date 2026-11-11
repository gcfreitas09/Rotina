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
  O filtro de dificuldade vale para três coisas ao mesmo tempo: a **lista de cartões da pasta**, o rótulo/contagem do botão Estudar e a sessão de estudo. Já ficou só nas duas últimas e parecia "não funcionar" no celular (a lista embaixo seguia igual).
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
  Repetições **já vêm preenchidas com a meta** (− e + na lousa, atalhos 8/9/10 da faixa); o contador "toque a cada repetição" foi
  removido a pedido do Guilherme (não dá para tocar a cada rep no meio da série). Peso ±1/±2,5, "Concluir série"
  abre o descanso no mesmo painel (anel, ±15 s, pular; no fim vibra e apita), série extra, anterior/próximo, resumo e "Salvar treino".
  Aba "Lista" = o modo antigo (corrigir séries). Tela fica acesa (Wake Lock). Lógica em `treino/sessao.ts` (testada).
  **Descanso por exercício** (pedido de 09/11/2026): `Exercicio.descanso`/`descansoMax` em segundos; na ficha aceita "90" ou faixa
  "120-190" (`treino/descanso.ts`, testado). Vazio = `Config.descansoSeg`. Faixa: conta até o mínimo (alarme), mostra "Pode ir"
  até o máximo (alarme de novo) e encerra. **O descanso em andamento fica salvo na sessão** (`Sessao.descanso {inicio,minMs,maxMs}`),
  gravado junto com a série no mesmo `salvar` (dois `salvar` seguidos: o segundo apagava o primeiro). Sair do app, recarregar ou
  trocar de exercício não zera; só Pular/Começar série/fim. Alarme só toca se a página estiver visível e o fim tiver menos de 5 s.
  **Próximo exercício bloqueado** até todas as séries do atual estarem feitas (botão e mapa; voltar é livre).
  Alarme por cima da música: Web Audio + `navigator.audioSession.type = "transient"` durante o alarme. Nunca `<audio>` em loop no
  treino (para a música do usuário); `liberarSom(true)` com silêncio em loop é só da Leitura.
  Tela preta ao voltar ao app instalado (iPhone): `useTelaAcesa` solta a trava ao sair e pede de novo 600 ms depois de voltar;
  `main.tsx` força repintura em `visibilitychange`/`pageshow`. Mitigação, não verificada num iPhone real.
  **Progresso** (pedido do Guilherme, 09/11/2026: "salve as cargas… para ver se estou evoluindo"): `treino/progresso.ts` (testado em
  `tests/progresso.test.ts`). Conta **toda série concluída**, com ou sem "Salvar treino" (antes só os treinos salvos entravam e quem
  saía antes perdia o registro). Por exercício: histórico por dia, melhor série pelo 1RM estimado (Epley, para comparar pesos e reps
  diferentes), tendência (último treino vs média dos até 3 anteriores: +2 % sobe, −3 % cai), recorde e "mesma carga há N treinos".
  Tela "Progresso" no Treino (lista; tocar abre gráfico + histórico). O treino novo começa cada série com o peso usado nela da última
  vez (`novaSessao(..., anteriores)`); sem histórico, o da ficha.
- `src/modules/leitura/` — aba Leitura em Mais (`#/mais/leitura`, sessão em `#/mais/leitura/agora`): livros (`livros`), sessões com
  tempo (`leituras`, `fim: null` = em andamento), metas do dia em `Config` (`metaPaginasDia`, `metaMinutosLeitura`).
  Foco do iPhone: site não liga Foco nem bloqueia apps; o app abre o atalho do usuário (`Config.atalhoLeitura`) por
  `shortcuts://x-callback-url/run-shortcut` com os minutos (0 = desligar) e volta pelo `x-success`. Só desliga ao encerrar
  se a sessão ligou (`focoIphone`). Passo a passo do atalho fica na própria tela.
  Foco do iPhone, **versão simples (pedido do Guilherme: "deixe só ao começar ligar o foco ficando no app, o cara se vira depois
  para desligar")**: o app só **liga** o Foco ao começar e não mexe mais nele (nada de desligar, copiar minutos, "+5 min" religando,
  cartão no fim). Modo `Config.focoSemSair`: a pessoa aciona o atalho por gesto (Toque
  Duplo/Botão de Ação/Central de Controle), que roda por cima do app; o atalho tem **uma ação só** (Definir Foco: Leitura, Ativar).
  Modo "nome do atalho": abre o app Atalhos. Limites do iOS (pesquisados): o Foco não impede sair para outros apps e nenhum site
  liga o Acesso Guiado (trava num app, limite de tempo; só a pessoa liga) → só está no passo a passo da tela de Leitura (os cartões na sessão foram tirados a pedido do Guilherme: poluíam a tela); **nada volta sozinho para
  um web app instalado** (`https` no x-success abre o Safari, com armazenamento separado; `webapp://` não funciona no iOS 26) →
  no app da Tela de Início o link do atalho não leva `x-success` (`urlDeVolta`). Isso já deu bug: a versão com cópia da área de
  transferência, "Ativar até" e desligar pelo app ficou complicada e travava; não reintroduzir sem pedido.
  Som de fim de tempo: o iPhone só libera áudio depois de um toque, então `components/alerta.ts` destrava o contexto de áudio num
  toque (`liberarSom`: iniciar leitura, +5 min, primeiro toque da sessão, concluir série) e o alarme (`tocarAlarme`, ~6 s) reaproveita
  esse contexto; criar o áudio na hora do fim (sem toque) saía mudo. Em volta toca um silêncio (`manter`) para tentar ignorar a chave
  de silêncio (melhor esforço, não verificado num iPhone).
  Campo "Livro": ao digitar, lista de opções clicáveis da Open Library (`leitura/catalogo.ts`, direto do navegador: libera CORS;
  a API do Google Livros está sem cota sem chave). Preenche livro, autor e páginas (edição mediana: o app avisa para conferir).
  Resultados vêm sujos, então `ranquear` filtra (todas as palavras digitadas), tira resumos/repetidas e prefere obra conhecida em
  português. Sem internet, a lista avisa e o cadastro à mão continua valendo.
  No desktop a Leitura tem item próprio no menu lateral (`navLateral` em `App.tsx`, entre Saúde e Mais); no celular fica em
  Mais para a barra de baixo seguir com 5 itens (pedido do Guilherme, 08/11/2026).
  Também no desktop (≥ 900 px) a aba "Leitura" some das abas de Mais, e a barra de abas inteira some quando se está na Leitura
  (CSS `.mais-abas` em `styles.css`; `Abas` marca cada aba com `data-aba` e reposiciona o traço ao redimensionar).
- `src/modules/financas/` — aba Finanças em Mais (`#/mais/financas`; no desktop tem item próprio no menu lateral, como a Leitura).
  Pedido de 10/11/2026 ("salário, vales, gastos, ganhos"). Coleções `lancamentos` (entrada/saída) e `fixos` (repetem todo mês: salário,
  VR, aluguel, assinatura; `dia`, `desde` = aaaa-mm). Dia aceita faixa "05-10" (`diaMax`, `lerDias`; campo de texto, não numérico): mostra "05–10" e ordena pelo primeiro dia. **Dinheiro sempre em centavos inteiros** (`lerValor` aceita "1.234,56", "12.50",
  "R$ 30"; "1,234" é inválido). Vales (VR/VA/VT) são carteiras à parte: não entram no saldo da conta e têm saldo próprio.
  "Recebi/Paguei" num fixo cria o lançamento com `fixoId` (no mês atual, com a data de hoje); editar o lançamento corrige o valor do mês.
  **Acumulado** (pedido de 10/11/2026: "ganhei 800 mês passado e não gastei tudo, deixe acumulativo"): "Na conta" = tudo que entrou
  menos tudo que saiu até o fim do mês (`saldoAte`); vales também acumulam. "Ajustar saldo" informa quanto tem de verdade e lança a
  diferença com a categoria `AJUSTE`, que mexe só no acumulado (fora de entrou/saiu, categorias, ritmo e gráficos de gasto).
  Linha "Dá para gastar R$ X por dia" = (acumulado + a receber − a pagar) / dias que faltam, só no mês atual (`ritmoDoMes`).
  **Panorama** (`#/mais/financas/panorama`, `Graficos.tsx`, SVG puro, sem biblioteca): ritmo do mês (gasto acumulado por dia,
  projeção tracejada, mês anterior pontilhado), "Na conta, mês a mês" (linha) e "Entrou e saiu" (barras). Cores `--graf-entrou`
  (musgo) e `--graf-saiu` (mostarda) passaram no validador de daltonismo da skill dataviz; verde × laranja/marrom NÃO passa.
  Dica ao tocar/passar, "Ver em tabela", linha desenha uma vez (GSAP). Grade do panorama com `minmax(0, 1fr)`: sem isso o svg
  alarga a coluna e o cartão passa da tela no celular.
  Ideias aprovadas pelo Guilherme (10/11/2026: 2, 4, 6, 7, 9):
  **Limites por categoria** (`Config.limitesGasto`, centavos; botão "Limites" em "Para onde foi"): barra fica amarela aos 80%,
  vermelha ao passar; `salvarLancamento` (`acoes.tsx`) avisa só ao CRUZAR 80% ou 100% (`cruzouLimite`). Todo lançamento novo passa por ela.
  **Contas do dia no Hoje** (`HojeDinheiro.tsx`, cartão "Dinheiro"): fixos não lançados cuja data chegou (`contasDoDia`; atrasado =
  passou do último dia da faixa), com Recebi/Paguei, + "dá para gastar hoje" e lançar rápido.
  **Resumo do mês** (`fechamento`): cartão no topo de Finanças do dia 1 ao 7 do mês seguinte até "Fechar resumo" (`Config.resumoVisto`);
  no Panorama de um mês passado aparece sempre.
  **50/30/20** no Panorama (`regra503020`): base = tudo que entrou; Alimentação conta como necessidade. Barra de uma cor + marca da meta.
  **Lançar rápido** (`rapido.ts`, testado): "lanche 12,50", "uber 18 ontem", "+800 salário", "almoço 32,50 vr". Categoria: primeiro a da
  mesma descrição já lançada (aprende), depois palavras. Só aparece no mês atual (lança com a data de hoje).
  Vale: sigla ("va", "vt", "vr") ou por extenso ("vale alimentação", "vale-transporte") em qualquer lugar da linha; o extenso é tirado
  ANTES de procurar sinais de entrada (senão "vale" virava entrada na conta — bug de 10/11/2026). Preposição solta nas pontas ("no va") sai.
  Data na linha (`lerData`): "06/11", "6/11/2026", "06/11/26", "dia 6"; tirada ANTES do valor (senão "06/11" vira dinheiro). Sem ano e no
  futuro = ano anterior; "dia N" que ainda não chegou = mês anterior; data que não existe (31/02) recusa a linha.
  **Números do topo** (pedido de 10/11/2026, não voltar aos antigos Entrou/Saiu/Saldo/Na conta): Salário (categoria Salário no mês
  + "falta receber" dos fixos de salário, `salarioDoMes`), Vale-alimentação e Vale-transporte (saldo acumulado + "usou X de Y",
  `valeNoMes`) e Saldo do mês (entrou − saiu da conta, com "na conta" acumulado embaixo e "Ajustar saldo"). O VR, se usado,
  fica na seção "Vale-refeição" da lateral.
  Contas em `financas/logica.ts` (testado em `tests/financas.test.ts`). Aba "Configurações" de Mais virou "Ajustes" (4 abas não cabiam em 390 px).
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
- "Choque" ao trocar o filtro (pílula do `Segmentos` ia ao destino, voltava ao ponto antigo e só então deslizava; o traço das `Abas` tem o
  mesmo código) → duas animações GSAP da mesma peça: a instantânea do `ResizeObserver` (que dispara ao ser criado) e a deslizante.
  Regra: `gsap.to` de peça que reposiciona leva `overwrite: true`, e o observador só reage se a largura mudou de verdade.
- Filtro "Semana" das Tarefas sumia com a tarefa de amanhã aos domingos (usava a semana de calendário, que acaba no domingo) →
  agora é hoje + 6 dias (`filtrar` em `tarefas/logica.ts`). Regra: filtro de "semana" no app = próximos 7 dias, nunca fim de semana de calendário.
- Zoom no celular (pedido do Guilherme: "bloqueie o zoom em todo o aplicativo"): (1) o Safari dá zoom ao tocar em campo com letra
  < 16 px → em tela de toque todo `input`/`select`/`textarea` fica com 16 px (`@media (pointer: coarse)`, `!important` de propósito);
  (2) o iPhone ignora `maximum-scale`/`user-scalable=no` para a pinça → `main.tsx` barra `gesturestart`/`gesturechange` e `touchmove`
  com 2 dedos; (3) toque duplo → `html { touch-action: pan-x pan-y }` (manipulation não basta: ainda deixa a pinça).
- Campo de data no iPhone tem largura mínima própria e passava por cima da coluna ao lado (data sobre a prioridade da tarefa) →
  `.linha-campos > * { min-width: 0 }` e date/time com `appearance: none; min-width: 0`. Regra: campo de data em linha com outro sempre assim.
- Fichas do treino no celular: os botões ocupavam uma coluna à direita e a tabela ficava espremida ("3×10-" / "12", "0" / "kg") →
  botões ("Iniciar" + lápis) no cabeçalho da ficha, tabela em largura total, números sem quebra, carga 0 aparece "—".
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
- Dias da repetição ("seg, ter, qua…") encostavam na borda direita da faixa de urgência da tarefa → `.item[data-urg] .item-corpo:not(.com-sub) { padding-right: 14px }` (com subtarefa já tem 32 px pela seta).
- "Em que página você parou?" não deixava apagar (apagava e o número voltava) → um `useEffect` recolocava a página de início
  sempre que o campo ficava vazio. Regra: efeito que preenche campo roda **uma vez** (ref) ou depende só do valor salvo,
  nunca do texto digitado nem de objeto inteiro (`cfg`), senão qualquer re-render apaga o que a pessoa digita.
- Campo de número seleciona tudo ao tocar (pedido de 09/11/2026: "clicar no número já seleciona, eu só escrevo"): listener global
  em `main.tsx` (`focusin`) para `inputMode` numeric/decimal, `type=number` e classe `num`. Campo novo de número: usar um desses.
- Data das notas (Escola) passava da borda direita no iPhone: o campo de data fica fora de `.campo` e tem largura mínima própria →
  `.nota-data` com `appearance: none; min-width: 0; width: 100%`. Regra: todo `input[type=date]` fora de `.campo` leva isso.
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
