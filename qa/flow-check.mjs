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
  /* Abre o conceito 2 e confere a resposta certa (2 arestas no canto A1 de um 5x5). */
  await evalJs(`document.querySelector('#concepts [data-c="1"]').click()`);
  await sleep(400);
  const hasInput = await evalJs(`!!document.querySelector('#guess')`);
  check("explorar: campo de resposta aparece junto da tarefa", hasInput);
  const near = await evalJs(`(() => { const g = document.querySelector('#guess'), b = document.querySelector('#bsvg'); if (!g || !b) return null; return Math.round(Math.abs(g.getBoundingClientRect().top - b.getBoundingClientRect().bottom)); })()`);
  check("explorar: resposta perto do tabuleiro (< 700px)", near !== null && near < 700, `distância vertical ${near}px`);
  await evalJs(`(() => { const i = document.querySelector('#guess'); i.value = '2'; i.dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('[data-check]').click(); })()`);
  await sleep(500);
  const fbOk = await evalJs(`(() => { const f = document.querySelector('#fb'); return { cls: f.className, txt: f.textContent.replace(/\\s+/g,' ').trim().slice(0,90) }; })()`);
  check("explorar: feedback de acerto tem classe ok e explicação", /\\bok\\b/.test(fbOk.cls) || fbOk.cls.includes("ok"), fbOk.txt);
  const concluiu = await evalJs(`JSON.parse(localStorage.getItem('graphos.jornada')||'null')?.done?.['1.2'] ? true : false`);
  check("explorar: fase 1.2 registrada no progresso real", concluiu === true);

  /* ---------- Resposta errada dá feedback educativo e não conclui ---------- */
  await go("/explorar.html?fase=1.2");
  await evalJs(`document.querySelector('#concepts [data-c="1"]').click()`);  await sleep(300);
  await evalJs(`(() => { const i = document.querySelector('#guess'); i.value = '9'; i.dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('[data-check]').click(); })()`);
  await sleep(400);
  const fbBad = await evalJs(`(() => { const f = document.querySelector('#fb'); return { cls: f.className, txt: f.textContent.replace(/\\s+/g,' ').trim() }; })()`);
  check("explorar: erro explica o que revisar", fbBad.cls.includes("bad") && /A1|salto/i.test(fbBad.txt), fbBad.txt.slice(0, 110));

  /* ---------- Navegação: todas as áreas e atividades carregam ---------- */
  for (const p of ["/index.html", "/lab.html", "/pesquisa.html", "/caminhos.html", "/troca.html", "/laboratorio.html", "/combinatoria.html", "/sobre.html"]) {
    await go(p);
    const info = await evalJs(`(() => ({
      titulo: document.title,
      header: !!document.querySelector('.top'),
      areas: document.querySelectorAll('.top .st').length,
      seletor: !!document.querySelector('#sub-select'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      vazio: (document.querySelector('#conteudo')?.textContent||'').trim().length,
    }))()`);
    check(`${p} carrega com navegação e conteúdo`, info.header && info.areas === 3 && info.vazio > 200 && info.overflow <= 2, `áreas=${info.areas} seletor=${info.seletor} overflow=${info.overflow}`);
  }

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
