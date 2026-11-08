# Gates: Rotina — app completo + 5 mudanças

OWNS: **

Scope: Web app Rotina (React + TS, localStorage + sincronia Supabase) com Hoje, Tarefas, Escola, Horários, Dieta, Treino e Configurações, incluindo dieta editável, sincronia entre aparelhos, recuperação corrigida, ponto extra e "Repetir" nos cadastros semanais.

- [x] G1: Fórmulas de notas, ponto extra, recuperação limitada e mescla da sincronia passam nos testes
  CHECK: npm test
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=294a52e2f0be81815d1641d9ed8a7abf424751c922809692c9e8170df8bb143b; exit=0; EXPECT=matched; output-sha256=f6204b7c438854ff7c1c015c71196797ff248d12266b9fbe48a883b0da119bc5; output-bytes=3964; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G2: Tipagem e build de produção passam
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=46d72eccd628b28a4b0e974e69890ad856bb5d28a16876531804fc540a571513; exit=0; EXPECT=matched; output-sha256=43059c4afe0fd41e3db713f1642a3dda81e262b04dcf8217cc69dbe5ae5cabf5; output-bytes=1072; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G3: Telas em 1440/900/390 sem rolagem lateral, sem erro de console, e fluxos (recuperação, ponto extra, validação, dieta repetida e editável, horários repetidos, tarefas com desfazer, tema escuro) funcionam no navegador
  CHECK: node scripts/verificar.mjs navegador
  EXPECT: NAVEGADOR OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2411768525884d58efc62d6c9e5c42ab3292d9239f886411796438986e4df39b; exit=0; EXPECT=matched; output-sha256=13273636cbaf846604a0d008665d41d6f898c3ae08ca5ec9c713828b4b65cf07; output-bytes=4945; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G4: Lighthouse mobile: performance ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95
  CHECK: node scripts/verificar.mjs lighthouse
  EXPECT: LIGHTHOUSE OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=1211f45d524a28786ac5c7c83e7d8fed76032681491a3c03501dd3d79964e94d; exit=0; EXPECT=matched; output-sha256=520eb8a3aca6ea68faaa6778f9f0590620d950e48412e69cdf9c7fad1cc1655b; output-bytes=100; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G5: Projeto e entregável dentro do orçamento de peso, sem arquivo inútil
  CHECK: node ~/.claude/tools/peso.mjs . --entregavel dist
  EXPECT: PESO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=68bf6d4d67a9755463ed8170990a5db6bfc50f6e02526198ec34c5c868d856d1; exit=0; EXPECT=matched; output-sha256=25e94fd639045cd65c4604714e35517968409dd126cab4e1851e1d6ff9937d08; output-bytes=256; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

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
  EVIDENCE: automatic-evidence=v1; definition-sha256=d5528d06cf707b42b58e54e620a7bf74ffd14be7c7e5a0bb7ecf696cfb4cc02e; exit=0; EXPECT=matched; output-sha256=272a2ea0fdc551c263e220bf010cea5ddacb1f0098e0250340df51255352bcbb; output-bytes=486; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Sem scroll lateral na lista da Escola (pedido de 08/11/2026: "100% parado e perfeito")

- [x] G13: Passar o mouse em cada matéria, de 1100 a 2560 px, não cria scroll lateral nem na lista fixa nem na página
  CHECK: node scripts/verificar.mjs hover
  EXPECT: HOVER OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=aab3c55e01d585a4612967857b11d60a7a2beaf7d7be139e0ad93a5603aea34b; exit=0; EXPECT=matched; output-sha256=201537e8b83306e0a8d034ed9a20da1b633a521425d864def34bd9cce383f821; output-bytes=351; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Hero novo + Flashcards (pedido de 08/11/2026)

- [x] G10: Repetição dos flashcards (caixas de Leitner) calcula a próxima revisão certa: acerto sobe de caixa e espaça, erro volta para a caixa 1 e revisa hoje
  CHECK: node --test tests/flashcards.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=ffa4fc2dfa68161eb06f840d64cf214f353c7021a1bc5bdfd1170e685126f771; exit=0; EXPECT=matched; output-sha256=ad56ef472e11f57886e794918696a9046ca1231e731df302f06ae2dc83d8c0fa; output-bytes=929; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

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
  EVIDENCE: automatic-evidence=v1; definition-sha256=8e62886e15e40090b817d3fe4701c5a71779a0dddb013882bdfb49a5170d1228; exit=0; EXPECT=matched; output-sha256=61b5f876e6ecb5350dd28158949e505366ab8016ed55b1cac7999a9695200048; output-bytes=783; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

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
  EVIDENCE: automatic-evidence=v1; definition-sha256=b0830b91a5be9651da8aeb1921300c7dc3b15005118cd9c40267aef4c5cfd709; exit=0; EXPECT=matched; output-sha256=e00ffb928c035a869622d2a983c728a616102d2d01c06c2f8c6e3612b768d7ac; output-bytes=616; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G20: No celular: checks por alimento, check indeterminado, resumo, "Comi fora do plano" calculado pela tabela, tirar com confirmação e Desfazer, Hoje mostra "em parte"
  CHECK: node scripts/verificar.mjs diario
  EXPECT: DIARIO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=8102ce489e57882002ec8acb182af9f5d93b3fdfa2df3be2d046c96a623532fb; exit=0; EXPECT=matched; output-sha256=c4522fbf38a0cc1b64a9c7fb113d42c56726184aa449750c8b2c2c754a933e32; output-bytes=1108; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Faixa de repetições na ficha (pedido de 08/11/2026: "não consigo colocar de 8 a 10")

- [x] G21: Repetições aceitam número ou faixa ("8-10", "8 a 10") e recusam o resto; ficha e treino mostram "8–10"
  CHECK: node --test tests/reps.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=69c10bcc4a7bd4fa47fa1d045f2118863145c110b41bf953348d0479c0ee48fc; exit=0; EXPECT=matched; output-sha256=20f0afad9babab80506b2b1ccf9943d5ed3591761f40bac20403345f49e9a619; output-bytes=257; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G22: No celular: digitar 8-10 cabe no campo, salva sem erro, ficha mostra 3×8–10, treino mostra a meta, editar traz 8-10
  CHECK: node scripts/verificar.mjs reps
  EXPECT: REPS OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2bf6dc426e68bcabe3b198f397d5ef3f73dc19962d446589f772bdbe527514a8; exit=0; EXPECT=matched; output-sha256=ddad768a79b38f710a639788f004fee1d6e8eeb37a6e16e5ab456d748f9c35b8; output-bytes=372; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

## Iniciar treino: modo foco (pedido de 08/11/2026)

- [x] G23: Sessão de treino: segue a ficha, próxima série (volta à pulada), série extra, carga sugerida, "última vez", resumo (volume, duração)
  CHECK: node --test tests/sessao.test.ts
  EXPECT: ℹ fail 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=24db6d6aad8090a9089ad08610966b210feeca93f7d51b31e3ca55386ee3e058; exit=0; EXPECT=matched; output-sha256=3dae461cdd6404cb4ffdb9025b79c6c994c47b10183b00216fcbfa6c483d508d; output-bytes=589; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries

- [x] G24: No celular e no desktop: Iniciar treino, contador com riscos de giz, atalhos da meta, peso ±, concluir abre descanso, pular, próximo/anterior, série extra, resumo e salvar; qualquer ficha pode ser iniciada
  CHECK: node scripts/verificar.mjs foco
  EXPECT: FOCO OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=ddf95f09cdbcce68167f024cfdbc843936b063ab7c1cdabf056dc752393879ad; exit=0; EXPECT=matched; output-sha256=3e58d6ce30ba6c4d814cb9fc03aa6c784379a5090b0dfa80966947f870a0294b; output-bytes=952; shell=/bin/sh; cwd=/Applications/MAMP/htdocs/rotina; path=d8381a8b3eef/16 entries
