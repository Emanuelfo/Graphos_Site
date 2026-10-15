/* Captura de QA em tema claro: verifica contraste e legibilidade sem depender do tema escuro.
   Uso: node qa/shots-light.mjs <page:width:scroll:height> [outDir] */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9357;
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const outDir = resolve(args.length > 1 ? args.pop() : "shots/qa-light");
const specs = args.length ? args : ["explorar:390:0:844"];
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE = ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3"];

const profile = mkdtempSync(join(tmpdir(), "graphos-light-"));
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
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:4180/index.html" });
  await sleep(1200);
  await send("Runtime.evaluate", {
    expression: `(() => { localStorage.setItem('graphos.theme','light');
      const st = {v:1,prog:{},done:{},bonus:{},ach:{},reviews:{},legacy:false};
      ${JSON.stringify(DONE)}.forEach(id => { st.done[id] = {at: Date.now(), legacy:false}; });
      localStorage.setItem('graphos.jornada', JSON.stringify(st)); return true; })()`,
    returnByValue: true,
  });
  for (const spec of specs) {
    const [page, width = "390", scroll = "0", height = "844"] = spec.split(":");
    await send("Emulation.setDeviceMetricsOverride", { width: +width, height: +height, deviceScaleFactor: 2, mobile: +width <= 480 });
    await send("Page.navigate", { url: `http://127.0.0.1:4180/${page}.html` });
    await sleep(1700);
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${+scroll}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
    await sleep(400);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = join(outDir, `${page}-light-${width}x${height}-y${scroll}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log("OK", file);
  }
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
