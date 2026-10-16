/* Verificação da barra de navegação inferior (Etapa 2).
   Confere, em várias larguras de celular: existência e posição da barra, estado
   ativo pela rota, ausência de conteúdo encoberto no fim da página, alvos de toque
   e erros de console. Uso: node qa/nav-check.mjs [base]
   O servidor precisa estar no ar (padrão http://127.0.0.1:4180). */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://127.0.0.1:4180";
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGES = ["index", "progresso", "lab", "pesquisa", "explorar", "caminhos", "troca", "laboratorio", "combinatoria", "redes", "sobre", "estrutura", "regras", "grafo", "geometria", "analise", "solucao", "pecas"];
const WIDTHS = [360, 390, 414];

const PROBE = `(() => {
  const out = { errs: [] };
  const bar = document.getElementById("nav-bar");
  if (!bar) return { ...out, fatal: "sem #nav-bar" };
  const cs = getComputedStyle(bar);
  const r = bar.getBoundingClientRect();
  out.bar = { display: cs.display, position: cs.position, top: Math.round(r.top), height: Math.round(r.height), bottom: Math.round(r.bottom) };
  out.viewportH = innerHeight;
  out.barVisible = cs.display !== "none" && cs.position === "fixed" && Math.abs(r.bottom - innerHeight) < 2;
  const active = [...bar.querySelectorAll(".nav-item")].filter((a) => a.classList.contains("on"));
  out.activeCount = active.length;
  out.active = active.map((a) => ({ text: a.textContent.trim(), aria: a.getAttribute("aria-current"), href: a.getAttribute("href") }));
  out.items = [...bar.querySelectorAll(".nav-item")].map((a) => {
    const b = a.getBoundingClientRect();
    return { text: a.textContent.trim(), w: Math.round(b.width), h: Math.round(b.height) };
  });
  /* Alvo de toque: o item precisa de 44px de largura e 44 de altura. */
  out.smallItems = out.items.filter((i) => i.h < 44 || i.w < 44).map((i) => i.text);
  return out;
})()`;

/* Com a página rolada até o fim, nada pode ficar sob a faixa da barra.
   Elementos recortados por um contêiner com rolagem própria (painel lateral, listas)
   ficam fora: eles pertencem ao contêiner e são rolados por ele. */
const END_PROBE = `(() => {
  const bar = document.getElementById("nav-bar");
  if (!bar) return { fatal: "sem #nav-bar" };
  const r = bar.getBoundingClientRect();
  const clipped = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      /* Componente fora de vista (folha de detalhes fechada): não é conteúdo coberto. */
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return { hidden: true };
      if (/auto|scroll|hidden/.test(cs.overflowY) || /auto|scroll|hidden/.test(cs.overflowX)) {
        const b = p.getBoundingClientRect();
        if (b.height > 0 && b.width > 0) return { box: b };
      }
      p = p.parentElement;
    }
    return null;
  };
  const covered = [];
  document.querySelectorAll("main a, main button, main input, main select, main summary, main textarea").forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    if (cy < r.top || cy > r.bottom) return;
    const c = clipped(el);
    if (c && c.hidden) return;
    if (c && (cy > c.box.bottom + 0.5 || cy < c.box.top - 0.5)) return;
    const hit = document.elementFromPoint(cx, cy);
    if (hit && (hit === bar || bar.contains(hit))) covered.push((el.textContent || el.id || el.tagName).trim().replace(/\\s+/g, " ").slice(0, 40));
  });
  return { covered, scrollY: Math.round(scrollY), maxScroll: Math.round(document.documentElement.scrollHeight - innerHeight) };
})()`;

const profile = mkdtempSync(join(tmpdir(), "graphos-nav-"));
const child = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let ws;
const problems = [];
let checks = 0;
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch {}
    if (!target) await sleep(250);
  }
  ws = await new Promise((res, rej) => { const s = new WebSocket(target.webSocketDebuggerUrl); s.onopen = () => res(s); s.onerror = () => rej(new Error("ws")); });
  let id = 0;
  const pending = new Map();
  const consoleErrs = [];
  ws.onmessage = (m) => {
    const g = JSON.parse(m.data);
    if (g.method === "Runtime.exceptionThrown") consoleErrs.push(String(g.params.exceptionDetails.exception?.description || g.params.exceptionDetails.text).slice(0, 160));
    if (g.method === "Log.entryAdded" && g.params.entry.level === "error") consoleErrs.push(String(g.params.entry.text).slice(0, 160));
    if (g.id && pending.has(g.id)) { const p = pending.get(g.id); pending.delete(g.id); g.error ? p.rej(new Error(JSON.stringify(g.error))) : p.res(g.result); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  for (const width of WIDTHS) {
    for (const page of PAGES) {
      consoleErrs.length = 0;
      await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
      await send("Page.navigate", { url: `${BASE}/${page}.html` });
      await sleep(1200);
      const res = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true });
      const v = res.result.value;
      checks++;
      const at = `${page}@${width}`;
      if (v.fatal) { problems.push(`${at}: ${v.fatal}`); continue; }
      if (!v.barVisible) problems.push(`${at}: barra não está fixa no rodapé (${v.bar.display}/${v.bar.position}, bottom=${v.bar.bottom} vs ${v.viewportH})`);
      if (v.activeCount !== 1) problems.push(`${at}: ${v.activeCount} itens ativos (esperado 1)`);
      if (!v.active[0]?.aria) problems.push(`${at}: item ativo sem aria-current`);
      if (v.smallItems.length) problems.push(`${at}: itens pequenos: ${v.smallItems.join(", ")}`);
      /* Fim da página: com a rolagem no máximo, nenhum controle pode ficar sob a
         barra (se ficar ali, não há como o estudante alcançá-lo). Os blocos
         recolhidos são abertos antes para que o pior caso seja medido; depois
         esperamos o layout assentar e rolamos de novo até o novo fim. */
      await send("Runtime.evaluate", { expression: "document.querySelectorAll('details').forEach((d) => (d.open = true))" });
      await sleep(600);
      await send("Runtime.evaluate", { expression: "window.scrollTo(0, document.documentElement.scrollHeight)" });
      await sleep(400);
      await send("Runtime.evaluate", { expression: "window.scrollTo(0, document.documentElement.scrollHeight)" });
      await sleep(400);
      const endRes = await send("Runtime.evaluate", { expression: END_PROBE, returnByValue: true });
      const ev = endRes.result.value;
      checks++;
      if (ev.fatal) problems.push(`${at}: ${ev.fatal}`);
      else if (ev.covered.length) problems.push(`${at}: no fim da página, sob a barra: ${ev.covered.join(" | ")}`);
      if (consoleErrs.length) problems.push(`${at}: console: ${consoleErrs[0]}`);
    }
  }
  /* Desktop: a barra não pode existir e o menu do cabeçalho deve estar visível. */
  for (const page of ["index", "progresso", "lab"]) {
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE}/${page}.html` });
    await sleep(1000);
    const res = await send("Runtime.evaluate", { expression: `(() => { const bar = getComputedStyle(document.getElementById("nav-bar")).display; const steps = document.querySelectorAll(".steps .st").length; return { bar, steps }; })()`, returnByValue: true });
    checks++;
    if (res.result.value.bar !== "none") problems.push(`${page}@1280: barra inferior visível no desktop`);
    if (res.result.value.steps < 4) problems.push(`${page}@1280: menu do cabeçalho com ${res.result.value.steps} áreas (esperado 4)`);
  }
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
console.log(`barra inferior: ${checks} verificações`);
if (problems.length) {
  console.log("PROBLEMAS:");
  for (const p of problems.slice(0, 40)) console.log(" -", p);
  process.exitCode = 1;
} else {
  console.log("Sem problemas: barra fixa, 1 item ativo com aria-current, alvos ≥ 44px, nada encoberto, desktop sem barra.");
}
