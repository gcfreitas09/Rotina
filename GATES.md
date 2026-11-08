# Gates: Rotina — app completo + 5 mudanças

OWNS: **

Scope: Web app Rotina (React + TS, localStorage + sincronia Supabase) com Hoje, Tarefas, Escola, Horários, Dieta, Treino e Configurações, incluindo dieta editável, sincronia entre aparelhos, recuperação corrigida, ponto extra e "Repetir" nos cadastros semanais.

- [x] G1: Fórmulas de notas, ponto extra, recuperação limitada e mescla da sincronia passam nos testes
  CHECK: npm test
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=294a52e2f0be81815d1641d9ed8a7abf424751c922809692c9e8170df8bb143b; exit=0; EXPECT=matched; output-sha256=a2f962a8de8dbea3df5e38bc0b1a9dd96c0c1a83d3b3bd4e817a07c7cd78df42; output-bytes=2850; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G2: Tipagem e build de produção passam
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=46d72eccd628b28a4b0e974e69890ad856bb5d28a16876531804fc540a571513; exit=0; EXPECT=matched; output-sha256=54bddd64e11326ea4bdd33d5405ad6f84a5fc7c14ceba0fb3f4f73dfa1aa7b8d; output-bytes=1071; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G3: Telas em 1440/900/390 sem rolagem lateral, sem erro de console, e fluxos (recuperação, ponto extra, validação, dieta repetida e editável, horários repetidos, tarefas com desfazer, tema escuro) funcionam no navegador
  CHECK: node scripts/verificar.mjs navegador
  EXPECT: NAVEGADOR OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2411768525884d58efc62d6c9e5c42ab3292d9239f886411796438986e4df39b; exit=0; EXPECT=matched; output-sha256=c37fc3dbd94745198581e6dc607fd31183509099db2fcfad77ed9d4140fe20cd; output-bytes=4939; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G4: Lighthouse mobile: performance ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95
  CHECK: node scripts/verificar.mjs lighthouse
  EXPECT: LIGHTHOUSE OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=1211f45d524a28786ac5c7c83e7d8fed76032681491a3c03501dd3d79964e94d; exit=0; EXPECT=matched; output-sha256=2cac09c1738934fa869acbefc6c2f6077c748b81a066692e44fb592bb39187bc; output-bytes=100; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G5: Projeto e entregável dentro do orçamento de peso, sem arquivo inútil
  CHECK: node ~/.claude/tools/peso.mjs . --entregavel dist
  EXPECT: PESO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=68bf6d4d67a9755463ed8170990a5db6bfc50f6e02526198ec34c5c868d856d1; exit=0; EXPECT=matched; output-sha256=a4169fbcf25089d38626a76ab27281fb049d0c5f03421c8deae8b2f053c4bf7b; output-bytes=256; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

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
  EVIDENCE: automatic-evidence=v1; definition-sha256=d5528d06cf707b42b58e54e620a7bf74ffd14be7c7e5a0bb7ecf696cfb4cc02e; exit=0; EXPECT=matched; output-sha256=50f2051e95a31df8c2ce4f720d326e3e57f1670b09a513b0f26be2e054e89e65; output-bytes=488; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Sem scroll lateral na lista da Escola (pedido de 08/11/2026: "100% parado e perfeito")

- [x] G13: Passar o mouse em cada matéria, de 1100 a 2560 px, não cria scroll lateral nem na lista fixa nem na página
  CHECK: node scripts/verificar.mjs hover
  EXPECT: HOVER OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=aab3c55e01d585a4612967857b11d60a7a2beaf7d7be139e0ad93a5603aea34b; exit=0; EXPECT=matched; output-sha256=201537e8b83306e0a8d034ed9a20da1b633a521425d864def34bd9cce383f821; output-bytes=351; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Hero novo + Flashcards (pedido de 08/11/2026)

- [x] G10: Repetição dos flashcards (caixas de Leitner) calcula a próxima revisão certa: acerto sobe de caixa e espaça, erro volta para a caixa 1 e revisa hoje
  CHECK: node --test tests/flashcards.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=ffa4fc2dfa68161eb06f840d64cf214f353c7021a1bc5bdfd1170e685126f771; exit=0; EXPECT=matched; output-sha256=7c671b8534455a03d92a07ccfb1464dd1412f24ef8df0412134f55a451aa0662; output-bytes=922; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

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
  EVIDENCE: automatic-evidence=v1; definition-sha256=8e62886e15e40090b817d3fe4701c5a71779a0dddb013882bdfb49a5170d1228; exit=0; EXPECT=matched; output-sha256=5a1ae384fd71ca2f548cec726d85b22660fd2a220cc1a85161d45cb4e12b2f09; output-bytes=779; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G17: No formulário de refeição (390 px): sugestões da tabela, kcal e proteína preenchidas sozinhas, escolha na lista, valor digitado respeitado, alimento desconhecido avisado, recalcula ao editar, sem rolagem lateral
  CHECK: node scripts/verificar.mjs nutricao
  EXPECT: NUTRICAO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=948d83a9acd5b479a295ac145fd5a60f200053abda438609d4b1cfb0e21e506e; exit=0; EXPECT=matched; output-sha256=fa7e652aef6242ed326ead8a968f436c9c5c197320c7d2b847b352d561ac4a79; output-bytes=894; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G18: Produtos de marca (Open Food Facts, precisa de internet): a lista mostra tabela + marcas, escolher um produto usa o rótulo, salva os valores e recalcula sem internet ao reabrir
  CHECK: node scripts/verificar.mjs marcas
  EXPECT: MARCAS OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=3f672f30c8ef6e086d1ea02a98bf6edbc9683a5707ffa82e6ecbae017c0e830b; exit=0; EXPECT=matched; output-sha256=9206cce5ca0111fce95f7f9fdbe8caf999f17728022cad0a512c048053bf1e0e; output-bytes=682; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries
