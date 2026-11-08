# Gates: Rotina — app completo + 5 mudanças

OWNS: **

Scope: Web app Rotina (React + TS, localStorage + sincronia Supabase) com Hoje, Tarefas, Escola, Horários, Dieta, Treino e Configurações, incluindo dieta editável, sincronia entre aparelhos, recuperação corrigida, ponto extra e "Repetir" nos cadastros semanais.

- [x] G1: Fórmulas de notas, ponto extra, recuperação limitada e mescla da sincronia passam nos testes
  CHECK: npm test
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=294a52e2f0be81815d1641d9ed8a7abf424751c922809692c9e8170df8bb143b; exit=0; EXPECT=matched; output-sha256=74d57e79ad093782a1e06567b1fa101704652fe125f78764f1a5e6513af029aa; output-bytes=1586; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G2: Tipagem e build de produção passam
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=46d72eccd628b28a4b0e974e69890ad856bb5d28a16876531804fc540a571513; exit=0; EXPECT=matched; output-sha256=c0ce6a2ae8a2de372801b4b4ba403c39024a27f9ebb8df6424a0d0e4115a6018; output-bytes=824; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G3: Telas em 1440/900/390 sem rolagem lateral, sem erro de console, e fluxos (recuperação, ponto extra, validação, dieta repetida e editável, horários repetidos, tarefas com desfazer, tema escuro) funcionam no navegador
  CHECK: node scripts/verificar.mjs navegador
  EXPECT: NAVEGADOR OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2411768525884d58efc62d6c9e5c42ab3292d9239f886411796438986e4df39b; exit=0; EXPECT=matched; output-sha256=e2ab781ebc24c4a5828da2c00ba1a1d135f90c9e8b49d3d6eff8815d43b023ae; output-bytes=4738; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G4: Lighthouse mobile: performance ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95
  CHECK: node scripts/verificar.mjs lighthouse
  EXPECT: LIGHTHOUSE OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=1211f45d524a28786ac5c7c83e7d8fed76032681491a3c03501dd3d79964e94d; exit=0; EXPECT=matched; output-sha256=5195e7e6d6341d57a109b9d799a3f5c238b6325b3fc29f96a8b610ede45b6b66; output-bytes=100; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G5: Projeto e entregável dentro do orçamento de peso, sem arquivo inútil
  CHECK: node ~/.claude/tools/peso.mjs . --entregavel dist
  EXPECT: PESO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=68bf6d4d67a9755463ed8170990a5db6bfc50f6e02526198ec34c5c868d856d1; exit=0; EXPECT=matched; output-sha256=f6a6e8a929058cd253ed7e735c5b289931a2f750d5ba922d83e30ffe8d887f93; output-bytes=266; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

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

## Urgência das tarefas por cor (pedido de 08/11/2026)

- [x] G14: A urgência (prazo + prioridade) classifica certo: atrasada sempre urgente; hoje+alta urgente; além de 7 dias tranquila
  CHECK: node --test tests/urgencia.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=d5528d06cf707b42b58e54e620a7bf74ffd14be7c7e5a0bb7ecf696cfb4cc02e; exit=0; EXPECT=matched; output-sha256=e0876c455ed6a856e99cd749400040bbdafdcf6a88cf7a3cd79326a0902a89ec; output-bytes=486; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Sem scroll lateral na lista da Escola (pedido de 08/11/2026: "100% parado e perfeito")

- [x] G13: Passar o mouse em cada matéria, de 1100 a 2560 px, não cria scroll lateral nem na lista fixa nem na página
  CHECK: node scripts/verificar.mjs hover
  EXPECT: HOVER OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=aab3c55e01d585a4612967857b11d60a7a2beaf7d7be139e0ad93a5603aea34b; exit=0; EXPECT=matched; output-sha256=201537e8b83306e0a8d034ed9a20da1b633a521425d864def34bd9cce383f821; output-bytes=351; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Hero novo + Flashcards (pedido de 08/11/2026)

- [x] G10: Repetição dos flashcards (caixas de Leitner) calcula a próxima revisão certa: acerto sobe de caixa e espaça, erro volta para a caixa 1 e revisa hoje
  CHECK: node --test tests/flashcards.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=ffa4fc2dfa68161eb06f840d64cf214f353c7021a1bc5bdfd1170e685126f771; exit=0; EXPECT=matched; output-sha256=fcf2a6cd52537465f3f0c7b4b26298694e1d769c8885907e06a20a5ed536b80d; output-bytes=331; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G11: No navegador: criar pasta de História, criar cartão "O que foi a Revolução Francesa?", estudar, virar o cartão, marcar "Acertei" e o cartão sai da fila de hoje
  CHECK: node scripts/verificar.mjs flashcards
  EXPECT: FLASHCARDS OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=f4e17fc49fa58e143c4bbfe670c949a88713ddcd482f343b024c55f3ac5ac58b; exit=0; EXPECT=matched; output-sha256=157b10a19a7c9f812d4a3e8d9aac36a32d222ba0a573462d68ec9c51302e7bfe; output-bytes=767; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G12: Hero do Hoje olhado em 390/1100/1920: lousa com os números dentro, painel sem buracos entre blocos
  EVIDENCE: 08/11/2026 — olhados Hoje 1920/1100 escuro e 390 claro, Flashcards (frente, verso, pasta, lista de pastas) em claro/escuro e 1440, e Escola rolada em 1920/1280/390 (resumo fixo a 24 px do topo; comparativo sob as matérias). Corrigido: linhas pautadas do cartão desalinhadas, formulário de cartão atrás da lista no celular, estouro de 15 px no tablet (900 px), vazio embaixo da lista de matérias na Escola (lista agora fixa na rolagem; resumo e comparativo ficam à direita).
