# Gates: Rotina — app completo + 5 mudanças

OWNS: **

Scope: Web app Rotina (React + TS, localStorage + sincronia Supabase) com Hoje, Tarefas, Escola, Horários, Dieta, Treino e Configurações, incluindo dieta editável, sincronia entre aparelhos, recuperação corrigida, ponto extra e "Repetir" nos cadastros semanais.

- [x] G1: Fórmulas de notas, ponto extra, recuperação limitada e mescla da sincronia passam nos testes
  CHECK: npm test
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=294a52e2f0be81815d1641d9ed8a7abf424751c922809692c9e8170df8bb143b; exit=0; EXPECT=matched; output-sha256=aaca6d082f430d78ac611d29720f1e97eea1324b518214c2c759a55554614da4; output-bytes=4252; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G2: Tipagem e build de produção passam
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=46d72eccd628b28a4b0e974e69890ad856bb5d28a16876531804fc540a571513; exit=0; EXPECT=matched; output-sha256=62ab91145dd965c76e5cc6dab83853081ed1fefc1a28d6b13eae192cbc3a354a; output-bytes=1072; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G3: Telas em 1440/900/390 sem rolagem lateral, sem erro de console, e fluxos (recuperação, ponto extra, validação, dieta repetida e editável, horários repetidos, tarefas com desfazer, tema escuro) funcionam no navegador
  CHECK: node scripts/verificar.mjs navegador
  EXPECT: NAVEGADOR OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2411768525884d58efc62d6c9e5c42ab3292d9239f886411796438986e4df39b; exit=0; EXPECT=matched; output-sha256=13273636cbaf846604a0d008665d41d6f898c3ae08ca5ec9c713828b4b65cf07; output-bytes=4945; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G4: Lighthouse mobile: performance ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95
  CHECK: node scripts/verificar.mjs lighthouse
  EXPECT: LIGHTHOUSE OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=1211f45d524a28786ac5c7c83e7d8fed76032681491a3c03501dd3d79964e94d; exit=0; EXPECT=matched; output-sha256=f97c610a0f0cb3b0758e7897677b56bd8a04d514a88095b9e1ac17583dc2dca9; output-bytes=100; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G5: Projeto e entregável dentro do orçamento de peso, sem arquivo inútil
  CHECK: node ~/.claude/tools/peso.mjs . --entregavel dist
  EXPECT: PESO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=68bf6d4d67a9755463ed8170990a5db6bfc50f6e02526198ec34c5c868d856d1; exit=0; EXPECT=matched; output-sha256=f638b25c8a6f2b038de5eb074ed8481fe70927974f898185d9443f436794df23; output-bytes=256; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G6: Screenshots olhados e criticados (claro e escuro, três larguras, diálogo, cronômetro)
  EVIDENCE: 08/11/2026 — olhados 390/900/1440 (Hoje, Escola, matéria, Horários grade, Dieta escura, Treino, Treinando com cronômetro, diálogo). Corrigidos: rótulo 7,0 da régua sobre os nomes, última data cortada no gráfico de linha, semestre incompleto vermelho no comparativo, aviso cobrindo o diálogo.

- [ ] G7: Sincronia testada de ponta a ponta contra um projeto Supabase real (celular ↔ computador)
  EVIDENCE: pending

ABANDON: G7 O teste de ponta a ponta exige entrar com a conta do Guilherme (e confirmar o e-mail), e criar uma conta de teste no projeto dele não é permitido aqui. Coberto em 08/11/2026: chave publishable aceita pelo projeto "rotinas" (auth/settings respondeu 200), tabela rotina_registros existe e nega acesso anônimo (42501), o app com a chave mostra a tela de login sem erro, e mescla e lápides estão em tests/mesclar.test.ts. Handoff: criar a conta no app, entrar nos dois aparelhos e conferir que um item criado no celular aparece no computador.

## Redesign (pedido de 08/11/2026: "muito sem vida, capriche, use efeitos")

- [x] G8: Com "reduzir movimento" ligado, nada fica escondido ou no meio da animação (todo [data-anima] com opacidade 1) e o app continua sem erro
  CHECK: node scripts/verificar.mjs movimento
  EXPECT: MOVIMENTO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=50be170976e11534a642a0ed97cea46a2370fa769cc347b179ae80e341e4e880; exit=0; EXPECT=matched; output-sha256=dbbd1cf852bdd290e97ea608a80038049126f127235c78c930a534d4b64b4b59; output-bytes=777; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G9: Redesign olhado em 390/900/1440, claro e escuro: lousa no Hoje e na lateral, números contando, copo d'água, cronômetro circular, transição entre telas
  EVIDENCE: 08/11/2026 — olhados Hoje 390/1440 claro e 1440 escuro, Escola 390 + matéria, Dieta 390, Treinando com anel (claro/escuro), Horários 1440 escuro; depois do pedido "use a tela toda": 1920 escuro (Hoje, Escola, matéria, Treino), 1100 claro (Dieta), 390 claro (Hoje). Corrigidos: média geral diferente entre Hoje e Escola (soma parcial), quadriculado forte demais, buraco no painel do desktop, agulha amarela (virou giz: um destaque só), foco/rolagem atrás da barra flutuante.

## Fluidez no celular (pedido de 08/11/2026: "está travando no mobile")

- [x] G15: Com a tela parada, Hoje, Dieta, Tarefas, Escola e Horários não repintam (máx. 5 pinturas em 2,5 s, no celular)
  CHECK: node scripts/verificar.mjs parado
  EXPECT: PARADO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=a1d8ca7f1132a5e0651b50aa3c2acb99199ad61b73741d173eeab9c5454218e3; exit=0; EXPECT=matched; output-sha256=d11d085e9f6ea91b7b5945cc28fa5c83a2d5690750ee18e8472edda9d364cb04; output-bytes=281; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Urgência das tarefas por cor (pedido de 08/11/2026)

- [x] G14: A urgência (prazo + prioridade) classifica certo: atrasada sempre urgente; hoje+alta urgente; além de 7 dias tranquila
  CHECK: node --test tests/urgencia.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=d5528d06cf707b42b58e54e620a7bf74ffd14be7c7e5a0bb7ecf696cfb4cc02e; exit=0; EXPECT=matched; output-sha256=216b40bf2f0dc485c505dc0f8c99d3415475d72b74d2f707ec1ca2895265c95f; output-bytes=490; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Sem scroll lateral na lista da Escola (pedido de 08/11/2026: "100% parado e perfeito")

- [x] G13: Passar o mouse em cada matéria, de 1100 a 2560 px, não cria scroll lateral nem na lista fixa nem na página
  CHECK: node scripts/verificar.mjs hover
  EXPECT: HOVER OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=aab3c55e01d585a4612967857b11d60a7a2beaf7d7be139e0ad93a5603aea34b; exit=0; EXPECT=matched; output-sha256=201537e8b83306e0a8d034ed9a20da1b633a521425d864def34bd9cce383f821; output-bytes=351; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Hero novo + Flashcards (pedido de 08/11/2026)

- [x] G10: Repetição dos flashcards (caixas de Leitner) calcula a próxima revisão certa: acerto sobe de caixa e espaça, erro volta para a caixa 1 e revisa hoje
  CHECK: node --test tests/flashcards.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=ffa4fc2dfa68161eb06f840d64cf214f353c7021a1bc5bdfd1170e685126f771; exit=0; EXPECT=matched; output-sha256=a35f7ada403f3b74ced3deabeda69eb9bf16e159600faa35958eaf9e59e8e579; output-bytes=924; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G11: No navegador: criar pasta de História, criar cartão "O que foi a Revolução Francesa?", estudar, virar, "Acertei" tira da fila; dificuldade no cartão, ordem aleatória e filtro Difícil funcionam
  CHECK: node scripts/verificar.mjs flashcards
  EXPECT: FLASHCARDS OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=f4e17fc49fa58e143c4bbfe670c949a88713ddcd482f343b024c55f3ac5ac58b; exit=0; EXPECT=matched; output-sha256=b4bebc62c6a9cf14dbfdd53ea5a1e90cb0e7c7cb3e62f520cabef6437c5937d9; output-bytes=2785; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G12: Hero do Hoje olhado em 390/1100/1920: lousa com os números dentro, painel sem buracos entre blocos
  EVIDENCE: 08/11/2026 — olhados Hoje 1920/1100 escuro e 390 claro, Flashcards (frente, verso, pasta, lista de pastas) em claro/escuro e 1440, e Escola rolada em 1920/1280/390 (resumo fixo a 24 px do topo; comparativo sob as matérias). Corrigido: linhas pautadas do cartão desalinhadas, formulário de cartão atrás da lista no celular, estouro de 15 px no tablet (900 px), vazio embaixo da lista de matérias na Escola (lista agora fixa na rolagem; resumo e comparativo ficam à direita).

## Calorias e proteína automáticas na dieta (pedido de 08/11/2026)

- [x] G16: A partir do alimento e da quantidade ("2 ovos", "4 colheres de sopa", "1 copo", "150 g"), o cálculo pela TACO dá os valores certos, e a tabela tem todos os alimentos preferidos
  CHECK: node --test tests/nutricao.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=8e62886e15e40090b817d3fe4701c5a71779a0dddb013882bdfb49a5170d1228; exit=0; EXPECT=matched; output-sha256=12cec45cc1e67dd76f2ec60f11babf6ded7af0569fdd51a1440c5d51793a7dc8; output-bytes=779; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G17: No formulário de refeição (390 px): sugestões da tabela, kcal e proteína preenchidas sozinhas, escolha na lista, valor digitado respeitado, alimento desconhecido avisado, recalcula ao editar, sem rolagem lateral
  CHECK: node scripts/verificar.mjs nutricao
  EXPECT: NUTRICAO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=948d83a9acd5b479a295ac145fd5a60f200053abda438609d4b1cfb0e21e506e; exit=0; EXPECT=matched; output-sha256=fa7e652aef6242ed326ead8a968f436c9c5c197320c7d2b847b352d561ac4a79; output-bytes=894; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G18: Produtos de marca (Open Food Facts, precisa de internet): a lista mostra tabela + marcas, escolher um produto usa o rótulo, salva os valores e recalcula sem internet ao reabrir
  CHECK: node scripts/verificar.mjs marcas
  EXPECT: MARCAS OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=3f672f30c8ef6e086d1ea02a98bf6edbc9683a5707ffa82e6ecbae017c0e830b; exit=0; EXPECT=matched; output-sha256=9206cce5ca0111fce95f7f9fdbe8caf999f17728022cad0a512c048053bf1e0e; output-bytes=682; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Diário da dieta (pedido de 08/11/2026: check por alimento + "comi fora do plano")

- [x] G19: Marcar alimento por alimento: refeição fica "em parte", todos = inteira, desmarcar volta; resumo do dia conta o seguido e soma o comido fora
  CHECK: node --test tests/diario.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=b0830b91a5be9651da8aeb1921300c7dc3b15005118cd9c40267aef4c5cfd709; exit=0; EXPECT=matched; output-sha256=bbca91bb1bb1ef904ce465faf128215a6cc4c874ac8fcf5ab4e49c443c6eb4fa; output-bytes=613; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G20: No celular: checks por alimento, check indeterminado, resumo, "Comi fora do plano" calculado pela tabela, tirar com confirmação e Desfazer, Hoje mostra "em parte"
  CHECK: node scripts/verificar.mjs diario
  EXPECT: DIARIO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8102ce489e57882002ec8acb182af9f5d93b3fdfa2df3be2d046c96a623532fb; exit=0; EXPECT=matched; output-sha256=c4522fbf38a0cc1b64a9c7fb113d42c56726184aa449750c8b2c2c754a933e32; output-bytes=1108; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Faixa de repetições na ficha (pedido de 08/11/2026: "não consigo colocar de 8 a 10")

- [x] G21: Repetições aceitam número ou faixa ("8-10", "8 a 10") e recusam o resto; ficha e treino mostram "8–10"
  CHECK: node --test tests/reps.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=69c10bcc4a7bd4fa47fa1d045f2118863145c110b41bf953348d0479c0ee48fc; exit=0; EXPECT=matched; output-sha256=badd44d5c330c4a8abc293201a2d242f236e28fb1adefe8fc594b284253be823; output-bytes=262; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G22: No celular: digitar 8-10 cabe no campo, salva sem erro, ficha mostra 3×8–10, treino mostra a meta, editar traz 8-10
  CHECK: node scripts/verificar.mjs reps
  EXPECT: REPS OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2bf6dc426e68bcabe3b198f397d5ef3f73dc19962d446589f772bdbe527514a8; exit=0; EXPECT=matched; output-sha256=3f724b98aac25e65930789db50ecd6ea339da87d4df98db2f32e619e7057955e; output-bytes=372; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Iniciar treino: modo foco (pedido de 08/11/2026)

- [x] G23: Sessão de treino: segue a ficha, próxima série (volta à pulada), série extra, carga sugerida, "última vez", resumo (volume, duração)
  CHECK: node --test tests/sessao.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=24db6d6aad8090a9089ad08610966b210feeca93f7d51b31e3ca55386ee3e058; exit=0; EXPECT=matched; output-sha256=03e054ebe8c753d6643b5f794a6c719ee316060d45cd5c2b67a8e39a72d8d69e; output-bytes=582; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G24: No celular e no desktop: Iniciar treino, contador com riscos de giz, atalhos da meta, peso ±, concluir abre descanso, pular, próximo/anterior, série extra, resumo e salvar; qualquer ficha pode ser iniciada
  CHECK: node scripts/verificar.mjs foco
  EXPECT: FOCO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=ddf95f09cdbcce68167f024cfdbc843936b063ab7c1cdabf056dc752393879ad; exit=0; EXPECT=matched; output-sha256=3e58d6ce30ba6c4d814cb9fc03aa6c784379a5090b0dfa80966947f870a0294b; output-bytes=952; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Leitura (pedido de 08/11/2026: metas, livro, página onde parou, iniciar leitura com foco no iPhone)

- [x] G25: Leitura: páginas/minutos do dia, sequência, encerrar guarda a página (livro lido no fim), previsão, link do atalho do iPhone que volta ao app
  CHECK: node --test tests/leitura.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=4265ea8ecebbcfbdf54cabad4b1b9febe7f8863e53087459956f68a71e4d7d5b; exit=0; EXPECT=matched; output-sha256=b769ec726f93507e114e8e94d392699aa41eee10239f9f526e2bef379b63b0dc; output-bytes=400; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G26: No celular: cadastrar livro, metas, nome do atalho, iniciar leitura (15 min), +5 min, encerrar com a página, estante atualiza, livro terminado vai para Lidos, sem chamar o atalho quando o foco não foi ligado
  CHECK: node scripts/verificar.mjs leitura
  EXPECT: LEITURA OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=23b9815022755826372c801ddc234e174a1ce506327e14f0b481f2025a267a71; exit=0; EXPECT=matched; output-sha256=ebeb5c9a3f4adf33c68dd2366d05dc10932efde27db1968cdd2a51617e590327; output-bytes=852; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [ ] G27: Foco do iPhone de verdade (atalho "Iniciar leitura" liga o Foco e volta ao Rotina; encerrar antes desliga)
  EVIDENCE: pending

ABANDON: G27 Precisa de um iPhone com o atalho criado; daqui só dá para conferir o link gerado (G25). Handoff: criar o Foco e o atalho seguindo "Como montar no iPhone" na tela de Leitura e testar uma sessão de 1 minuto.
