/* Sonda pontual: mede larguras de um conjunto de seletores numa página e largura dadas.
   Uso: node qa/probe.mjs <page> <width> <selector,selector,...> */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9339;
const [, , page = "explorar", width = "390", selsArg = ".wrap,.work,.viz,.ctask,.fase,.card,.cv,#bsvg"] = process.argv;
const sels = selsArg.split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "graphos-probe-"));
const child = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let ws;
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
  await send("Emulation.setDeviceMetricsOverride", { width: +width, height: 844, deviceScaleFactor: 1, mobile: +width <= 480 });
  await send("Page.navigate", { url: `http://127.0.0.1:4180/${page}.html` });
  await sleep(1500);
  const expr = `(() => {
    const sels = ${JSON.stringify(sels)};
    const vw = window.innerWidth;
    const out = { vw, docScrollW: document.documentElement.scrollWidth, rows: [] };
    for (const s of sels) {
      const el = document.querySelector(s);
      if (!el) { out.rows.push({ s, missing: true }); continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      let widest = null;
      for (const c of el.querySelectorAll('*')) {
        const cr = c.getBoundingClientRect();
        if (!widest || cr.right > widest.right) widest = { tag: c.tagName.toLowerCase() + (c.className && typeof c.className === 'string' ? '.' + c.className.trim().split(/\\s+/)[0] : ''), right: Math.round(cr.right), w: Math.round(cr.width) };
      }
      out.rows.push({ s, w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right),
        scrollW: el.scrollWidth, clientW: el.clientWidth, overflowX: cs.overflowX, display: cs.display,
        minWidth: cs.minWidth, gridCols: cs.gridTemplateColumns, widestChild: widest });
    }
    return out;
  })()`;
  const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  const v = res.result.value;
  console.log(`page=${page} width=${width} innerWidth=${v.vw} documentScrollWidth=${v.docScrollW}`);
  for (const r of v.rows) {
    if (r.missing) { console.log(`${r.s.padEnd(14)} (ausente)`); continue; }
    console.log(`${r.s.padEnd(14)} w=${String(r.w).padStart(4)} left=${String(r.left).padStart(4)} right=${String(r.right).padStart(4)} scrollW=${String(r.scrollW).padStart(4)} clientW=${String(r.clientW).padStart(4)} ovx=${r.overflowX} minW=${r.minWidth}`);
    if (r.gridCols) console.log(`               grid-cols=${r.gridCols}`);
    if (r.widestChild) console.log(`               filho mais largo: ${r.widestChild.tag} right=${r.widestChild.right} w=${r.widestChild.w}`);
  }
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
