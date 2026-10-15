/* Verificação funcional da atividade "Peças como grafos" (fase 1.5).
   Uso: node qa/pecas-check.mjs [base]
   Confere: as cinco peças existem, o grau na tela bate com a regra, trocar de peça
   altera o grafo, o caminho é calculado, e as duas evidências são registradas. */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://127.0.0.1:4180";
const PORT = 9361;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "graphos-pecas-"));
const child = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let ws, fails = 0, passes = 0;
const check = (n, ok, d = "") => { ok ? passes++ : fails++; console.log(`${ok ? "ok  " : "FALHA"} ${n}${d ? ` — ${d}` : ""}`); };
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page" && t.webSocketDebuggerUrl); } catch {}
    if (!target) await sleep(250);
  }
  ws = await new Promise((res, rej) => { const s = new WebSocket(target.webSocketDebuggerUrl); s.onopen = () => res(s); s.onerror = () => rej(new Error("ws")); });
  let id = 0;
  const pending = new Map(), errs = [];
  ws.onmessage = (m) => {
    const g = JSON.parse(m.data);
    if (g.id && pending.has(g.id)) { const p = pending.get(g.id); pending.delete(g.id); g.error ? p.rej(new Error(JSON.stringify(g.error))) : p.res(g.result); }
    else if (g.method === "Log.entryAdded" && g.params.entry.level === "error") errs.push(g.params.entry.text);
    else if (g.method === "Runtime.exceptionThrown") errs.push(g.params.exceptionDetails.exception?.description || g.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (e) => {
    const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description || ""));
    return r.result.value;
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${BASE}/pecas.html` });
  await sleep(1200);
  /* Libera a fase 1.5: as fases 1.1 a 1.4 concluídas. */
  await js(`(() => { const st={v:1,prog:{},done:{},bonus:{},ach:{},reviews:{},legacy:false};
    ["1.1","1.2","1.3","1.4"].forEach(id=>st.done[id]={at:Date.now(),legacy:false});
    localStorage.setItem('graphos.jornada', JSON.stringify(st)); return true; })()`);
  await send("Page.navigate", { url: `${BASE}/pecas.html?fase=1.5` });
  await sleep(1500);

  const barra = await js(`[...document.querySelectorAll('#peca [data-peca]')].map(b=>b.dataset.peca)`);
  check("as cinco peças aparecem na barra", barra.length === 5, barra.join(" "));
  check("a barra tem torre, bispo, dama, rei e cavalo", ["rook", "bishop", "queen", "king", "knight"].every((k) => barra.includes(k)));

  /* O grau mostrado no painel tem de ser o grau do motor para a peça escolhida. */
  const leitura = async () => js(`(() => {
    const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    const linhas = [...document.querySelectorAll('#pinfo > div')].map((d) => [
      d.querySelector('dt') ? d.querySelector('dt').textContent.trim() : '',
      d.querySelector('dd') ? d.querySelector('dd').textContent.trim() : ''
    ]);
    const pega = (rot) => { const l = linhas.find((x) => new RegExp(rot).test(x[0])); return l ? l[1] : null; };
    return { maior: pega('Maior grau'), menor: pega('Menor grau'), arestas: pega('Arestas'), comps: pega('Componentes'), peca: pega('Peça'), titulo: t('#pe-title') };
  })()`);
  /* Maior grau no painel num tabuleiro 5 × 5, por peça (calculado no motor).
     O bispo tem o maior grau nas casas do meio das diagonais longas: 8. */
  for (const [peca, esperado] of [["rook", "8"], ["bishop", "8"], ["queen", "16"], ["king", "8"], ["knight", "8"]]) {
    await js(`document.querySelector('#peca [data-peca="${peca}"]').click()`);
    await sleep(450);
    const r = await leitura();
    check(`${peca}: maior grau mostrado no painel é ${esperado}`, r.maior && r.maior.startsWith(esperado), `painel diz "${r.maior}"`);
  }
  /* O bispo tem 2 componentes; a torre tem 1. É o resultado central da atividade. */
  await js(`document.querySelector('#peca [data-peca="bishop"]').click()`);
  await sleep(400);
  const bispo = await leitura();
  check("bispo: painel mostra 2 componentes", bispo.comps === "2", bispo.comps);
  await js(`document.querySelector('#peca [data-peca="rook"]').click()`);
  await sleep(400);
  const torre = await leitura();
  check("torre: painel mostra 1 componente", torre.comps === "1", torre.comps);

  /* Tocar numa casa: usa o caminho de teclado (o mesmo `tap` do toque), porque
     eventos de ponteiro sintéticos não têm pointer ativo para setPointerCapture. */
  const toca = (id) => js(`(() => {
    const el = document.querySelector('#bsvg [data-id="${id}"]');
    if (!el) return false;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return true;
  })()`);

  /* Etapa 1: comparar graus em duas peças conclui a evidência pecas:graus. */
  check("a casa A1 existe no tabuleiro", (await toca("A1")) === true);
  await sleep(400);
  await js(`document.querySelector('#peca [data-peca="bishop"]').click()`);
  await sleep(350);
  await toca("A1");
  await sleep(600);
  const fbGraus = await js(`document.querySelector('#fb').textContent.replace(/\\s+/g,' ').trim()`);
  check("etapa 1 dá retorno ao comparar duas peças", /Comparação feita|grau/i.test(fbGraus), fbGraus.slice(0, 90));
  const prog1 = await js(`JSON.stringify(JSON.parse(localStorage.getItem('graphos.jornada')||'{}').prog||{})`);
  check("evidência pecas:graus registrada no progresso", /pecas:graus/.test(prog1), prog1);

  /* Etapa 2: o estudante precisa de um caminho visível para a segunda etapa.
     Confere que o botão existe e que ele leva à etapa 2. */
  const temBotaoEtapa = await js(`[...document.querySelectorAll('#ctask [data-etapa]')].map(b=>b.dataset.etapa)`);
  check("há um botão visível para ir à etapa 2", temBotaoEtapa.includes("1"), `botões: ${temBotaoEtapa.join(",")}`);
  await js(`document.querySelector('#ctask [data-etapa="1"]').click()`);
  await sleep(500);
  const etapaAtual = await js(`document.querySelector('#ctask .ctask-head').textContent.replace(/\\s+/g,' ').trim()`);
  check("o botão leva à etapa 2 (Caminhos de cada peça)", /Caminhos de cada peça/.test(etapaAtual), etapaAtual);
  /* Agora duas casas com caminho concluem a fase 1.5. */
  await toca("D3");
  await sleep(350);
  await toca("B3");
  await sleep(700);
  const fbCam = await js(`document.querySelector('#fb').textContent.replace(/\\s+/g,' ').trim()`);
  check("etapa 2 dá retorno com o caminho calculado", /caminho mais curto/i.test(fbCam), fbCam.slice(0, 120));
  const done15 = await js(`!!JSON.parse(localStorage.getItem('graphos.jornada')||'{}').done?.['1.5']`);
  check("a fase 1.5 é concluída ao conferir o caminho", done15 === true, `prog=${await js(`JSON.stringify(JSON.parse(localStorage.getItem('graphos.jornada')||'{}').prog||{})`)}`);
  /* O progresso também precisa destravar a fase seguinte da trilha. */
  const proxima = await js(`(() => { const j = window.Graphos.jornada; return j.status('2.1'); })()`);
  check("concluir 1.5 destrava a fase 2.1", proxima === "available", proxima);

  console.log(`\n${passes} verificações ok, ${fails} falha(s).`);
  console.log(errs.length ? `Erros de console: ${errs.slice(0, 4).join(" | ")}` : "Nenhum erro de console.");
} finally {
  try { ws && ws.close(); } catch {}
  child.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
process.exit(fails ? 1 : 0);
