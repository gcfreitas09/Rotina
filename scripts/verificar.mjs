// Verificações do Rotina (gates do GATES.md).
//   node scripts/verificar.mjs navegador   — telas em 1440/900/390, estados e fluxos pedidos
//   node scripts/verificar.mjs lighthouse  — Lighthouse mobile (performance, acessibilidade, boas práticas)
//   node scripts/verificar.mjs hover       — mouse nas matérias não cria scroll lateral (1100 a 2560 px)
//   node scripts/verificar.mjs flashcards — pasta → cartões → estudar (virar, acertei, errei)
//   node scripts/verificar.mjs nutricao    — refeição: kcal e proteína calculadas pela TACO a partir do alimento e da quantidade
//   node scripts/verificar.mjs movimento  — animações não deixam nada escondido (com e sem "reduzir movimento")
// Precisa do build (npm run build). Usa puppeteer/lighthouse de ~/.claude/tools/qa (nunca do projeto).
// Screenshots vão para a pasta temporária do sistema (ou ROTINA_SHOTS), nunca para o projeto.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const qa = createRequire(path.join(os.homedir(), ".claude/tools/qa/package.json"));
const modo = process.argv[2];
const PORTA = 4179;
const BASE = `http://localhost:${PORTA}/`;
const SHOTS = process.env.ROTINA_SHOTS || path.join(os.tmpdir(), "rotina-shots");
fs.mkdirSync(SHOTS, { recursive: true });

const falhas = [];
const falhar = (m) => { falhas.push(m); console.log("  ✗ " + m); };
const ok = (m) => console.log("  ✓ " + m);
const checar = (cond, m) => (cond ? ok(m) : falhar(m));

if (!fs.existsSync(path.join(RAIZ, "dist/index.html"))) {
  console.log("Rode npm run build antes.");
  process.exit(1);
}

const servidor = spawn(process.execPath, [path.join(RAIZ, "node_modules/vite/bin/vite.js"), "preview", "--port", String(PORTA), "--strictPort"], { cwd: RAIZ, stdio: "pipe" });
const esperarServidor = async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("servidor de preview não subiu");
};

async function navegador() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const ROTAS = ["hoje", "tarefas", "escola", "escola/ex-fis", "saude/dieta", "saude/treino", "saude/treino/agora", "mais/horarios", "mais/configuracoes"];

  const novaPagina = async (largura, tema = "light") => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: largura, height: largura < 600 ? 844 : 1000, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: tema }]);
    const erros = [];
    page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
    page.on("pageerror", (e) => erros.push(String(e)));
    page.on("requestfailed", (r) => erros.push("falhou: " + r.url()));
    page.on("response", (r) => r.status() >= 400 && erros.push(`${r.status()}: ${r.url()}`));
    return { page, erros, ctx };
  };
  const ir = async (page, rota) => {
    await page.evaluate((r) => (location.hash = "/" + r), rota).catch(() => {});
    await new Promise((r) => setTimeout(r, 250));
  };

  // 1. Todas as telas, nas três larguras, sem rolagem lateral, com um h1 e sem erro
  for (const largura of [1440, 900, 390]) {
    console.log(`\nLargura ${largura}`);
    const { page, erros, ctx } = await novaPagina(largura);
    await page.goto(BASE + "#/hoje", { waitUntil: "networkidle0" });
    for (const rota of ROTAS) {
      await ir(page, rota);
      const r = await page.evaluate(() => ({
        sobra: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: document.querySelectorAll("h1").length,
        emoji: /\p{Extended_Pictographic}/u.test(document.body.innerText),
      }));
      checar(r.sobra === 0, `${rota}: sem rolagem lateral (${r.sobra}px)`);
      checar(r.h1 === 1, `${rota}: um h1 (${r.h1})`);
      checar(!r.emoji, `${rota}: sem emoji`);
      await page.screenshot({ path: path.join(SHOTS, `${largura}-${rota.replace(/\//g, "_")}.png`), fullPage: true });
    }
    checar(erros.length === 0, `zero erro de console/requisição${erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""}`);
    await ctx.close();
  }

  // 2. Fluxos no celular
  console.log("\nFluxos (390px, movimento reduzido para ler os números já no valor final)");
  const { page, erros, ctx } = await novaPagina(390);
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE + "#/hoje", { waitUntil: "networkidle0" });
  const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);
  const texto = () => page.evaluate(() => document.body.innerText + "\n" + document.body.textContent);
  // Centraliza antes de clicar: a barra inferior flutua sobre o fim da tela.
  const clicar = async (sel) => {
    const el = await page.locator(sel).waitHandle();
    await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await el.click();
    await new Promise((r) => setTimeout(r, 180));
  };
  const preencher = async (el, v, enter = false) => {
    await el.click();
    await el.evaluate((e) => e.select?.());
    await el.press("Backspace");
    await el.type(v);
    if (enter) await el.press("Enter");
    await new Promise((r) => setTimeout(r, 150));
  };
  const digitar = async (sel, v) => preencher(await page.waitForSelector(sel), v);

  // Hoje mostra os blocos pedidos
  const tHoje = await texto();
  for (const s of ["Para hoje", "Treino", "Próxima prova", "Refeições", "Água", "Média geral"]) checar(tHoje.includes(s), `Hoje mostra "${s}"`);

  // Escola: recuperação nunca passa de 7 no bloco
  await ir(page, "escola/ex-his");
  checar((await texto()).includes("(3,5 + 2 × 3,0) ÷ 2 = 4,8"), "História: cálculo da recuperação exibido (3,5 + 2×3,0)/2");
  const recInput = await page.$$("input[inputmode=decimal]");
  // ordem: p1 p2 t1 t2 extra rec (1º sem)
  await preencher(recInput[5], "7", true);
  await new Promise((r) => setTimeout(r, 200));
  const tRec = await texto();
  checar(tRec.includes("limitado a 7,0"), "Recuperação 7 com P1+P2=3,5: bloco limitado a 7,0");
  const his = (await ls("materias")).find((m) => m.id === "ex-his");
  checar(his.semestres[0].rec.nota === 7, "Recuperação salva no armazenamento");
  checar(/1º semestre[\s\S]{0,40}8,5/.test(tRec), "1º semestre de História = 8,5 (7,0 + 1,5 dos trabalhos)");

  // Ponto extra: máximo 0,5 e não passa de 10
  await ir(page, "escola/ex-mat");
  const inMat = await page.$$("input[inputmode=decimal]");
  await inMat[4].click(); await inMat[4].type("0,6"); await new Promise((r) => setTimeout(r, 150));
  checar((await texto()).includes("Ponto extra vale no máximo 0,5"), "Ponto extra 0,6 recusado (máximo 0,5)");
  await preencher(inMat[4], "0,5", true);
  await new Promise((r) => setTimeout(r, 200));
  checar((await texto()).includes("Ponto extra: entrou 0,5"), "Ponto extra 0,5 entra no semestre de 9,0");
  // P1 acima do máximo
  await preencher(inMat[0], "3,6"); await new Promise((r) => setTimeout(r, 150));
  checar((await texto()).includes("P1 vale no máximo 3,5"), "P1 3,6 recusada (máximo 3,5)");
  await preencher(inMat[0], "3,0", true);
  await new Promise((r) => setTimeout(r, 150));

  // Calculadora: exame impossível vira texto, não número
  await ir(page, "escola/ex-his");
  checar((await texto()).includes("Quanto preciso tirar"), "Calculadora aparece na matéria");

  // Cadastrar matéria: fica na lista da Escola (não abre a matéria sozinho), e ela aparece na lista
  await ir(page, "escola");
  await new Promise((r) => setTimeout(r, 900));
  await clicar("button::-p-text(Nova matéria)");
  await digitar('.dialogo input[placeholder^="Ex.: Química"]', "Química");
  await clicar("button::-p-text(Criar matéria)");
  await new Promise((r) => setTimeout(r, 600));
  const hashDepois = await page.evaluate(() => location.hash);
  checar(hashDepois === "#/escola", `Cadastrar matéria não abre a matéria (fica em ${hashDepois})`);
  checar((await ls("materias")).some((m) => m.nome === "Química") && (await texto()).includes("Química"), "Matéria nova aparece na lista da Escola");

  // Dieta: criar refeição repetida em 3 dias e editar só um dia
  await ir(page, "saude/dieta");
  await clicar("button::-p-text(Refeição)");
  await digitar('input[value="Lanche"]', "Ceia");
  await clicar("button::-p-text(Alimento)");
  await digitar('input[aria-label="Alimento"]', "Castanhas");
  await digitar('input[aria-label="Quantidade"]', "30 g");
  // desmarca o dia já marcado e marca seg, qua, sex
  const dias = await page.$$(".dialogo .dias button");
  const marcados = await Promise.all(dias.map((d) => d.evaluate((e) => e.getAttribute("aria-pressed") === "true")));
  for (let i = 0; i < 7; i++) if (marcados[i] !== [0, 2, 4].includes(i)) await dias[i].click();
  await clicar("button::-p-text(Criar refeição)");
  let ceias = (await ls("refeicoes")).filter((r) => r.nome === "Ceia");
  checar(ceias.length === 3 && new Set(ceias.map((r) => r.grupo)).size === 1, `Repetir: refeição criada em 3 dias com o mesmo grupo (${ceias.length})`);
  checar(ceias.every((r) => r.alimentos[0]?.nome === "Castanhas"), "Alimento copiado para os 3 dias");
  // Edita a da segunda, só este dia
  await page.evaluate(() => { location.hash = "/saude/dieta"; });
  await clicar('.dias-seletor button[aria-label="segunda-feira"]');
  await clicar('button[aria-label="Editar Ceia"]');
  await clicar("button::-p-text(Só este dia)");
  await digitar('.dialogo input[type="time"]', "2230");
  await clicar("button::-p-text(Salvar refeição)");
  ceias = (await ls("refeicoes")).filter((r) => r.nome === "Ceia");
  const horarios = ceias.map((r) => r.horario).sort();
  checar(horarios.filter((h) => h === "22:30").length === 1 && ceias.length === 3, `Editar só um dia muda só a segunda (${horarios.join(", ")})`);
  // Edita todos: troca alimento
  await clicar('button[aria-label="Editar Ceia"]');
  await clicar("button::-p-text(Todos os)");
  await digitar('.dialogo input[aria-label="Alimento"]', "Iogurte");
  await clicar("button::-p-text(Salvar refeição)");
  ceias = (await ls("refeicoes")).filter((r) => r.nome === "Ceia");
  checar(ceias.length === 3 && ceias.every((r) => r.alimentos[0].nome === "Iogurte"), "Editar todos os dias troca o alimento nos 3");
  // Água
  const aguaAntes = (await ls("diasDieta"))[0]?.aguaMl ?? 0;
  await clicar("button::-p-text(500 ml)");
  checar(((await ls("diasDieta"))[0]?.aguaMl ?? 0) === aguaAntes + 500, "Água: +500 ml soma");

  // Horários: validação e Repetir seg a sex
  await ir(page, "mais/horarios");
  await clicar("button::-p-text(Novo horário)");
  await digitar('.dialogo input[placeholder^="Ex.: Aula"]', "Cursinho");
  const tempos = await page.$$('.dialogo input[type="time"]');
  await tempos[0].type("1900"); await tempos[1].type("1800");
  await clicar("button::-p-text(Seg a sex)");
  await clicar("button::-p-text(Criar horário)");
  checar((await texto()).includes("A hora de fim precisa ser depois do início."), "Fim antes do início é recusado");
  await tempos[1].type("2045");
  await clicar("button::-p-text(Criar horário)");
  const cursinho = (await ls("blocos")).filter((b) => b.nome === "Cursinho");
  checar(cursinho.length === 5 && cursinho.every((b) => b.inicio === "19:00" && b.fim === "20:45"), `Repetir seg a sex criou 5 blocos (${cursinho.length})`);
  checar((await texto()).includes("se sobrepõem") || (await texto()).includes("sobreposições"), "Aviso de sobreposição aparece");

  // Tipo "Futevôlei": aparece na lista de tipos, salva com o tipo certo e entra na legenda
  await new Promise((r) => setTimeout(r, 400));
  await clicar("button::-p-text(Novo horário)");
  await digitar('.dialogo input[placeholder^="Ex.: Aula"]', "Futevôlei");
  const tipos = await page.$$eval(".dialogo select option", (os) => os.map((o) => o.textContent));
  checar(tipos.includes("Futevôlei"), `Lista de tipos tem Futevôlei (${tipos.join(", ")})`);
  await page.select(".dialogo select", "futevolei");
  await clicar("button::-p-text(Criar horário)");
  const fute = (await ls("blocos")).filter((b) => b.nome === "Futevôlei");
  checar(fute.length === 1 && fute[0].tipo === "futevolei", `Horário de Futevôlei salvo com o tipo futevolei (${fute.map((b) => b.tipo).join(",")})`);
  checar((await page.$eval(".legenda", (e) => e.textContent)).includes("Futevôlei"), "Legenda mostra Futevôlei");

  // Tarefa com subtarefas: tocar abre a lista ali mesmo e as caixinhas salvam na hora (sem abrir a edição)
  await ir(page, "tarefas");
  await new Promise((r) => setTimeout(r, 900));
  await clicar("button.item-corpo::-p-text(Lista de exercícios de funções)");
  await new Promise((r) => setTimeout(r, 500));
  checar(!!(await page.$(".sub-wrap.aberta")) && !(await page.$(".dialogo")), "Tocar na tarefa com subtarefas abre a lista (sem abrir a edição)");
  await clicar("label.sub-item::-p-text(Questões 11 a 20)");
  const tarefaSub = (await ls("tarefas")).find((t) => t.titulo === "Lista de exercícios de funções");
  checar(tarefaSub?.subtarefas.find((s) => s.texto === "Questões 11 a 20")?.feita === true, "Marcar a subtarefa salva na hora");
  checar((await page.$eval(".sub-wrap.aberta .sub-progresso", (e) => e.textContent)).includes("2 de 2"), "Progresso da tarefa mostra 2 de 2");
  await clicar(".sub-wrap.aberta button::-p-text(Editar tarefa)");
  checar(!!(await page.$(".dialogo")), "Botão de dentro abre a edição da tarefa");
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 300));

  // Tarefas: criar, concluir, excluir e desfazer
  await ir(page, "tarefas");
  await clicar("button::-p-text(Nova tarefa)");
  await digitar('.dialogo input[placeholder^="Ex.: Lista"]', "Tarefa do teste");
  // Subtarefas: o quadrado de marcar não pode esticar (bug real: .campo input { width: 100% } pegava o checkbox)
  await digitar('.dialogo input[aria-label="Nova subtarefa"]', "Terminar resumo");
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 300));
  const sub = await page.evaluate(() => {
    const d = document.querySelector(".dialogo");
    return { itens: d.querySelectorAll("ul.lista li").length, quadrado: Math.round(d.querySelector("ul.lista .check")?.getBoundingClientRect().width ?? 0), sobra: d.scrollWidth - d.clientWidth };
  });
  checar(sub.itens === 1 && sub.quadrado > 0 && sub.quadrado <= 30 && sub.sobra === 0, `Subtarefa: 1 item, quadrado de ${sub.quadrado}px, sem scroll lateral no diálogo (${sub.sobra}px)`);
  await clicar("button::-p-text(Criar tarefa)");
  checar((await texto()).includes("Tarefa do teste"), "Tarefa criada aparece em Hoje");
  await clicar('input[aria-label="Concluir Tarefa do teste"]');
  checar((await ls("tarefas")).find((t) => t.titulo === "Tarefa do teste")?.concluida === true, "Checkbox conclui a tarefa");
  await clicar('button[aria-pressed="false"]::-p-text(Concluídas)');
  await clicar("button::-p-text(Tarefa do teste)");
  await clicar(".sub-wrap.aberta button::-p-text(Editar tarefa)"); // tem subtarefa: tocar abre a lista; a edição fica no botão de dentro
  await clicar(".dialogo button::-p-text(Excluir)");
  await clicar(".dialogo button.perigo");
  checar(!(await ls("tarefas")).some((t) => t.titulo === "Tarefa do teste"), "Excluir pede confirmação e exclui");
  await clicar(".aviso button::-p-text(Desfazer)");
  checar((await ls("tarefas")).some((t) => t.titulo === "Tarefa do teste"), "Desfazer devolve a tarefa");

  // Treino agora: marcar série abre o cronômetro (só se hoje tem ficha)
  await ir(page, "saude/treino/agora");
  const temSerie = await page.$(".contador-toque");
  if (temSerie) {
    await temSerie.click();
    await clicar("button::-p-text(Concluir série)");
    checar(!!(await page.$(".contador.descansando")), "Concluir série inicia o descanso (modo foco)");
    await page.screenshot({ path: path.join(SHOTS, "390-treinando-cronometro.png") });
  } else ok("Hoje é descanso na divisão de exemplo — modo foco testado no gate foco");

  // Tema escuro e diálogo aberto
  await ir(page, "mais/configuracoes");
  await clicar("button::-p-text(Escuro)");
  checar((await page.evaluate(() => document.documentElement.dataset.tema)) === "escuro", "Tema escuro aplica");
  for (const r of ["hoje", "escola/ex-por", "saude/dieta", "mais/horarios"]) {
    await ir(page, r);
    await page.screenshot({ path: path.join(SHOTS, `390-escuro-${r.replace(/\//g, "_")}.png`), fullPage: true });
  }
  await ir(page, "tarefas");
  await clicar("button::-p-text(Nova tarefa)");
  await page.screenshot({ path: path.join(SHOTS, "390-escuro-dialogo.png") });
  await page.keyboard.press("Escape");

  checar(erros.length === 0, `fluxos sem erro de console${erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""}`);
  await ctx.close();
  await browser.close();
  console.log(`\nScreenshots em ${SHOTS}`);
  console.log(falhas.length ? `NAVEGADOR FALHOU (${falhas.length})` : "NAVEGADOR OK");
}

// Nada pode ficar escondido ou parado no meio da animação: com e sem "reduzir movimento".
async function movimento() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const ROTAS = ["hoje", "tarefas", "escola", "escola/ex-fis", "saude/dieta", "saude/treino", "mais/horarios", "mais/configuracoes"];
  for (const reduz of [true, false]) {
    console.log(reduz ? "\nCom reduzir movimento" : "\nCom movimento");
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reduz ? "reduce" : "no-preference" }]);
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
    await page.goto(BASE + "#/hoje", { waitUntil: "networkidle0" });
    for (const r of ROTAS) {
      await page.evaluate((r) => (location.hash = "/" + r), r);
      await new Promise((x) => setTimeout(x, reduz ? 150 : 2200));
      const presos = await page.evaluate(() => {
        const sel = ".topo, .hoje-cab, .lousa, .numeros > *, .painel > *, .secao, .alerta, .abas, .voltar, .resumo-materia, .regua-seg > i, .mini-regua > i";
        return [...document.querySelectorAll(sel)].filter((el) => {
          const cs = getComputedStyle(el);
          return Number(cs.opacity) < 0.99 || cs.visibility === "hidden" || (cs.transform !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(cs.transform));
        }).map((el) => el.className).slice(0, 4);
      });
      checar(presos.length === 0, `${r}: tudo visível e no lugar${presos.length ? " — " + presos.join(" | ") : ""}`);
    }
    checar(erros.length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
    await page.close();
  }
  await browser.close();
  console.log(falhas.length ? `MOVIMENTO FALHOU (${falhas.length})` : "MOVIMENTO OK");
}

// Fluxo completo dos flashcards no celular, com screenshots das telas.
async function flashcards() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  for (const tema of ["light", "dark"]) {
    console.log(`\nFlashcards (${tema})`);
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: tema }]);
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
    const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms));
    const clicar = async (sel) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => e.scrollIntoView({ block: "center" })); await el.click(); await espera(); };
    const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);
    const foto = (n) => page.screenshot({ path: path.join(SHOTS, `cards-${tema}-${n}.png`) });
    await page.goto(BASE + "#/escola/flashcards", { waitUntil: "networkidle0" });
    await espera(900);
    await foto("vazio");
    await clicar("button::-p-text(Criar primeira pasta)");
    await page.select(".dialogo select", "História");
    await page.type('.dialogo input[placeholder^="Ex.: Revolução"]', "Revolução Francesa");
    await clicar("button::-p-text(Criar pasta)");
    await espera(900); // a tela nova entra animada; antes disso os campos ainda estão invisíveis
    const pastas = await ls("baralhos");
    checar(pastas.length === 1 && pastas[0].materia === "História" && pastas[0].nome === "Revolução Francesa", "Pasta criada em História");
    checar((await page.evaluate(() => location.hash)).includes(pastas[0]?.id), "Abre a pasta criada");
    await page.type('textarea[placeholder^="Ex.: O que foi"]', "O que foi a Revolução Francesa?");
    await page.type('textarea[placeholder^="Ex.: Revolução na França"]', "Revolução na França (1789–1799) que derrubou a monarquia absolutista e espalhou os ideais de liberdade, igualdade e fraternidade.");
    await clicar("button::-p-text(Adicionar cartão)");
    await page.type('textarea[placeholder^="Ex.: O que foi"]', "Qual foi o estopim?");
    await page.type('textarea[placeholder^="Ex.: Revolução na França"]', "A Queda da Bastilha, em 14 de julho de 1789.");
    await clicar("button::-p-text(Adicionar cartão)");
    let cs = await ls("cartoes");
    checar(cs.length === 2 && cs.every((c) => c.caixa === 1), `Dois cartões criados na caixa 1 (${cs.length}: ${cs.map((c) => c.caixa).join(",")})`);
    await espera(600);
    await foto("pasta");
    await clicar("button::-p-text(Estudar)");
    await espera(700);
    const frente = await page.$eval(".cartao-3d .frente .face-texto", (e) => e.textContent);
    checar(cs.some((c) => c.frente === frente), "Mostra a pergunta na frente");
    await foto("frente");
    await clicar(".cartao-3d");
    await espera(700);
    checar(!!(await page.$(".cartao-3d.virado")), "Toque vira o cartão");
    await foto("verso");
    await clicar("button::-p-text(Acertei)");
    await espera(900);
    cs = await ls("cartoes");
    const respondido = cs.find((c) => c.frente === frente);
    // data LOCAL (o app usa a data do aparelho); toISOString() é UTC e à noite no Brasil já é o dia seguinte
    const hojeLocal = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
    checar(respondido?.caixa === 2 && respondido.proxima > hojeLocal && respondido.acertos === 1, `Acertei: caixa 2 e revisão adiada (${respondido?.caixa}, ${respondido?.proxima})`);
    await clicar(".cartao-3d");
    await espera(700);
    await clicar("button::-p-text(Errei)");
    await espera(900);
    const errado = (await ls("cartoes")).find((c) => c.frente !== frente);
    checar(errado?.caixa === 1 && errado.erros === 1, "Errei: fica na caixa 1 e volta para a fila");
    await clicar(".cartao-3d"); await espera(700);
    await clicar("button::-p-text(Acertei)"); await espera(900);
    checar((await page.evaluate(() => document.body.textContent)).includes("Sessão concluída"), "Fila termina com o resumo da sessão");
    await foto("fim");
    await page.evaluate(() => (location.hash = "/escola/flashcards")); await espera(1200);
    await foto("pastas");
    await page.setViewport({ width: 1440, height: 900 });
    await espera(400);
    await foto("pastas-1440");
    const idPasta = (await ls("baralhos"))[0].id;
    await page.evaluate((id) => (location.hash = "/escola/flashcards/" + id), idPasta); await espera(1200);
    await foto("pasta-1440");
    // Dificuldade e ordem aleatória
    checar((await ls("cartoes")).every((c) => (c.dificuldade ?? "medio") === "medio"), "Cartões novos nascem como Médio");
    await clicar('[aria-label="Dificuldade do cartão"] button::-p-text(Difícil)');
    await page.type('textarea[placeholder^="Ex.: O que foi"]', "Quem era o rei deposto?");
    await page.type('textarea[placeholder^="Ex.: Revolução na França"]', "- Luís XVI");
    await page.keyboard.press("Enter"); await espera(150); // o cursor é recolocado no próximo quadro
    await page.keyboard.type("Rei da França");
    checar((await page.$eval('textarea[placeholder^="Ex.: Revolução na França"]', (e) => e.value)) === "- Luís XVI\n- Rei da França", `Enter numa lista continua com '- ' (${JSON.stringify(await page.$eval('textarea[placeholder^="Ex.: Revolução na França"]', (e) => e.value))})`);
    // imagem grande (3000x2000) tem de ser reduzida e guardada como JPEG leve
    const png = await page.evaluate(() => { const t = document.createElement("canvas"); t.width = 3000; t.height = 2000; const x = t.getContext("2d"); x.fillStyle = "#c33"; x.fillRect(0, 0, 3000, 2000); x.fillStyle = "#39c"; x.beginPath(); x.arc(1500, 1000, 700, 0, 7); x.fill(); return t.toDataURL("image/png").split(",")[1]; });
    const arqImg = path.join(os.tmpdir(), "rotina-celula.png");
    fs.writeFileSync(arqImg, Buffer.from(png, "base64"));
    await (await page.$('input[type="file"][aria-label="Imagem da pergunta"]')).uploadFile(arqImg);
    await page.waitForSelector(".campo-imagem-previa img", { timeout: 8000 }); await espera(300);
    await clicar("button::-p-text(Adicionar cartão)");
    const dificil = (await ls("cartoes")).find((c) => c.frente === "Quem era o rei deposto?");
    checar(dificil?.dificuldade === "dificil", "Cartão criado como Difícil guarda a dificuldade");
    const dimImg = await page.evaluate((u) => new Promise((r) => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.src = u; }), dificil?.imagem ?? "");
    checar(dificil?.imagem?.startsWith("data:image/jpeg") && Math.max(...dimImg) === 900, `Imagem reduzida para 900 px (${dimImg.join("x")})`);
    checar((dificil?.imagem?.length ?? 1e9) < 150000, `Imagem leve (${Math.round((dificil?.imagem?.length ?? 0) / 1024)} KB)`);
    checar((await page.$$(".ficha-img")).length === 1, "Lista mostra a miniatura da imagem");
    checar(!(await page.$(".campo-imagem-previa")), "Formulário limpa a prévia depois de adicionar");
    checar((await page.$$(".selo-dif.dif-dificil")).length === 1, "Lista mostra o selo Difícil");
    await clicar('button[role="switch"]');
    await clicar('[aria-label="Filtrar por dificuldade"] button::-p-text(Difícil)');
    checar(await page.$eval('button[role="switch"]', (e) => e.getAttribute("aria-checked") === "true"), "Chave Ordem aleatória fica ligada");
    checar((await page.$eval('[aria-label="Filtrar por dificuldade"] [aria-pressed="true"] .seg-n', (e) => e.textContent)) === "1", "Faixa mostra 1 cartão difícil");
    const rotuloEstudar = await page.$$eval("button.primario", (bs) => bs.map((b) => b.textContent).find((t) => t.startsWith("Estudar")));
    checar(/Estudar 1 difíceis de hoje/.test(rotuloEstudar ?? ""), `Botão Estudar segue o filtro (${rotuloEstudar})`);
    await clicar("button::-p-text(Estudar)"); await espera(900);
    checar((await page.$eval(".cartao-3d .frente .face-texto", (e) => e.textContent)) === "Quem era o rei deposto?", "Filtro Difícil estuda só o cartão difícil");
    checar((await page.evaluate(() => document.body.textContent)).includes("1 / 1"), "Sessão filtrada tem 1 cartão");
    checar(await page.$eval(".frente .face-img", (e) => e.complete && e.naturalWidth > 0), "Estudo mostra a imagem na frente da pergunta");
    await clicar(".cartao-3d"); await espera(700);
    checar((await page.$$(".verso .item-lista")).length === 2, "'- ' vira item com bolinha no verso");
    checar(await page.$eval(".verso .item-lista", (e) => getComputedStyle(e, "::before").borderRadius === "50%" && getComputedStyle(e, "::before").width !== "auto"), "Bolinha desenhada");
    await clicar(".cartao-3d"); await espera(700);
    await clicar('[aria-label="Dificuldade deste cartão"] button::-p-text(Fácil)');
    checar((await ls("cartoes")).find((c) => c.frente === "Quem era o rei deposto?")?.dificuldade === "facil", "Muda a dificuldade durante o estudo");
    // Resposta em comparação
    await page.evaluate((id) => (location.hash = "/escola/flashcards/" + id), idPasta); await espera(1200);
    const antes = (await ls("cartoes")).length;
    await page.type('textarea[placeholder^="Ex.: O que foi"]', "Mitose ou meiose?");
    await clicar(".campo-comp button[role=\"switch\"]");
    const campos = async (sel) => page.$$(`.comp-editor ${sel} input`);
    await (await page.$('.comp-editor input[aria-label="Nome do item 1"]')).type("Mitose");
    await (await page.$('.comp-editor input[aria-label="Nome do item 2"]')).type("Meiose");
    let l1 = await campos(".comp-ed-linha:nth-child(2)");
    await l1[0].type("Divisões"); await l1[1].type("1"); await l1[2].type("2");
    await l1[2].press("Enter"); await espera(150);
    checar((await ls("cartoes")).length === antes, "Enter num campo da comparação não envia o cartão");
    await clicar(".comp-ed-acoes button::-p-text(Adicionar linha)");
    const l2 = await campos(".comp-ed-linha:nth-child(3)");
    await l2[0].type("Células-filhas"); await l2[1].type("2"); await l2[2].type("4");
    await clicar("button::-p-text(Adicionar cartão)");
    const comp = (await ls("cartoes")).find((c) => c.frente === "Mitose ou meiose?");
    checar(comp?.comparacao?.itens.join("|") === "Mitose|Meiose" && comp.comparacao.linhas.length === 2 && comp.comparacao.linhas[1].valores.join("|") === "2|4", "Cartão guarda a comparação (itens e linhas)");
    checar(!(await page.$(".comp-editor")), "Formulário fecha o editor depois de adicionar");
    await clicar('[aria-label="Filtrar por dificuldade"] button::-p-text(Médio)');
    await clicar("button::-p-text(Estudar)"); await espera(900);
    await clicar(".cartao-3d"); await espera(800);
    checar((await page.$$('.verso [role="cell"]')).length === 4 && (await page.$$('.verso [role="columnheader"]')).length === 3, "Verso mostra a comparação em tabela");
    checar((await page.$eval(".verso .comp", (e) => e.textContent)).includes("Células-filhas"), "Comparação traz os aspectos");
    await page.setViewport({ width: 390, height: 844 }); await espera(300);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    checar(sobra === 0, "Sem rolagem lateral");
    checar(erros.length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  await browser.close();
  console.log(falhas.length ? `FLASHCARDS FALHOU (${falhas.length})` : "FLASHCARDS OK");
}

// Refeição: o app calcula kcal e proteína pela TACO (alimento + quantidade), aceita escolha na lista e respeita valor digitado.
async function nutricao() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 390, height: 844 });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms));
  const clicar = async (sel) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => e.scrollIntoView({ block: "center" })); await el.click(); await espera(); };
  const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);
  const linha = async (i) => (await page.$$(".dialogo .alimento-form"))[i];
  const campo = async (i, rotulo) => (await linha(i)).$(`input[aria-label="${rotulo}"]`);
  const valor = async (i, rotulo) => (await campo(i, rotulo)).evaluate((e) => e.value);
  const info = async (i) => (await linha(i)).$eval(".alimento-info", (e) => e.textContent).catch(() => "");
  const escrever = async (i, rotulo, t) => { const el = await campo(i, rotulo); await el.evaluate((e) => { e.scrollIntoView({ block: "center" }); e.select(); }); await el.type(t); await espera(200); };

  console.log("\nNutrição (390 px)");
  await page.goto(BASE + "#/saude/dieta", { waitUntil: "networkidle0" });
  await espera(900);
  await clicar("button::-p-text(Refeição)");
  await espera(500);
  await clicar(".dialogo button::-p-text(Alimento)");
  await escrever(0, "Alimento", "ovo");
  await page.waitForSelector('.sugestoes [role="option"]', { timeout: 5000 });
  const opcoes = await page.$$eval('.sugestoes [role="option"]', (os) => os.map((o) => o.textContent));
  checar(opcoes[0]?.startsWith("Ovo, de galinha, inteiro, cozido"), `Sugere o ovo cozido primeiro (${opcoes[0]})`);
  await page.screenshot({ path: path.join(SHOTS, "nutricao-sugestoes.png") });
  await escrever(0, "Quantidade", "2 ovos");
  checar((await valor(0, "Calorias")) === "146" && (await valor(0, "Proteína em gramas")) === "13,3", `2 ovos = 146 kcal e 13,3 g (${await valor(0, "Calorias")}, ${await valor(0, "Proteína em gramas")})`);
  checar((await info(0)).includes("2 unidades ≈ 100 g"), `Mostra como calculou (${await info(0)})`);

  await clicar(".dialogo button::-p-text(Alimento)");
  await escrever(1, "Alimento", "arroz");
  await escrever(1, "Quantidade", "4 colheres de sopa");
  checar((await valor(1, "Calorias")) === "128" && (await valor(1, "Proteína em gramas")) === "2,5", `4 colheres de sopa de arroz = 128 kcal (${await valor(1, "Calorias")})`);

  await clicar(".dialogo button::-p-text(Alimento)");
  await escrever(2, "Alimento", "pao");
  await clicar(".sugestoes li::-p-text(Pão, trigo, forma, integral)");
  await escrever(2, "Quantidade", "2 fatias");
  checar((await valor(2, "Calorias")) === "127" && (await info(2)).includes("integral"), `Escolher na lista usa o pão integral (${await valor(2, "Calorias")} kcal, ${await info(2)})`);

  await escrever(1, "Calorias", "999");
  checar((await info(1)).includes("Calorias digitadas por você"), "Valor digitado à mão fica e é avisado");
  await escrever(1, "Quantidade", "8 colheres de sopa");
  checar((await valor(1, "Calorias")) === "999", "Mudar a quantidade não apaga o valor digitado");
  checar((await valor(1, "Proteína em gramas")) === "5", `…mas a proteína (não digitada) segue a quantidade (${await valor(1, "Proteína em gramas")})`);

  await clicar(".dialogo button::-p-text(Alimento)");
  await escrever(3, "Alimento", "xyzw");
  await escrever(3, "Quantidade", "100 g");
  checar((await info(3)).includes("Não achei"), "Alimento fora da tabela é avisado");
  const sobra = await page.evaluate(() => { const d = document.querySelector(".dialogo"); return [document.documentElement.scrollWidth - document.documentElement.clientWidth, d.scrollWidth - d.clientWidth]; });
  checar(sobra[0] === 0 && sobra[1] === 0, `Sem rolagem lateral no formulário (${sobra})`);
  await page.screenshot({ path: path.join(SHOTS, "nutricao-form.png") });
  await clicar("button::-p-text(Criar refeição)");
  await espera(600);
  const ref = (await ls("refeicoes")).filter((r) => r.alimentos.some((a) => a.nome === "ovo"));
  const al = ref[0]?.alimentos ?? [];
  checar(ref.length >= 1 && al[0].kcal === 146 && al[0].autoKcal === true && al[1].kcal === 999 && !al[1].autoKcal && al[1].autoProt === true && al[2].ref === 52 && al[3].kcal === null, `Salva valores, origem e alimento escolhido (${JSON.stringify(al.map((a) => [a.kcal, a.autoKcal, a.autoProt, a.ref]))})`);

  // Reabrir e mudar a quantidade recalcula (o valor digitado continua)
  await clicar(`button[aria-label="Editar ${ref[0]?.nome}"]`);
  if (await page.$("button::-p-text(Todos os)")) await clicar("button::-p-text(Todos os)");
  await escrever(0, "Quantidade", "3 ovos");
  checar((await valor(0, "Calorias")) === "219" && (await valor(1, "Calorias")) === "999", `Ao editar, 3 ovos recalcula para 219 kcal (${await valor(0, "Calorias")})`);
  checar(erros.length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
  await browser.close();
  console.log(falhas.length ? `NUTRICAO FALHOU (${falhas.length})` : "NUTRICAO OK");
}

// Produtos de marca (Open Food Facts via /api/alimentos): precisa de internet. Escolher um produto usa os valores do rótulo,
// que ficam salvos na refeição (reabrir funciona sem internet).
async function marcas() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 390, height: 844 });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms));
  const clicar = async (sel) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => e.scrollIntoView({ block: "center" })); await el.click(); await espera(); };
  const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);
  const campo = async (rotulo) => page.$(`.dialogo .alimento-form input[aria-label="${rotulo}"]`);
  const escrever = async (rotulo, t) => { const el = await campo(rotulo); await el.evaluate((e) => { e.scrollIntoView({ block: "center" }); e.select(); }); await el.type(t); await espera(200); };
  const valor = async (rotulo) => (await campo(rotulo)).evaluate((e) => e.value);
  const info = () => page.$eval(".dialogo .alimento-info", (e) => e.textContent).catch(() => "");

  console.log("\nProdutos de marca (390 px)");
  await page.goto(BASE + "#/saude/dieta", { waitUntil: "networkidle0" });
  await espera(900);
  await clicar("button::-p-text(Refeição)");
  await espera(500);
  await clicar(".dialogo button::-p-text(Alimento)");
  await escrever("Alimento", "pasta de amendoim");
  const locais = await page.$$eval('.sugestoes [role="option"]', (os) => os.map((o) => o.textContent));
  checar(locais[0]?.startsWith("Pasta de amendoim, tradicional"), `Tabela local sugere a pasta tradicional primeiro (${locais[0]})`);
  await page.waitForSelector("::-p-text(Produtos de marca · Open Food Facts)", { timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('.sugestoes [role="option"]').length > 3, { timeout: 15000 });
  const opcoes = await page.$$eval('.sugestoes [role="option"]', (os) => os.map((o) => o.textContent));
  const titulos = await page.$$eval(".sugestoes-titulo", (ts) => ts.map((t) => t.textContent));
  checar(titulos.length === 2 && opcoes.length > 3, `Lista mostra tabela + produtos de marca (${opcoes.length} opções)`);
  await page.screenshot({ path: path.join(SHOTS, "marcas-lista.png") });
  // primeiro produto de marca = primeira opção depois do segundo título
  const idx = await page.evaluate(() => { const lis = [...document.querySelectorAll(".sugestoes li")]; const t = lis.findIndex((l) => l.textContent.startsWith("Produtos de marca")); return [...document.querySelectorAll('.sugestoes [role="option"]')].indexOf(lis[t + 1]); });
  const escolhido = opcoes[idx];
  const kcal100 = Number(escolhido.match(/(\d+) kcal/)[1]);
  await page.$$eval('.sugestoes [role="option"]', (os, i) => os[i].scrollIntoView({ block: "center" }), idx);
  await (await page.$$('.sugestoes [role="option"]'))[idx].click();
  await espera(300);
  await escrever("Quantidade", "1 colher de sopa");
  const esperado = String(Math.round(kcal100 * 0.16));
  checar((await valor("Calorias")) === esperado && (await info()).includes("Open Food Facts"), `Produto escolhido usa o rótulo: 16 g = ${esperado} kcal (${await valor("Calorias")}; ${await info()})`);
  await clicar("button::-p-text(Criar refeição)");
  await espera(600);
  const ref = (await ls("refeicoes")).find((r) => r.alimentos.some((a) => a.nome === "pasta de amendoim"));
  const al = ref?.alimentos.find((a) => a.nome === "pasta de amendoim");
  checar(al?.base?.fonte === "Open Food Facts" && al.base.kcal100 === kcal100 && String(al.kcal) === esperado, `Salva o produto com os valores do rótulo (${JSON.stringify(al?.base)})`);
  // Reabrir sem internet: recalcula com o produto salvo
  await page.setOfflineMode(true);
  await clicar(`button[aria-label="Editar ${ref.nome}"]`);
  if (await page.$("button::-p-text(Todos os)")) await clicar("button::-p-text(Todos os)");
  await escrever("Quantidade", "2 colheres de sopa");
  checar((await valor("Calorias")) === String(Math.round(kcal100 * 0.32)) && (await info()).includes("Open Food Facts"), `Sem internet, reabrir recalcula com o produto salvo (${await valor("Calorias")})`);
  await page.setOfflineMode(false);
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  checar(sobra === 0, "Sem rolagem lateral");
  checar(erros.filter((e) => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(e)).length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
  await browser.close();
  console.log(falhas.length ? `MARCAS FALHOU (${falhas.length})` : "MARCAS OK");
}

// Diário da dieta: check por alimento, refeição "em parte", resumo do dia e "Comi fora do plano" (com cálculo pela tabela).
async function diario() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 390, height: 844 });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  const espera = (ms = 300) => new Promise((r) => setTimeout(r, ms));
  const clicar = async (sel) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => e.scrollIntoView({ block: "center" })); await el.click(); await espera(); };
  const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);
  const hojeIso = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const reg = async () => (await ls("diasDieta")).find((d) => d.id === hojeIso) ?? { feitas: [], comidos: [], extras: [] };
  // os números do resumo contam animados: espera parar de mudar antes de ler
  const resumo = async () => { let a = "", b = "x"; for (let i = 0; i < 20 && a !== b; i++) { a = b; await espera(150); b = await page.$eval(".resumo-dieta", (e) => e.textContent).catch(() => ""); } return b; };
  const marcarAlimento = async (i) => { const cs = await page.$$(".alimentos-check input"); await cs[i].evaluate((e) => e.scrollIntoView({ block: "center" })); await cs[i].click(); await espera(); };
  const refCheck = () => page.$eval('input[aria-label="Marcar Café teste inteira como comida"]', (e) => ({ checked: e.checked, parte: e.indeterminate }));

  console.log("\nDiário da dieta (390 px)");
  await page.goto(BASE + "#/saude/dieta", { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const n = Date.now();
    const alimentos = [
      { id: "a1", nome: "Ovo", quantidade: "2 ovos", kcal: 146, proteina: 13.3 },
      { id: "a2", nome: "Pão francês", quantidade: "1", kcal: 150, proteina: 4 },
      { id: "a3", nome: "Café", quantidade: "1 xícara", kcal: 5, proteina: 0.4 },
    ];
    localStorage.setItem("rotina:refeicoes", JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((d) => ({ id: "r" + d, _m: n, grupo: "g", nome: "Café teste", tipo: "cafe", dia: d, horario: "07:00", alimentos }))));
    localStorage.setItem("rotina:diasDieta", "[]");
  });
  await page.reload({ waitUntil: "networkidle0" });
  await espera(1200);
  checar((await page.$$(".alimentos-check input")).length === 3, "Cada alimento da refeição de hoje tem seu check");
  await marcarAlimento(0);
  let r = await reg();
  let c = await refCheck();
  checar(r.comidos?.length === 1 && !r.feitas.length && c.parte && !c.checked, `1 alimento comido: refeição fica "em parte" (${JSON.stringify(r.comidos)})`);
  checar((await resumo()).includes("1 de 3 alimentos") && (await resumo()).includes("146"), `Resumo conta 1 de 3 e 146 kcal (${await resumo()})`);
  await marcarAlimento(1); await marcarAlimento(2);
  r = await reg(); c = await refCheck();
  checar(r.feitas.length === 1 && !r.comidos?.length && c.checked && !c.parte, "Todos os alimentos comidos: refeição marcada inteira");
  checar((await resumo()).includes("100") && (await resumo()).includes("3 de 3"), "Resumo mostra 100% do plano");
  await marcarAlimento(1);
  c = await refCheck();
  checar(c.parte && (await reg()).comidos?.length === 2, "Desmarcar um alimento volta para \"em parte\"");
  await page.screenshot({ path: path.join(SHOTS, "diario-plano.png") });

  // Fora do plano
  await clicar("button::-p-text(Comi fora do plano)");
  await espera(500);
  const nome = await page.$('.dialogo input[aria-label="Alimento"]');
  await nome.type("chocolate"); await espera(200);
  await (await page.$('.dialogo input[aria-label="Quantidade"]')).type("30 g"); await espera(200);
  const kcal = await page.$eval('.dialogo input[aria-label="Calorias"]', (e) => e.value);
  checar(kcal === "162", `Chocolate 30 g calculado pela tabela (${kcal} kcal)`);
  await clicar("button::-p-text(Anotar no dia)");
  await espera(600);
  r = await reg();
  checar(r.extras?.length === 1 && r.extras[0].kcal === 162 && r.extras[0].autoKcal, "Fora do plano fica salvo no dia com kcal calculada");
  checar((await resumo()).includes("fora 162"), `Resumo soma o que foi comido fora (${await resumo()})`);
  await page.screenshot({ path: path.join(SHOTS, "diario-fora.png") });
  await clicar('button[aria-label="Tirar chocolate do dia"]');
  await clicar(".confirmar button::-p-text(Excluir), [role=alertdialog] button::-p-text(Excluir), .dialogo button::-p-text(Excluir)");
  await espera(400);
  checar(!(await reg()).extras?.length, "Tirar do dia pede confirmação e remove");
  await clicar("button::-p-text(Desfazer)");
  await espera(400);
  checar((await reg()).extras?.length === 1, "Desfazer devolve o alimento");

  // Dia que já passou nesta semana: dá para marcar, e fica na data daquele dia
  const diaHoje = await page.evaluate(() => (new Date().getDay() + 6) % 7);
  if (diaHoje > 0) {
    const ontemIso = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
    const nomes = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
    await clicar(`.dias-seletor button[aria-label="${nomes[diaHoje - 1]}"]`);
    checar((await page.$$(".alimentos-check input")).length === 3, "Ontem também tem checks");
    await marcarAlimento(0);
    const ontem = (await ls("diasDieta")).find((d) => d.id === ontemIso);
    checar(ontem?.comidos?.length === 1, `Marcar ontem grava na data de ontem (${ontemIso})`);
    await clicar(`.dias-seletor button[aria-label="${nomes[diaHoje]}"]`);
  } else console.log("  (hoje é segunda: sem dia anterior nesta semana para testar)");
  if (diaHoje < 6) {
    const nomes = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
    await clicar(`.dias-seletor button[aria-label="${nomes[diaHoje + 1]}"]`);
    checar((await page.$$(".alimentos-check input")).length === 0 && (await page.evaluate(() => document.body.textContent)).includes("quando o dia chegar"), "Dia que ainda não chegou não tem checks e explica");
    await clicar(`.dias-seletor button[aria-label="${nomes[diaHoje]}"]`);
  }

  // Hoje: o bilhete mostra a refeição em parte
  await page.evaluate(() => (location.hash = "/hoje"));
  await espera(1200);
  const bilhete = await page.$eval('input[aria-label="Marcar Café teste como feita"]', (e) => e.indeterminate).catch(() => null);
  checar(bilhete === true, "No Hoje, a refeição em parte aparece como em parte");

  // Hoje sem refeição no plano: botão usa o plano de outro dia também hoje
  await page.evaluate((dh) => {
    const n = Date.now();
    const outro = (dh + 6) % 7;
    localStorage.setItem("rotina:refeicoes", JSON.stringify([{ id: "x1", _m: n, grupo: "gx", nome: "Almoço teste", tipo: "almoco", dia: outro, horario: "12:00", alimentos: [{ id: "b1", nome: "Arroz", quantidade: "150 g", kcal: 192, proteina: 3.8 }] }]));
  }, diaHoje);
  await page.evaluate(() => (location.hash = "/saude/dieta"));
  await page.reload({ waitUntil: "networkidle0" });
  await espera(1200);
  const txt = await page.evaluate(() => document.body.textContent);
  checar(txt.includes("não tem refeição no plano"), "Hoje sem plano: explica por que não há o que marcar");
  await clicar("button::-p-text(Usar o plano de)");
  await espera(600);
  const refsHoje = (await ls("refeicoes")).filter((x) => x.dia === diaHoje);
  checar(refsHoje.length === 1 && refsHoje[0].grupo === "gx" && (await page.$$(".alimentos-check input")).length === 1, "Usar o plano de outro dia cria a refeição de hoje (mesmo grupo) e os checks aparecem");
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  checar(sobra === 0, "Sem rolagem lateral");
  checar(erros.length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
  await browser.close();
  console.log(falhas.length ? `DIARIO FALHOU (${falhas.length})` : "DIARIO OK");
}

// Modo foco do treino: contador de repetições (tracinhos de giz), peso com atalhos, descanso no mesmo painel, resumo e salvar.
async function foco() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 390, height: 844 });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  const espera = (ms = 300) => new Promise((r) => setTimeout(r, ms));
  const clicar = async (sel) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => e.scrollIntoView({ block: "center" })); await el.click(); await espera(); };
  const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);
  const texto = () => page.evaluate(() => document.body.textContent);
  const contador = () => page.$eval(".contador-numero", (e) => e.textContent).catch(() => null);
  const peso = () => page.$eval('input[aria-label="Peso em kg"]', (e) => e.value);

  console.log("\nModo foco do treino (390 px)");
  await page.goto(BASE + "#/saude/treino", { waitUntil: "networkidle0" });
  const diaHoje = await page.evaluate(() => (new Date().getDay() + 6) % 7);
  await page.evaluate((dh) => {
    const n = Date.now();
    localStorage.setItem("rotina:fichas", JSON.stringify([
      { id: "fA", _m: n, nome: "Push", dias: [dh], exercicios: [
        { id: "x1", nome: "Supino inclinado halter", series: 2, reps: 8, repsMax: 10, carga: 20 },
        { id: "x2", nome: "Tríceps corda", series: 1, reps: 12, carga: 15 },
      ] },
      { id: "fB", _m: n, nome: "Pull", dias: [(dh + 1) % 7], exercicios: [{ id: "y1", nome: "Remada", series: 1, reps: 10, carga: 30 }] },
    ]));
    localStorage.setItem("rotina:sessoes", "[]");
  }, diaHoje);
  await page.reload({ waitUntil: "networkidle0" });
  await espera(1000);
  checar((await texto()).includes("Iniciar treino"), "Botão Iniciar treino na ficha do dia");
  await clicar("button::-p-text(Iniciar treino)");
  await espera(900);
  checar((await texto()).includes("Supino inclinado halter") && (await texto()).includes("Série 1 de 2"), "Abre na primeira série do primeiro exercício");
  checar((await ls("sessoes")).some((s) => s.fichaId === "fA" && typeof s.inicio === "number"), "Sessão salva com a hora de início");
  checar(await page.$eval(".concluir-serie", (b) => b.disabled), "Concluir fica desligado com 0 repetições");
  for (let i = 0; i < 7; i++) { await page.click(".contador-toque"); await espera(60); }
  checar((await contador()) === "7" && (await page.$$(".tracinho path")).length === 7, `7 toques = 7 repetições e 7 riscos de giz (${await contador()}, ${(await page.$$(".tracinho path")).length})`);
  await clicar('button[aria-label="Tirar uma repetição"]');
  await clicar('button[aria-label="Fiz 10 repetições"]');
  checar((await contador()) === "10", "Atalho da meta (10) e o −1 funcionam");
  await page.screenshot({ path: path.join(SHOTS, "foco-contador.png") });
  await clicar('button[aria-label="Somar 2,5 kg"]');
  checar((await peso()) === "22,5", `+2,5 kg (${await peso()})`);
  await clicar("button::-p-text(Concluir série)");
  await espera(400);
  checar(!!(await page.$(".contador.descansando")) && (await texto()).includes("Série 2 de 2"), "Concluir série abre o descanso e já mostra a próxima série");
  checar((await peso()) === "22,5", "A próxima série começa com o peso que você acabou de usar");
  await page.screenshot({ path: path.join(SHOTS, "foco-descanso.png") });
  let s = (await ls("sessoes")).find((x) => x.fichaId === "fA");
  checar(s.exercicios[0].series[0].feita && s.exercicios[0].series[0].reps === 10 && s.exercicios[0].series[0].carga === 22.5, "Série 1 salva com 10 reps e 22,5 kg");
  await clicar("button::-p-text(Pular)");
  checar(!(await page.$(".contador.descansando")) && (await contador()) === "0", "Pular descanso volta ao contador zerado");
  await clicar('button[aria-label="Fiz 8 repetições"]');
  await clicar("button::-p-text(Concluir série)");
  await clicar("button::-p-text(Pular)");
  checar((await texto()).includes("Tríceps corda"), "Acabou o exercício: passa para o próximo");
  await clicar("button::-p-text(Série extra)");
  checar((await texto()).includes("Série 2 de 2"), "Série extra vira a série atual");
  await clicar("button::-p-text(Anterior)");
  checar((await texto()).includes("Supino inclinado halter"), "Anterior volta ao exercício anterior");
  await clicar("button::-p-text(Próximo)");
  await clicar('button[aria-label="Fiz 12 repetições"]');
  await clicar("button::-p-text(Concluir série)");
  await clicar("button::-p-text(Pular)");
  await clicar('button[aria-label="Fiz 12 repetições"]');
  await clicar("button::-p-text(Concluir série)");
  await espera(400);
  checar((await texto()).includes("Todas as séries feitas") && (await texto()).includes("kg de volume"), "Todas feitas: aparece o resumo");
  await page.screenshot({ path: path.join(SHOTS, "foco-resumo.png") });
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  checar(sobra === 0, "Sem rolagem lateral");
  await clicar("button::-p-text(Salvar treino)");
  await espera(600);
  s = (await ls("sessoes")).find((x) => x.fichaId === "fA");
  const f = (await ls("fichas")).find((x) => x.id === "fA");
  checar(s.concluida && typeof s.fim === "number" && f.exercicios[0].carga === 22.5, `Salvar: sessão concluída com fim, e a ficha sugere 22,5 kg (${f.exercicios[0].carga})`);
  // outra ficha, em dia que não é dela
  await clicar('button[aria-label="Iniciar treino Pull"]');
  await espera(800);
  checar((await texto()).includes("Remada"), "Dá para iniciar qualquer ficha pela lista de fichas");
  await page.setViewport({ width: 1440, height: 900 });
  await espera(500);
  await page.screenshot({ path: path.join(SHOTS, "foco-1440.png") });
  const sobra2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  checar(sobra2 === 0, "Sem rolagem lateral em 1440");
  checar(erros.length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
  await browser.close();
  console.log(falhas.length ? `FOCO FALHOU (${falhas.length})` : "FOCO OK");
}

// Leitura: estante, metas, iniciar leitura com tempo, encerrar com a página onde parou, livro lido, atalho do iPhone configurável.
async function leitura() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 390, height: 844 });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  const espera = (ms = 300) => new Promise((r) => setTimeout(r, ms));
  const clicar = async (sel) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => e.scrollIntoView({ block: "center" })); await el.click(); await espera(); };
  const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);
  const texto = () => page.evaluate(() => document.body.textContent);
  const digitar = async (sel, t) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => { e.scrollIntoView({ block: "center" }); e.select?.(); }); await el.type(t); };

  console.log("\nLeitura (390 px)");
  await page.goto(BASE + "#/mais/leitura", { waitUntil: "networkidle0" });
  await espera(900);
  checar((await texto()).includes("Estante") && (await texto()).includes("Metas do dia"), "Aba Leitura em Mais");
  await clicar("button::-p-text(Adicionar livro)");
  await espera(400);
  await digitar('.dialogo input[placeholder="Ex.: Dom Casmurro"]', "Dom Casmurro");
  await digitar('.dialogo input[placeholder="Ex.: Machado de Assis"]', "Machado de Assis");
  await digitar('.dialogo input[placeholder="256"]', "256");
  const pag = (await page.$$(".dialogo .linha-campos input"))[1];
  await pag.evaluate((e) => e.select()); await pag.type("40");
  await clicar("button::-p-text(Pôr na estante)");
  await espera(500);
  let livro = (await ls("livros"))[0];
  checar(livro?.titulo === "Dom Casmurro" && livro.paginas === 256 && livro.pagina === 40, "Livro cadastrado com total e página onde parou");
  checar((await texto()).includes("pág. 40 de 256") && (await texto()).includes("faltam 216"), "Estante mostra página e quanto falta");
  // meta
  const metas = await page.$$(".col-lateral .linha-campos input");
  await metas[0].evaluate((e) => e.select()); await metas[0].type("10"); await metas[0].evaluate((e) => e.blur()); await espera(300);
  checar((await page.evaluate(() => JSON.parse(localStorage.getItem("rotina:config") || "[]")[0]?.metaPaginasDia)) === 10, "Meta de páginas salva");
  // atalho
  await digitar('input[placeholder="Ex.: Iniciar leitura"]', "Iniciar leitura");
  await page.$eval('input[placeholder="Ex.: Iniciar leitura"]', (e) => e.blur()); await espera(300);
  checar((await page.evaluate(() => JSON.parse(localStorage.getItem("rotina:config") || "[]")[0]?.atalhoLeitura)) === "Iniciar leitura", "Nome do atalho do iPhone salvo");
  await page.screenshot({ path: path.join(SHOTS, "leitura-estante.png"), fullPage: true });
  // iniciar
  await clicar("button::-p-text(Iniciar leitura)");
  await espera(400);
  const foco = await page.$(".dialogo .opcao-linha input");
  checar(foco && (await foco.evaluate((e) => e.checked)), "Com atalho configurado, \"Ligar o Foco no iPhone\" vem marcado");
  await foco.click(); // no navegador de teste não há app Atalhos
  await clicar('.dialogo button::-p-text(15 min)');
  await clicar("button::-p-text(Começar a ler)");
  await espera(900);
  checar((await page.evaluate(() => location.hash)) === "#/mais/leitura/agora" && (await texto()).includes("faltam"), "Começar a ler abre o cronômetro");
  checar(/1[45]:\d\d/.test(await page.$eval(".contador-tempo", (e) => e.textContent)), `Contagem de 15 min (${await page.$eval(".contador-tempo", (e) => e.textContent)})`);
  await page.screenshot({ path: path.join(SHOTS, "leitura-agora.png") });
  await clicar("button::-p-text(5 min)");
  checar((await ls("leituras"))[0].planejadoMin === 20, "+5 min soma ao tempo");
  await clicar("button::-p-text(Encerrar leitura)");
  await digitar(".encerrar-leitura input", "52");
  await page.screenshot({ path: path.join(SHOTS, "leitura-encerrar.png") });
  await clicar("button::-p-text(Salvar leitura)");
  await espera(700);
  const s = (await ls("leituras"))[0];
  livro = (await ls("livros"))[0];
  checar(s.fim !== null && s.paginaInicio === 40 && s.paginaFim === 52 && livro.pagina === 52, "Encerrar guarda a sessão e a página onde parou");
  checar(s.focoIphone === false && (await page.evaluate(() => location.protocol)) !== "shortcuts:", "Sem o Foco ligado, encerrar não chama o atalho do iPhone");
  checar((await page.evaluate(() => location.hash)) === "#/mais/leitura" && (await page.$eval(".numeros", (e) => e.textContent)).includes("12"), "Volta para a estante com 12 páginas hoje");
  // terminar o livro
  await page.$eval('button[aria-label="Editar Dom Casmurro"]', (b) => b.click()); // o aviso da sessão pode estar por cima
  await espera(500);
  const p2 =(await page.$$(".dialogo .linha-campos input"))[1];
  await p2.evaluate((e) => e.select()); await p2.type("256");
  await clicar("button::-p-text(Salvar livro)");
  await espera(500);
  const lv = (await ls("livros"))[0];
  checar(lv.estado === "lido" && (await texto()).includes("Lidos"), `Chegar à última página move o livro para Lidos (${lv.estado}, pág. ${lv.pagina})`);
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  checar(sobra === 0, "Sem rolagem lateral");
  await page.setViewport({ width: 1440, height: 900 });
  await espera(500);
  await page.screenshot({ path: path.join(SHOTS, "leitura-1440.png") });
  // desktop: Leitura tem item próprio no menu lateral, marcado (e o Mais não)
  const menu = await page.$$eval(".lateral a[aria-current=page]", (as) => as.map((a) => a.textContent));
  checar(menu.length === 1 && menu[0] === "Leitura", `Menu lateral marca Leitura (${menu.join(",")})`);
  await page.evaluate(() => (location.hash = "/mais/horarios")); await espera(600);
  const menu2 = await page.$$eval(".lateral a[aria-current=page]", (as) => as.map((a) => a.textContent));
  checar(menu2.join() === "Mais", `Em Horários o menu marca Mais (${menu2.join(",")})`);
  await page.$eval('.lateral a[href="#/mais/leitura"]', (a) => a.click()); await espera(600);
  checar((await page.evaluate(() => location.hash)) === "#/mais/leitura", "Item Leitura do menu abre a Leitura");
  await page.setViewport({ width: 390, height: 844 }); await espera(400);
  checar((await page.$$(".barra a")).length === 5, "No celular a barra de baixo continua com 5 itens");
  checar(erros.length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
  await browser.close();
  console.log(falhas.length ? `LEITURA FALHOU (${falhas.length})` : "LEITURA OK");
}

// Ficha de treino aceita faixa de repetições ("8-10") e mostra "8–10" na ficha e no treino.
async function reps() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 390, height: 844 });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  const espera = (ms = 300) => new Promise((r) => setTimeout(r, ms));
  const clicar = async (sel) => { const el = await page.locator(sel).waitHandle(); await el.evaluate((e) => e.scrollIntoView({ block: "center" })); await el.click(); await espera(); };
  const ls = (c) => page.evaluate((c) => JSON.parse(localStorage.getItem("rotina:" + c) || "[]").filter((r) => !r._x), c);

  console.log("\nFaixa de repetições (390 px)");
  await page.goto(BASE + "#/saude/treino", { waitUntil: "networkidle0" });
  await espera(1000);
  await clicar("button::-p-text(Ficha)");
  await espera(500);
  await page.type(".dialogo input[placeholder='Ex.: Push']", "Push teste");
  const dias = await page.$$(".dialogo .dias button");
  const hojeIdx = await page.evaluate(() => (new Date().getDay() + 6) % 7);
  for (let i = 0; i < 7; i++) {
    const on = await dias[i].evaluate((e) => e.getAttribute("aria-pressed") === "true");
    if (on !== (i === hojeIdx)) await dias[i].click();
  }
  await page.type('.dialogo input[aria-label="Exercício"]', "Supino inclinado halter");
  const r = await page.$('.dialogo input[aria-label^="Repetições"]');
  await r.evaluate((e) => e.select());
  await r.type("8-10");
  const largura = await r.evaluate((e) => e.scrollWidth <= e.clientWidth);
  checar(largura, "\"8-10\" cabe inteiro no campo");
  await clicar("button::-p-text(Criar ficha)");
  await espera(600);
  checar(!(await page.$(".dialogo .erro-campo")), "Faixa 8-10 é aceita, sem erro");
  const f = (await ls("fichas")).find((x) => x.nome === "Push teste");
  checar(f?.exercicios[0].reps === 8 && f.exercicios[0].repsMax === 10, `Salva 8 a 10 (${JSON.stringify(f?.exercicios[0])})`);
  checar((await page.evaluate(() => document.body.textContent)).includes("3×8–10"), "Ficha mostra 3×8–10");
  await page.evaluate(() => (location.hash = "/saude/treino/agora"));
  await espera(1200);
  checar((await page.evaluate(() => document.body.textContent)).includes("meta 8–10 reps"), "No treino (modo foco) aparece a meta 8–10");
  // editar: o campo volta como 8-10
  await page.evaluate(() => (location.hash = "/saude/treino"));
  await espera(1000);
  await clicar('button[aria-label="Editar ficha Push teste"]');
  const v = await page.$eval('.dialogo input[aria-label^="Repetições"]', (e) => e.value);
  checar(v === "8-10", `Ao editar, o campo mostra 8-10 (${v})`);
  checar(erros.length === 0, `sem erro${erros.length ? ": " + erros.slice(0, 2).join(" | ") : ""}`);
  await browser.close();
  console.log(falhas.length ? `REPS FALHOU (${falhas.length})` : "REPS OK");
}

// Hover e foco não podem criar scroll lateral em nenhuma lista fixa (bug real: chevron deslizando 3 px na Escola).
async function hover() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  for (const w of [1100, 1280, 1440, 1642, 1920, 2560]) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(BASE + "#/escola", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1300));
    const linhas = await page.$$(".materia-linha");
    let pior = 0;
    for (const l of linhas) {
      await l.hover();
      await new Promise((r) => setTimeout(r, 300));
      const r = await page.evaluate(() => {
        const el = document.querySelector(".col-fixa");
        return Math.max(el.scrollWidth - el.clientWidth, el.scrollLeft, document.documentElement.scrollWidth - document.documentElement.clientWidth);
      });
      pior = Math.max(pior, r);
    }
    checar(linhas.length > 0 && pior === 0, `${w}px: ${linhas.length} linhas em hover sem scroll lateral (${pior}px)`);
  }
  await browser.close();
  console.log(falhas.length ? `HOVER FALHOU (${falhas.length})` : "HOVER OK");
}

// Tela parada não pode repintar: animação que nunca para (ou que anima box-shadow/SVG) trava celular e gasta bateria.
// Bug real: copo d'água com onda em loop repintava Hoje e Dieta ~120 vezes por segundo. Mede com o rastreamento do Chrome.
async function parado() {
  const puppeteer = qa("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.goto(BASE + "#/hoje", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  for (const rota of ["hoje", "saude/dieta", "tarefas", "escola", "mais/horarios"]) {
    await page.evaluate((r) => (location.hash = "/" + r), rota);
    await new Promise((r) => setTimeout(r, 1800)); // a animação de entrada acaba
    await page.tracing.start({ categories: ["devtools.timeline"] });
    await new Promise((r) => setTimeout(r, 2500));
    const eventos = JSON.parse(Buffer.from(await page.tracing.stop()).toString()).traceEvents;
    const pinturas = eventos.filter((e) => e.name === "Paint").length;
    checar(pinturas <= 5, `${rota}: parada por 2,5 s repinta ${pinturas}x (máx. 5)`);
  }
  await browser.close();
  console.log(falhas.length ? `PARADO FALHOU (${falhas.length})` : "PARADO OK");
}

async function lighthouse() {
  const lh = qa("lighthouse").default ?? qa("lighthouse");
  const chromeLauncher = qa("chrome-launcher");
  const puppeteer = qa("puppeteer");
  const chrome = await chromeLauncher.launch({ chromePath: await puppeteer.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
  const r = await lh(BASE, { port: chrome.port, output: "json", logLevel: "error", formFactor: "mobile", onlyCategories: ["performance", "accessibility", "best-practices"] });
  await chrome.kill();
  const c = r.lhr.categories;
  const p = Math.round(c.performance.score * 100), a = Math.round(c.accessibility.score * 100), b = Math.round(c["best-practices"].score * 100);
  console.log(`Performance ${p} · Acessibilidade ${a} · Boas práticas ${b} · LCP ${r.lhr.audits["largest-contentful-paint"].displayValue} · CLS ${r.lhr.audits["cumulative-layout-shift"].displayValue}`);
  for (const [id, au] of Object.entries(r.lhr.audits)) if (au.score !== null && au.score < 0.9 && au.scoreDisplayMode === "binary") console.log("  - " + id + ": " + au.title);
  console.log(p >= 90 && a >= 95 && b >= 95 ? "LIGHTHOUSE OK" : "LIGHTHOUSE FALHOU");
  if (!(p >= 90 && a >= 95 && b >= 95)) falhas.push("lighthouse");
}

try {
  await esperarServidor();
  if (modo === "navegador") await navegador();
  else if (modo === "lighthouse") await lighthouse();
  else if (modo === "movimento") await movimento();
  else if (modo === "flashcards") await flashcards();
  else if (modo === "hover") await hover();
  else if (modo === "parado") await parado();
  else if (modo === "nutricao") await nutricao();
  else if (modo === "marcas") await marcas();
  else if (modo === "diario") await diario();
  else if (modo === "reps") await reps();
  else if (modo === "foco") await foco();
  else if (modo === "leitura") await leitura();
  else { console.log("uso: node scripts/verificar.mjs <navegador|lighthouse>"); falhas.push("modo"); }
} catch (e) {
  console.log("ERRO: " + (e.stack || e));
  falhas.push("exceção");
} finally {
  servidor.kill();
}
process.exit(falhas.length ? 1 : 0);
