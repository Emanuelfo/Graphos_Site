/* Sonda pontual (Etapa 2): com a página no fim, lista os controles cujo centro cai
   na faixa da barra inferior e quem está por cima deles.
   Uso: node qa/probe-cover.mjs <pagina> [largura] [base] */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [page = "index", width = "360", base = "http://127.0.0.1:4180"] = process.argv.slice(2);
const PORT = 9400 + (Number(width) % 7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "graphos-cover-"));
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
  await send("Emulation.setDeviceMetricsOverride", { width: +width, height: 844, deviceScaleFactor: 1, mobile: true });
  await send("Page.navigate", { url: `${base}/${page}.html` });
  await sleep(1500);
  await send("Runtime.evaluate", { expression: "document.querySelectorAll('details').forEach(d => d.open = true); window.scrollTo(0, document.documentElement.scrollHeight)" });
  await sleep(600);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const barEl = document.getElementById("nav-bar");
      const bar = barEl.getBoundingClientRect();
      const out = [];
      document.querySelectorAll("main a, main button, main input, main select, main summary, main textarea").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.width < 1 || b.height < 1) return;
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        if (cy < bar.top || cy > bar.bottom) return;
        const hit = document.elementFromPoint(cx, cy);
        out.push({
          tag: el.tagName + (el.id ? "#" + el.id : "") + (el.className ? "." + String(el.className).split(" ")[0] : ""),
          text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 34),
          cy: Math.round(cy), inBar: !!(hit && (hit === barEl || barEl.contains(hit))),
          hitTag: hit ? hit.tagName + (hit.id ? "#" + hit.id : "") + (hit.className ? "." + String(hit.className).split(" ")[0] : "") : null,
        });
      });
      const last = [...document.querySelectorAll("main *")].map((el) => ({ el, b: el.getBoundingClientRect() }))
        .filter((x) => x.b.width > 0 && x.b.height > 0).sort((a, c) => c.b.bottom - a.b.bottom).slice(0, 4)
        .map((x) => ({ tag: x.el.tagName + (x.el.id ? "#" + x.el.id : "") + (x.el.className ? "." + String(x.el.className).split(" ")[0] : ""), bottom: Math.round(x.b.bottom) }));
      return { bar: { top: Math.round(bar.top), bottom: Math.round(bar.bottom) }, inBand: out, lowest: last, docH: document.documentElement.scrollHeight, scrollY: Math.round(scrollY) };
    })()`,
    returnByValue: true,
  });
  console.log(page, width + "px", JSON.stringify(r.result.value, null, 1));
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
