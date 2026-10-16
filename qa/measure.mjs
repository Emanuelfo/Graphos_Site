/* Medição descartável para a Etapa 1 (diagnóstico): posição vertical dos blocos de
   interface e área útil do tabuleiro, em 390x844 e 1440x844.
   Uso: node qa/measure.mjs [out.json]   (exige o servidor em http://127.0.0.1:4180) */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9342;
const out = resolve(process.argv[2] || "shots/measure.json");
const specs = [
  ["index", 390, 844],
  ["index", 1440, 844],
  ["explorar", 390, 844],
  ["explorar", 1440, 844],
  ["lab", 390, 844],
  ["caminhos", 390, 844],
  ["troca", 390, 844],
  ["redes", 390, 844],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const box = (s) => { const el = q(s); if (!el) return null; const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) }; };
  const svg = q("svg.v");
  let boardContent = null, svgBox = null;
  if (svg) {
    const r = svg.getBoundingClientRect();
    svgBox = { top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) };
    const xs = [], ys = [];
    svg.querySelectorAll(".cell rect, .n circle").forEach((n) => {
      const b = n.getBoundingClientRect();
      if (!b.width && !b.height) return;
      xs.push(b.left, b.right); ys.push(b.top, b.bottom);
    });
    if (xs.length) boardContent = {
      w: Math.round(Math.max(...xs) - Math.min(...xs)),
      h: Math.round(Math.max(...ys) - Math.min(...ys)),
      clippedTop: Math.round(Math.min(...ys) - r.top),
      clippedBottom: Math.round(r.bottom - Math.max(...ys)),
      pieces: Math.round((Math.max(...xs) - Math.min(...xs)) / ((svg.querySelectorAll(".cell").length ? Math.sqrt(svg.querySelectorAll(".cell").length) : 5))),
    };
  }
  const blocks = {};
  [["chrome","#chrome"],[".shead",".shead"],["#fase-banner","#fase-banner"],["#ctask","#ctask"],
   [".ctask-bar",".ctask-bar"],["#fase-banner .fase-title","#fase-banner .fase-title"],
   ["svg.v","svg.v"],[".tools",".tools"],["#fb","#fb"],["#concepts","#concepts"],[".panel",".panel"],
   [".pager",".pager"],["#jmap-worlds","#jmap-worlds"],[".j-hero",".j-hero"],["#j-go","#j-go"],
   [".j-panel",".j-panel"],[".tool-grid",".tool-grid"],["#result","#result"]].forEach(([k,s]) => { const b = box(s); if (b) blocks[k] = b; });
  const firstNode = q(".node .node-dot");
  const belowFold = [];
  document.querySelectorAll("button, a.btn, input, select").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if (r.top + scrollY > innerHeight) belowFold.push(1);
  });
  return { url: location.pathname + location.search, vw: innerWidth, vh: innerHeight,
    docHeight: document.documentElement.scrollHeight,
    scrollW: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    blocks, svgBox, boardContent,
    firstNodeTop: firstNode ? Math.round(firstNode.getBoundingClientRect().top + scrollY) : null,
    controlsBelowFold: belowFold.length,
    controlsTotal: document.querySelectorAll("button, a.btn, input, select").length };
})()`;

const profile = mkdtempSync(join(tmpdir(), "graphos-measure-"));
const child = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let ws;
const results = [];
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch {}
    if (!target) await sleep(250);
  }
  ws = await new Promise((res, rej) => { const s = new WebSocket(target.webSocketDebuggerUrl); s.onopen = () => res(s); s.onerror = () => rej(new Error("ws")); });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => { const g = JSON.parse(m.data); if (g.id && pending.has(g.id)) { const p = pending.get(g.id); pending.delete(g.id); g.error ? p.rej(new Error(JSON.stringify(g.error))) : p.res(g.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  await send("Runtime.enable");
  for (const [page, width, height] of specs) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 480 });
    await send("Page.navigate", { url: `http://127.0.0.1:4180/${page}.html` });
    await sleep(1700);
    const r = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true });
    results.push({ page, width, height, ...r.result.value });
  }
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
writeFileSync(out, JSON.stringify(results, null, 2));
console.log("medido:", results.length, "páginas ->", out);
