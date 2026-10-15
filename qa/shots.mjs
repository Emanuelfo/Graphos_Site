/* Captura de página inteira via CDP (o --screenshot do Chrome corta na dobra).
   Uso: node qa/shots.mjs [page:width:scrollTop, ...] [outDir]
   Ex.: node qa/shots.mjs explorar:390:0 explorar:390:560 index:390:0 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9341;
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const outDir = resolve(args.length > 1 && !args[args.length - 1].includes(":") ? args.pop() : "shots/qa");
const specs = args.length ? args : ["explorar:390:0"];
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "graphos-shots-"));
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

  let lastKey = "";
  for (const spec of specs) {
    const [page, width = "390", scroll = "0", height = "844"] = spec.split(":");
    const key = `${page}:${width}:${height}`;
    if (key !== lastKey) {
      await send("Emulation.setDeviceMetricsOverride", { width: +width, height: +height, deviceScaleFactor: 2, mobile: +width <= 480 });
      await send("Page.navigate", { url: `http://127.0.0.1:4180/${page}.html` });
      await sleep(1600);
      lastKey = key;
    }
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${+scroll}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
    await sleep(500);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = join(outDir, `${page}-${width}x${height}-y${scroll}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log("OK", file);
  }
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
