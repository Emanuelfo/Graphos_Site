/* Sonda pontual (Etapa 2): mede a folga entre o último controle de uma página e a
   barra inferior. Uso: node qa/probe-gap.mjs <pagina> [largura] [base] */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [page = "estrutura", width = "360", base = "http://127.0.0.1:4180"] = process.argv.slice(2);
const PORT = 9335 + (Number(width) % 7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "graphos-gap-"));
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
  await sleep(500);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const bar = document.getElementById("nav-bar").getBoundingClientRect();
      const last = [...document.querySelectorAll("main a, main button, main input, main select, main summary, main textarea")]
        .map((el) => ({ el, b: el.getBoundingClientRect() }))
        .filter((x) => x.b.width > 0 && x.b.height > 0)
        .sort((a, c) => c.b.bottom - a.b.bottom)[0];
      return {
        barTop: Math.round(bar.top), barH: Math.round(bar.height),
        lastTag: last.el.tagName + "#" + (last.el.id || "") + "." + (last.el.className || "").toString().slice(0, 24),
        lastText: (last.el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 30),
        lastBottom: Math.round(last.b.bottom), lastTop: Math.round(last.b.top),
        gap: Math.round(bar.top - last.b.bottom),
        bodyPad: getComputedStyle(document.body).paddingBottom,
        wrapPad: getComputedStyle(document.querySelector(".wrap") || document.body).paddingBottom,
        docH: document.documentElement.scrollHeight, scrollY: Math.round(scrollY), vh: innerHeight,
      };
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
