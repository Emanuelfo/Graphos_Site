/* Verificação da página Aprender (Etapa 3).
   Confere, no desktop e no celular: nós e rótulos dentro do quadro, rótulo que não
   colide com outro nó, cabeçalhos de mundo presentes e na ordem, uma única ação
   principal, estado ativo pelo ícone e a folha de detalhes abrindo/fechando no celular.
   Uso: node qa/trail-check.mjs [base]  (servidor padrão em http://127.0.0.1:4180) */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://127.0.0.1:4180";
const PORT = 9412;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, detail = "") => { checks.push({ name, ok, detail }); console.log(`${ok ? "ok  " : "FALHA"} ${name}${detail ? ` — ${detail}` : ""}`); };

const GEOM = `(() => {
  const map = document.getElementById("jmap");
  const mb = map.getBoundingClientRect();
  const nodes = [...document.querySelectorAll("#jmap-worlds .node")].map((n) => {
    const dot = n.querySelector(".node-dot").getBoundingClientRect();
    const side = n.querySelector(".node-side").getBoundingClientRect();
    const name = n.querySelector(".node-name").getBoundingClientRect();
    return {
      id: n.dataset.id, st: [...n.classList].filter((c) => c.startsWith("is-")).join(","),
      dot: { l: dot.left, r: dot.right, t: dot.top, b: dot.bottom, cx: dot.left + dot.width / 2, cy: dot.top + dot.height / 2 },
      side: { l: side.left, r: side.right, t: side.top, b: side.bottom },
      name: { l: name.left, r: name.right, t: name.top, b: name.bottom },
      hasCheck: !!n.querySelector(".node-dot .icon"),
      label: n.getAttribute("aria-label"),
    };
  });
  return {
    vw: innerWidth,
    map: { l: mb.left, r: mb.right, t: mb.top + scrollY, h: mb.height },
    nodes,
    heads: [...document.querySelectorAll("#jmap-worlds .w-head")].map((h) => ({ world: h.dataset.world, top: Math.round(h.getBoundingClientRect().top + scrollY) })),
    ctas: [...document.querySelectorAll("#conteudo a.btn.p, #conteudo .btn.p")].map((b) => b.textContent.trim().slice(0, 24)),
    bars: document.querySelectorAll("#conteudo .bar").length,
    panel: !!document.getElementById("j-panel")?.textContent.trim(),
    edges: document.querySelectorAll("#jmap-edges path").length,
    docOverflow: document.documentElement.scrollWidth - innerWidth,
  };
})()`;

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
  const errs = [];
  ws.onmessage = (m) => {
    const g = JSON.parse(m.data);
    if (g.method === "Runtime.exceptionThrown") errs.push(String(g.params.exceptionDetails.exception?.description || g.params.exceptionDetails.text).slice(0, 160));
    if (g.id && pending.has(g.id)) { const p = pending.get(g.id); pending.delete(g.id); g.error ? p.rej(new Error(JSON.stringify(g.error))) : p.res(g.result); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  await send("Page.enable");
  await send("Runtime.enable");

  for (const [width, label] of [[1440, "desktop"], [390, "celular"]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width <= 480 });
    await send("Page.navigate", { url: `${BASE}/index.html` });
    await sleep(1600);
    const g = await evalJs(GEOM);
    const tag = `[${label}]`;

    check(`${tag} a trilha desenha os 18 nós e as arestas`, g.nodes.length === 18 && g.edges >= 17, `nós=${g.nodes.length} arestas=${g.edges}`);
    check(`${tag} a primeira fase aparece na primeira dobra`, g.nodes[0].dot.cy < 844, `y=${Math.round(g.nodes[0].dot.cy)}`);
    const outDot = g.nodes.filter((n) => n.dot.l < g.map.l - 1 || n.dot.r > g.map.r + 1);
    check(`${tag} nenhum nó sai do quadro`, outDot.length === 0, outDot.map((n) => n.id).join(","));
    const outName = g.nodes.filter((n) => n.name.l < g.map.l - 1 || n.name.r > g.map.r + 1);
    check(`${tag} nenhum rótulo sai do quadro`, outName.length === 0, outName.map((n) => `${n.id}(${Math.round(n.name.l)}..${Math.round(n.name.r)})`).join(" "));
    /* Rótulo não pode invadir outro nó (folga de 2px). */
    const hits = [];
    for (const a of g.nodes)
      for (const b of g.nodes) {
        if (a.id === b.id) continue;
        const overlap = a.name.l < b.dot.r - 2 && a.name.r > b.dot.l + 2 && a.name.t < b.dot.b - 2 && a.name.b > b.dot.t + 2;
        if (overlap) hits.push(`${a.id}->${b.id}`);
      }
    check(`${tag} nenhum rótulo invade outro nó`, hits.length === 0, hits.slice(0, 6).join(" "));
    const ordered = g.heads.every((h, i) => i === 0 || h.top > g.heads[i - 1].top);
    check(`${tag} os 5 mundos aparecem na ordem`, g.heads.length === 5 && ordered, g.heads.map((h) => `${h.world}@${h.top}`).join(" "));
    check(`${tag} uma única ação principal na página`, g.ctas.filter((t) => /Começar|Continuar/.test(t)).length === 1, g.ctas.join(" | "));
    check(`${tag} o progresso aparece em um lugar só`, g.bars === 1, `barras=${g.bars}`);
    check(`${tag} sem transbordamento horizontal`, g.docOverflow <= 2, `overflow=${g.docOverflow}`);
    /* Estado identificável sem depender de cor: concluída/bloqueada têm ícone. */
    const noIcon = g.nodes.filter((n) => (n.st.includes("is-done") || n.st.includes("is-locked")) && !n.hasCheck);
    check(`${tag} estados têm ícone, não só cor`, noIcon.length === 0, noIcon.map((n) => n.id).join(","));
    const anon = g.nodes.filter((n) => !n.label || n.label.length < 12);
    check(`${tag} todo nó tem nome acessível`, anon.length === 0, anon.map((n) => n.id).join(","));

    if (width <= 480) {
      /* Folha de detalhes: abre ao escolher uma fase e fecha pelo botão. */
      const before = await evalJs(`({ open: document.body.classList.contains("pd-open"), y: Math.round(document.getElementById("j-panel").getBoundingClientRect().top) })`);
      await evalJs(`document.querySelector('#jmap-worlds .node[data-id="1.2"]').click()`);
      await sleep(700);
      const open = await evalJs(`(() => { const p = document.getElementById("j-panel"); const b = p.getBoundingClientRect(); const cs = getComputedStyle(p); return { pd: document.body.classList.contains("pd-open"), y: Math.round(b.top), vh: innerHeight, vis: cs.visibility, title: p.querySelector(".pd-title")?.textContent.trim().slice(0, 30), cta: p.querySelector(".pd-cta .btn")?.textContent.trim().slice(0, 20) }; })()`);
      check(`${tag} a folha de detalhes abre com a fase escolhida`, open.pd && open.vis === "visible" && open.y < open.vh && /1\.2/.test(open.title || ""), JSON.stringify(open));
      /* A folha cresce com o conteúdo: nunca acima de 66svh, nunca colada no topo. */
      check(`${tag} a folha mantém o corpo legível`, open.y >= 80 && open.y < open.vh - 120, `topo=${open.y}`);
      await evalJs(`document.getElementById("pd-close").click()`);
      await sleep(500);
      const closed = await evalJs(`({ pd: document.body.classList.contains("pd-open"), vis: getComputedStyle(document.getElementById("j-panel")).visibility, foco: document.activeElement?.dataset?.id || null })`);
      check(`${tag} a folha fecha e devolve o foco ao nó`, !closed.pd && closed.vis === "hidden" && closed.foco === "1.2", JSON.stringify(closed));
      check(`${tag} a folha começa fechada`, !before.open, JSON.stringify(before));
    }
  }
  check("sem erros de console na trilha", errs.length === 0, errs[0] || "");
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
const fail = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - fail.length} ok, ${fail.length} falha(s).`);
if (fail.length) process.exitCode = 1;
