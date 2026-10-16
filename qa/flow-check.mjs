/* Verificação funcional por CDP: simula o fluxo real do estudante e reporta o resultado.
   Uso: node qa/flow-check.mjs [base]
   Cobre: explorar (responder e concluir), navegação por atividade, ausência de erros de console. */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://127.0.0.1:4180";
const PORT = 9347;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "graphos-flow-"));
const child = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let ws, fails = 0, passes = 0;
const check = (name, ok, detail = "") => {
  (ok ? passes++ : fails++);
  console.log(`${ok ? "ok  " : "FALHA"} ${name}${detail ? ` — ${detail}` : ""}`);
};
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch {}
    if (!target) await sleep(250);
  }
  ws = await new Promise((res, rej) => { const s = new WebSocket(target.webSocketDebuggerUrl); s.onopen = () => res(s); s.onerror = () => rej(new Error("ws")); });
  let id = 0;
  const pending = new Map();
  let consoleErrors = [];
  ws.onmessage = (m) => {
    const g = JSON.parse(m.data);
    if (g.id && pending.has(g.id)) { const p = pending.get(g.id); pending.delete(g.id); g.error ? p.rej(new Error(JSON.stringify(g.error))) : p.res(g.result); }
    else if (g.method === "Log.entryAdded" && g.params.entry.level === "error") consoleErrors.push(g.params.entry.text);
    else if (g.method === "Runtime.exceptionThrown") consoleErrors.push((g.params.exceptionDetails.exception?.description || g.params.exceptionDetails.text || "").split("\n").slice(0, 3).join(" "));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description || ""));
    return r.result.value;
  };
  const go = async (path, w = 390, h = 844) => {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w <= 480 });
    await send("Page.navigate", { url: `${BASE}${path}` });
    await sleep(1400);
  };
  /* Semeia progresso REAL no formato do motor da jornada, para poder abrir fases
     que já dependem de outras. Não inventa interface: usa a mesma estrutura salva. */
  const seedProgress = async (doneIds) => {
    await evalJs(`(() => {
      const done = ${JSON.stringify(doneIds)};
      const st = { v: 1, prog: {}, done: {}, bonus: {}, ach: {}, reviews: {}, legacy: false };
      done.forEach((id) => { st.done[id] = { at: Date.now(), legacy: false }; });
      localStorage.setItem('graphos.jornada', JSON.stringify(st));
      return true;
    })()`);
  };
  const vila = ["1.1", "1.2", "1.3", "1.4"];
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");

  /* ---------- Explorar: responder a pergunta do conceito 2 (Aresta) ---------- */
  await go("/explorar.html");
  await seedProgress(vila);
  await go("/explorar.html?fase=1.2");
  const state = await evalJs(`(() => { const t = document.querySelector('#ctask'); return { tem: !!t, texto: t ? t.textContent.replace(/\\s+/g,' ').trim().slice(0,120) : '', botao: !!document.querySelector('#concepts [data-c="1"]') }; })()`);
  check("explorar: área de tarefa existe com texto", state.tem && state.texto.length > 20, state.texto);
  check("explorar: painel lista as etapas", state.botao === true);
  /* Abre o conceito 2 e confere a resposta certa (2 arestas no canto A1 de um 5x5).
     Neste conceito a resposta é de escolha múltipla: as opções ficam no cartão do
     tabuleiro, logo abaixo da figura. */
  await evalJs(`document.querySelector('#concepts [data-c="1"]').click()`);
  await sleep(400);
  const choices = await evalJs(`[...document.querySelectorAll('#c-answer .choice')].map((b) => b.textContent.trim())`);
  check("explorar: opções de resposta aparecem no cartão do tabuleiro", choices.length >= 3, choices.join(","));
  await evalJs(`[...document.querySelectorAll('#c-answer .choice')].find((b) => b.textContent.trim() === '2').click()`);
  await sleep(500);
  const fbOk = await evalJs(`(() => { const f = document.querySelector('#fb'); return { cls: f.className, txt: f.textContent.replace(/\\s+/g,' ').trim().slice(0,90) }; })()`);
  check("explorar: feedback de acerto tem classe ok e explicação", /\\bok\\b/.test(fbOk.cls) || fbOk.cls.includes("ok"), fbOk.txt);
  const concluiu = await evalJs(`JSON.parse(localStorage.getItem('graphos.jornada')||'null')?.done?.['1.2'] ? true : false`);
  check("explorar: fase 1.2 registrada no progresso real", concluiu === true);

  /* ---------- Resposta errada dá feedback educativo e não conclui ---------- */
  await go("/explorar.html?fase=1.2");
  await evalJs(`document.querySelector('#concepts [data-c="1"]').click()`);
  await sleep(300);
  await evalJs(`[...document.querySelectorAll('#c-answer .choice')].find((b) => b.textContent.trim() === '8').click()`);
  await sleep(400);
  const fbBad = await evalJs(`(() => { const f = document.querySelector('#fb'); return { cls: f.className, txt: f.textContent.replace(/\\s+/g,' ').trim() }; })()`);
  check("explorar: erro explica o que revisar", fbBad.cls.includes("bad") && /A1|salto/i.test(fbBad.txt), fbBad.txt.slice(0, 110));

  /* ---------- Distância (2.1): aposta numérica junto do tabuleiro ----------
     2.1 depende de 1.5 (peças como grafos), então o progresso entra com as duas. */
  await seedProgress([...vila, "1.5"]);
  await go("/explorar.html?fase=2.1");
  await evalJs(`document.querySelector('#concepts [data-c="4"]').click()`);
  await sleep(400);
  const semPar = await evalJs(`(() => { const a = document.querySelector('#c-answer'); return { hidden: a.hidden, txt: a.textContent.trim() }; })()`);
  check("explorar: sem par escolhido não há pergunta a responder", semPar.hidden && semPar.txt === "", JSON.stringify(semPar));
  /* Toca em duas casas do tabuleiro pelo próprio viewport (pointerdown/up). */
  const toca = async (id) => {
    await evalJs(`(() => { const el = document.querySelector('#bsvg [data-id="${id}"]'); const r = el.getBoundingClientRect(); const o = { bubbles: true, pointerId: 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); })()`);
    await sleep(280);
  };
  await toca("A1");
  const comUm = await evalJs(`(() => { const a = document.querySelector('#c-answer'); return { hidden: a.hidden, temCampo: !!a.querySelector('#guess'), temSemCaminho: !!a.querySelector('[data-check-none]') }; })()`);
  check("explorar: com uma casa escolhida a aposta ainda não aparece", comUm.hidden === true, JSON.stringify(comUm));
  await toca("E5");
  const comDois = await evalJs(`(() => { const a = document.querySelector('#c-answer'); const g = a.querySelector('#guess'); const b = document.querySelector('#bsvg'); return { hidden: a.hidden, temCampo: !!g, temSemCaminho: !!a.querySelector('[data-check-none]'), dist: g ? Math.round(Math.abs(g.getBoundingClientRect().top - b.getBoundingClientRect().bottom)) : null }; })()`);
  check("explorar: com o par escolhido aparecem a aposta e a opção 'não existe caminho'", !comDois.hidden && comDois.temCampo && comDois.temSemCaminho, JSON.stringify(comDois));
  check("explorar: aposta fica logo abaixo do tabuleiro (< 200px)", comDois.dist !== null && comDois.dist < 200, `distância vertical ${comDois.dist}px`);
  /* A distância certa é calculada pelo motor; conferimos que uma aposta errada
     explica o valor e uma certa conclui a fase 2.1. */
  const real = await evalJs(`(() => { const b = document.querySelector('#fb'); return b.textContent; })()`);
  const palpite = await evalJs(`(() => { const i = document.querySelector('#guess'); i.value = '0'; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-check]').click(); return true; })()`);
  await sleep(500);
  const fbDist = await evalJs(`(() => { const f = document.querySelector('#fb'); return { cls: f.className, txt: f.textContent.replace(/\\s+/g,' ').trim().slice(0, 120) }; })()`);
  check("explorar: valor errado mostra a distância calculada", palpite && fbDist.cls.includes("info") && /distância é/.test(fbDist.txt), fbDist.txt);
  const concluiu21 = await evalJs(`(() => { const i = document.querySelector('#guess'); i.value = '4'; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-check]').click(); return true; })()`);
  await sleep(500);
  const fb21 = await evalJs(`(() => { const f = document.querySelector('#fb'); return { cls: f.className, txt: f.textContent.replace(/\\s+/g,' ').trim().slice(0, 90) }; })()`);
  check("explorar: acerto na distância conclui a fase 2.1", concluiu21 && fb21.cls.includes("ok") && /Acertou/.test(fb21.txt), fb21.txt);
  const prog21 = await evalJs(`JSON.parse(localStorage.getItem('graphos.jornada')||'null')?.done?.['2.1'] ? true : false`);
  check("explorar: fase 2.1 registrada no progresso real", prog21 === true, real.slice(0, 60));
  /* A mesma resposta num par já revelado não vale evidência nova (a regra é do motor):
     o retorno continua explicando o valor calculado. */
  const repetido = await evalJs(`(() => { const i = document.querySelector('#guess'); i.value = '4'; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-check]').click(); return true; })()`);
  await sleep(400);
  const fbRep = await evalJs(`document.querySelector('#fb').textContent.replace(/\\s+/g,' ').trim().slice(0, 110)`);
  check("explorar: repetir o mesmo par explica sem conceder evidência nova", repetido && /de novo|já tinha sido revelada/.test(fbRep), fbRep);

  /* ---------- Navegação: todas as áreas e atividades carregam ---------- */
  for (const p of ["/index.html", "/progresso.html", "/lab.html", "/pesquisa.html", "/caminhos.html", "/troca.html", "/laboratorio.html", "/combinatoria.html", "/sobre.html"]) {
    await go(p);
    const info = await evalJs(`(() => ({
      titulo: document.title,
      header: !!document.querySelector('.top'),
      areas: document.querySelectorAll('.top .st').length,
      itens: document.querySelectorAll('#nav-bar .nav-item').length,
      seletor: !!document.querySelector('#sub-select'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      vazio: (document.querySelector('#conteudo')?.textContent||'').trim().length,
    }))()`);
    /* Quatro destinos (Aprender, Laboratório, Progresso, Pesquisa): o mesmo conjunto
       no cabeçalho e na barra inferior. */
    check(`${p} carrega com navegação e conteúdo`, info.header && info.areas === 4 && info.itens === 4 && info.vazio > 200 && info.overflow <= 2, `áreas=${info.areas} itens=${info.itens} seletor=${info.seletor} overflow=${info.overflow}`);
  }

  /* ---------- Barra inferior: existe no celular, navega e marca a área atual ---------- */
  await go("/progresso.html");
  const barra = await evalJs(`(() => {
    const bar = document.getElementById('nav-bar');
    const cs = getComputedStyle(bar);
    const ativo = bar.querySelector('.nav-item.on');
    return { display: cs.display, position: cs.position, bottom: Math.round(innerHeight - bar.getBoundingClientRect().bottom), ativo: ativo ? ativo.getAttribute('href') : null, aria: ativo ? ativo.getAttribute('aria-current') : null };
  })()`);
  check("barra inferior fixa no rodapé com a área atual marcada", barra.display !== "none" && barra.position === "fixed" && barra.bottom === 0 && (barra.ativo || "").includes("progresso") && barra.aria === "page", JSON.stringify(barra));
  await evalJs(`document.querySelector('#nav-bar .nav-item[href="lab.html"]').click()`);
  await sleep(1400);
  const aposBarra = await evalJs(`({ rota: location.pathname, ativo: document.querySelector('#nav-bar .nav-item.on')?.getAttribute('href') })`);
  check("barra inferior navega para a área escolhida", aposBarra.rota.includes("lab") && (aposBarra.ativo || "").includes("lab"), JSON.stringify(aposBarra));

  /* ---------- Menu "Mais": abre, fecha e reúne os itens secundários ---------- */
  const mais = await evalJs(`(() => {
    document.getElementById('more-open').click();
    const s = document.getElementById('mais');
    const itens = [...s.querySelectorAll('.sheet-list a, .sheet-list button')].map((e) => e.textContent.trim());
    const aberto = !s.hidden;
    document.getElementById('more-open').click();
    return { aberto, fechado: s.hidden, itens };
  })()`);
  check("menu Mais abre, fecha e traz tema, animações e páginas", mais.aberto && mais.fechado && mais.itens.length >= 5, JSON.stringify(mais.itens));

  /* ---------- Seletor de atividade navega de verdade ---------- */
  await go("/explorar.html");
  const opts = await evalJs(`[...document.querySelectorAll('#sub-select option')].map(o=>o.value)`);
  check("seletor de atividades lista todas as atividades", opts.length === 7, `${opts.length}: ${opts.join(" ")}`);
  check("o seletor inclui as atividades novas (peças como grafos e aplicações)",
    opts.some((o) => o.includes("pecas")) && opts.some((o) => o.includes("redes")), opts.join(" "));
  const val = opts[2];
  await evalJs(`(() => { const s = document.querySelector('#sub-select'); s.value = ${JSON.stringify("caminhos.html")}; s.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await sleep(1400);
  const after = await evalJs(`location.pathname`);
  check("seletor de atividades navega para a atividade escolhida", after.includes("caminhos"), after);

  /* ---------- Bloqueio por link direto continua valendo ---------- */
  await go("/troca.html?fase=3.1");
  const gate = await evalJs(`(() => ({ gate: !!document.querySelector('.gate'), work: !!document.querySelector('.work') }))()`);
  check("atividade bloqueada mostra a página de bloqueio", gate.gate === true, JSON.stringify(gate));

  console.log(`\n${passes} verificações ok, ${fails} falha(s).`);
  if (consoleErrors.length) console.log("Erros de console:", consoleErrors.slice(0, 6).join(" | "));
  else console.log("Nenhum erro de console.");
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
process.exit(fails ? 1 : 0);
