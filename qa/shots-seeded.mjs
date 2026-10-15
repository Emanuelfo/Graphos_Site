/* Capturas com progresso semeado: permite ver páginas de fases que dependem de outras.
   Uso: node qa/shots-seeded.mjs <page:width:scroll:height> [outDir] */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9351;
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const outDir = resolve(args.length > 1 ? args.pop() : "shots/qa");
const specs = args.length ? args : ["redes:1440:0:1100"];
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* Tudo até 4.3 concluído: libera o mundo 5. */
const ATE_43 = ["1.1", "1.2", "1.3", "1.4", "1.5", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3"];
/* Só o começo do mundo 1: libera a fase 1.5 (peças como grafos). */
export const ATE_14 = ["1.1", "1.2", "1.3", "1.4"];
/* A lista de fases concluídas pode vir no primeiro argumento com prefixo `--done=`. */
const doneArg = process.argv.find((a) => a.startsWith("--done="));
export const DONE = doneArg
  ? (doneArg.slice(7) === "nenhuma" ? [] : doneArg.slice(7).split(",").filter(Boolean))
  : ATE_43;

const profile = mkdtempSync(join(tmpdir(), "graphos-seed-"));
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
  const errs = [];
  ws.onmessage = (m) => {
    const g = JSON.parse(m.data);
    if (g.id && pending.has(g.id)) { const p = pending.get(g.id); pending.delete(g.id); g.error ? p.rej(new Error(JSON.stringify(g.error))) : p.res(g.result); }
    else if (g.method === "Log.entryAdded" && g.params.entry.level === "error") errs.push(g.params.text || g.params.entry.text);
    else if (g.method === "Runtime.exceptionThrown") errs.push(g.params.exceptionDetails.text + " " + (g.params.exceptionDetails.exception?.description || ""));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");

  /* Semeia o progresso uma vez, na origem do site. */
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:4180/index.html" });
  await sleep(1200);
  await send("Runtime.evaluate", {
    expression: `(() => { const st = {v:1,prog:{},done:{},bonus:{},ach:{},reviews:{},legacy:false};
      ${JSON.stringify(DONE)}.forEach(id => { st.done[id] = {at: Date.now(), legacy:false}; });
      localStorage.setItem('graphos.jornada', JSON.stringify(st)); return true; })()`,
    returnByValue: true,
  });

  for (const spec of specs) {
    const [page, width = "1440", scroll = "0", height = "900"] = spec.split(":");
    await send("Emulation.setDeviceMetricsOverride", { width: +width, height: +height, deviceScaleFactor: 2, mobile: +width <= 480 });
    await send("Page.navigate", { url: `http://127.0.0.1:4180/${page}.html` });
    await sleep(1700);
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${+scroll}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
    await sleep(500);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = join(outDir, `${page}-seed-${width}x${height}-y${scroll}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log("OK", file);
  }
  if (errs.length) console.log("Erros de console:", errs.slice(0, 8).join(" | "));
  else console.log("Sem erros de console.");
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
