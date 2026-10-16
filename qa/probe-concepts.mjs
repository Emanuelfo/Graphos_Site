/* Sonda pontual: lista os controles de conceito e o estado da área de resposta.
   Uso: node qa/probe-concepts.mjs [pagina] [query] [largura] */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [page = "explorar", query = "?fase=2.1", width = "390"] = process.argv.slice(2);
const PORT = 9421;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "graphos-concepts-"));
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
    if (g.method === "Runtime.exceptionThrown") errs.push(String(g.params.exceptionDetails.exception?.description || g.params.exceptionDetails.text).slice(0, 200));
    if (g.id && pending.has(g.id)) { const p = pending.get(g.id); pending.delete(g.id); g.error ? p.rej(new Error(JSON.stringify(g.error))) : p.res(g.result); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +width, height: 844, deviceScaleFactor: 1, mobile: true });
  await send("Page.navigate", { url: `http://127.0.0.1:4180/${page}.html${query}` });
  await sleep(1600);
  const r = await send("Runtime.evaluate", {
    expression: `(() => ({
      page: document.body.dataset.page,
      temGraphos: typeof window.Graphos,
      temConcepts: !!document.getElementById("concepts"),
      workHTML: (document.querySelector(".work")?.innerHTML || "").slice(0, 120),
      conteudo: (document.getElementById("conteudo")?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 140),
      conceitos: [...document.querySelectorAll("#concepts [data-c]")].map((b) => b.dataset.c + ":" + b.textContent.replace(/\\s+/g," ").trim().slice(0,22)),
      ativo: document.querySelector("#concepts .concept.on")?.textContent.replace(/\\s+/g," ").trim().slice(0, 30),
      tarefa: document.querySelector("#ctask")?.textContent.replace(/\\s+/g," ").trim().slice(0, 90),
      resposta: (() => { const a = document.querySelector("#c-answer"); return a ? { hidden: a.hidden, html: a.innerHTML.slice(0, 80) } : null; })(),
      faseFaixa: document.querySelector("#fase-banner")?.textContent.replace(/\\s+/g," ").trim().slice(0, 110),
      anotacoes: document.querySelector("#fase-notes")?.textContent.replace(/\\s+/g," ").trim().slice(0, 60),
    }))()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(r.result.value, null, 1));
  if (errs.length) console.log("ERROS:", errs.join(" | "));
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
