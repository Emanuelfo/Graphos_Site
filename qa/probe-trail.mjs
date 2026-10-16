/* Sonda estrutural (Etapa 3): mostra o DOM e as posições reais da trilha.
   Uso: node qa/probe-trail.mjs [largura] [base] */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [width = "1440", base = "http://127.0.0.1:4180"] = process.argv.slice(2);
const PORT = 9411;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "graphos-trail-"));
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
  await send("Page.navigate", { url: `${base}/index.html` });
  await sleep(1600);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const rows = document.getElementById("jmap-worlds");
      const cs = getComputedStyle(rows);
      const heads = [...document.querySelectorAll("#jmap-worlds .w-head")].map((h) => {
        const b = h.getBoundingClientRect(), c = getComputedStyle(h);
        return { world: h.dataset.world, row: h.style.getPropertyValue("--row"), top: Math.round(b.top + scrollY), h: Math.round(b.height), w: Math.round(b.width), display: c.display, pos: c.position, text: h.textContent.replace(/\\s+/g," ").trim().slice(0,40) };
      });
      const nodes = [...document.querySelectorAll("#jmap-worlds .node")].slice(0, 4).map((n) => {
        const b = n.getBoundingClientRect(), d = n.querySelector(".node-dot").getBoundingClientRect();
        return { id: n.dataset.id, row: n.style.getPropertyValue("--row"), x: n.style.getPropertyValue("--x"), btnTop: Math.round(b.top + scrollY), btnH: Math.round(b.height), dotTop: Math.round(d.top + scrollY) };
      });
      return {
        rowsRect: { top: Math.round(rows.getBoundingClientRect().top + scrollY), h: Math.round(rows.getBoundingClientRect().height), w: Math.round(rows.getBoundingClientRect().width) },
        rowsStyle: { height: cs.height, rows: cs.getPropertyValue("--rows"), trailH: cs.getPropertyValue("--trail-h"), row: cs.getPropertyValue("--row"), position: cs.position },
        mapRect: (() => { const m = document.getElementById("jmap").getBoundingClientRect(); return { top: Math.round(m.top + scrollY), h: Math.round(m.height) }; })(),
        heads, nodes,
      };
    })()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(r.result.value, null, 1));
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
