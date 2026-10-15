/* Graphos / QA de layout: mede transbordamento horizontal real usando o Chrome DevTools Protocol.
   Uso: node qa/layout-check.mjs [base] [--json]
   Verifica, em várias larguras: transbordamento do documento, elementos culpados, alvos de toque
   pequenos, erros de console e a ordem vertical dos elementos da atividade (objetivo → tabuleiro → resposta). */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "http://127.0.0.1:4180";
const PORT = 9333;

export const VIEWPORTS = [
  { w: 1440, h: 900, n: "desktop" },
  { w: 1024, h: 768, n: "laptop" },
  { w: 768, h: 1024, n: "tablet" },
  { w: 390, h: 844, n: "phone" },
  { w: 360, h: 740, n: "phone-small" },
  { w: 320, h: 640, n: "phone-narrow" },
];

export const PAGES = ["index", "explorar", "pecas", "lab", "pesquisa", "sobre", "troca", "caminhos", "laboratorio", "combinatoria", "redes", "estrutura", "regras", "grafo", "geometria", "analise", "solucao", "trilha"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTargets() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* ainda subindo */ }
    await sleep(250);
  }
  throw new Error("CDP não respondeu");
}

function connect(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws.onopen = () => res(ws);
    ws.onerror = (e) => rej(new Error("ws error"));
  });
}

function makeClient(ws) {
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => { if (pending.has(i)) { pending.delete(i); rej(new Error("timeout " + method)); } }, 30000);
    });
  return { send, events };
}

/* Sonda executada dentro da página. Devolve só o que interessa. */
const PROBE = `(() => {
  const doc = document.documentElement;
  const vw = window.innerWidth;
  const out = { vw, scrollW: doc.scrollWidth, bodyScrollW: document.body.scrollWidth, over: [], tap: [], console: [], order: {} };

  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.');
    return s;
  };

  // Elementos que de fato ultrapassam a largura da viewport de forma visível.
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const right = r.right + window.scrollX;
    const left = r.left + window.scrollX;
    if (right > vw + 1.5 || left < -1.5) {
      // Guarda só o elemento mais externo de cada ramo (evita listar toda a descendência).
      if (!out.over.some((o) => o.el && el.parentElement && el.parentElement.contains(document.querySelector(o.sel) || document.body))) {
        out.over.push({ sel: label(el), left: Math.round(left), right: Math.round(right), w: Math.round(r.width), over: Math.round(Math.max(right - vw, -left)) });
      }
    }
  }

  // Alvos de toque: controles interativos menores que 40x40 na viewport estreita.
  if (vw <= 480) {
    for (const el of document.querySelectorAll('button, a, input, select, [role="button"], summary')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 40 || r.width < 24) out.tap.push({ sel: label(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
    out.tap = out.tap.slice(0, 14);
  }

  // Ordem vertical: objetivo/instrução → área de interação → resposta.
  const find = (sels) => { for (const s of sels) { const e = document.querySelector(s); if (e) { const r = e.getBoundingClientRect(); if (r.height) return { s, top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) }; } } return null; };
  out.order = {
    objetivo: find(['#fase-objetivo', '.fase', '.j-go', '#j-go', '.gate']),
    tarefa: find(['#ctask', '.ctask']),
    instrucao: find(['.c-body .task', '#fb', '.ask']),
    interacao: find(['#bsvg', '#gsvg', '.cv svg', '.board svg']),
    resposta: find(['#guess', '.ask-row', '#c-extra input', '[data-check]']),
  };

  // Altura ocupada pelo cabeçalho fixo em relação à tela.
  const chrome = document.querySelector('#chrome');
  if (chrome) out.headerH = Math.round(chrome.getBoundingClientRect().height);
  const phase = document.querySelector('#fase-banner');
  if (phase) {
    out.phaseH = Math.round(phase.getBoundingClientRect().height);
    // Detalhe por filho: mostra onde a altura da faixa está sendo gasta.
    out.phaseParts = [...phase.children].map((c) => {
      const r = c.getBoundingClientRect();
      return c.className + '=' + Math.round(r.height);
    });
    const main = phase.querySelector('.fase-main');
    if (main) out.phaseMain = [...main.children].map((c) => c.className + '=' + Math.round(c.getBoundingClientRect().height));
    const list = phase.querySelector('.fase-list');
    if (list) out.faseList = { h: Math.round(list.getBoundingClientRect().height), wrap: getComputedStyle(list).flexWrap, items: list.children.length };
  }
  out.docH = doc.scrollHeight;
  return out;
})()`;

export async function runChecks({ pages = PAGES, viewports = VIEWPORTS, base = BASE } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "graphos-qa-"));
  const child = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const results = [];
  let ws;
  try {
    const target = await cdpTargets();
    ws = await connect(target.webSocketDebuggerUrl);
    const { send, events } = makeClient(ws);
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");

    for (const vp of viewports) {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.w <= 480 });
      for (const page of pages) {
        events.length = 0;
        await send("Page.navigate", { url: `${base}/${page}.html` });
        await sleep(1100);
        let r;
        try {
          const res = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true, awaitPromise: false });
          r = res.result.value;
        } catch (e) { r = { error: String(e.message) }; }
        const errs = events.filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error").map((e) => e.params.entry.text);
        const ex = events.filter((e) => e.method === "Runtime.exceptionThrown").map((e) => e.params.exceptionDetails.text);
        results.push({ viewport: vp, page, ...r, errors: [...errs, ...ex].slice(0, 4) });
      }
    }
  } finally {
    try { ws && ws.close(); } catch {}
    child.kill();
    await sleep(400);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
  return results;
}

const OVERFLOW_TOLERANCE = 2;

export function report(results) {
  const problems = [];
  console.log("\n=== Transbordamento horizontal / larguras ===");
  console.log("página".padEnd(14) + "viewport".padEnd(14) + "scrollW".padStart(9) + "  culpados");
  for (const r of results) {
    const vp = `${r.viewport.w}x${r.viewport.h}`;
    const over = r.scrollW - r.viewport.w;
    const flag = over > OVERFLOW_TOLERANCE ? " <== TRANSBORDA" : "";
    if (over > OVERFLOW_TOLERANCE) problems.push({ kind: "overflow", page: r.page, vp, over, culprits: (r.over || []).slice(0, 5) });
    console.log(`${r.page.padEnd(14)}${vp.padEnd(14)}${String(r.scrollW).padStart(9)}  ${(r.over || []).slice(0, 3).map((o) => `${o.sel}(+${o.over})`).join(" ")}${flag}`);
  }

  console.log("\n=== Erros de console ===");
  const withErr = results.filter((r) => r.errors && r.errors.length);
  if (!withErr.length) console.log("nenhum");
  for (const r of withErr) console.log(`${r.page} ${r.viewport.w}px: ${r.errors.join(" | ")}`);

  console.log("\n=== Cabeçalho fixo (altura / % da tela) — larguras de celular ===");
  for (const r of results.filter((x) => x.viewport.w <= 480)) {
    if (r.headerH) console.log(`${r.page.padEnd(14)}${r.viewport.w}px  header=${r.headerH}px (${Math.round((r.headerH / r.viewport.h) * 100)}%)  fase=${r.phaseH || 0}px`);
  }

  console.log("\n=== Composição da faixa de fase (Explorar) ===");
  for (const r of results.filter((x) => x.page === "explorar")) {
    console.log(`${String(r.viewport.w).padEnd(5)}px  total=${r.phaseH}px`);
    if (r.phaseMain) console.log(`        .fase-main: ${r.phaseMain.join("  ")}`);
    if (r.phaseParts) console.log(`        filhos: ${r.phaseParts.join("  ")}`);
    if (r.faseList) console.log(`        .fase-list: h=${r.faseList.h} wrap=${r.faseList.wrap} itens=${r.faseList.items}`);
  }

  console.log("\n=== Ordem vertical na atividade (Explorar) ===");
  for (const r of results.filter((x) => x.page === "explorar")) {
    const o = r.order || {};
    const f = (k) => (o[k] ? `${k}@${o[k].top}` : `${k}=—`);
    console.log(`${String(r.viewport.w).padEnd(5)}px  ${f("objetivo")}  ${f("tarefa")}  ${f("instrucao")}  ${f("interacao")}  ${f("resposta")}`);
  }

  console.log("\n=== Alvos de toque < 40px (celular) ===");
  const tap = results.filter((x) => x.viewport.w <= 480 && x.tap && x.tap.length);
  if (!tap.length) console.log("nenhum");
  for (const r of tap) console.log(`${r.page} ${r.viewport.w}px: ${r.tap.map((t) => `${t.sel}(${t.w}x${t.h})`).join(" ")}`);

  console.log("\n=== Resumo ===");
  console.log(problems.length ? `${problems.length} cenário(s) com transbordamento horizontal.` : "Sem transbordamento horizontal.");
  return problems;
}

if (isMain) {
  const results = await runChecks();
  if (process.argv.includes("--json")) writeFileSync("qa-layout.json", JSON.stringify(results, null, 2));
  const problems = report(results);
  process.exit(problems.length ? 1 : 0);
}
