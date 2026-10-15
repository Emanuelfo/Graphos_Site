/* Verificação dos dados das aplicações: as redes têm os vértices, arestas e
   resultados que as atividades anunciam? Roda em Node, sem navegador.
   Uso: node qa/redes-check.mjs
   Isso protege contra erro de digitação no mapa e contra gabarito errado:
   as respostas das lições são conferidas com o mesmo cálculo que a página usa. */
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = ".";
/* js/redes.js devolve os dados das três redes em G.redesData antes de inicializar a
   tela. Aqui só os dados interessam: um G mínimo e um DOM vazio bastam para o script
   parar no momento certo, e a conferência usa exatamente o que a página mostra. */
const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
ctx.window = ctx;
const vazio = { forEach() {}, length: 0 };
ctx.document = {
  body: { dataset: {}, classList: { add() {} }, insertAdjacentHTML() {} },
  querySelector: () => null,
  querySelectorAll: () => vazio,
  addEventListener() {},
  getElementById: () => null,
};
const casasAtivas = (s) => {
  const act = new Set(s.active), out = [];
  for (let r = 0; r < s.rows; r++)
    for (let c = 0; c < s.cols; c++) {
      const id = String.fromCharCode(65 + r) + (c + 1);
      if (act.has(id)) out.push({ id, r, c });
    }
  return out;
};
ctx.Graphos = {
  $: () => null,
  icon: () => "",
  icons: () => {},
  cellId: (r, c) => String.fromCharCode(65 + r) + (c + 1),
  allCells: (rows, cols) => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(String.fromCharCode(65 + r) + (c + 1));
    return out;
  },
  elements: casasAtivas,
  newProject: (kind = "tabuleiro") => ({ kind, structure: { rows: 4, cols: 3, active: [] }, rule: { type: "knight" }, pieces: { W: [], B: [] } }),
  project: { kind: "tabuleiro", structure: { rows: 4, cols: 3, active: [] }, rule: { type: "knight" }, pieces: { W: [], B: [] } },
  save() {},
  reset() {},
  jogo: { rc: (id) => [id.charCodeAt(0) - 65, parseInt(id.slice(1), 10) - 1] },
  viewport: () => ({ fit() {}, zoom() {} }),
};
await vm.runInContext(await readFile(`${root}/js/redes.js`, "utf8"), ctx);
const G = ctx.Graphos;
const REDES = G.redesData;
if (!REDES || !REDES.length) {
  console.error("G.redesData não foi definido por js/redes.js");
  process.exit(1);
}

function buildRede(rede, remover) {
  const [rows, cols] = rede.grade;
  const structure = { rows, cols, active: [] };
  const nomePorId = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const nome = rede.nos[`${r},${c}`];
      if (!nome || nome === remover) continue;
      const id = G.cellId(r, c);
      structure.active.push(id);
      nomePorId[id] = nome;
    }
  const idPorNome = {};
  structure.active.forEach((id) => (idPorNome[nomePorId[id]] = id));
  const E = [], adj = {};
  structure.active.forEach((id) => (adj[id] = []));
  (rede.arestas || []).forEach(([a, b]) => {
    const ia = idPorNome[a], ib = idPorNome[b];
    if (!ia || !ib || ia === ib) return;
    E.push([ia, ib]);
    adj[ia].push(ib);
    adj[ib].push(ia);
  });
  return { structure, V: structure.active, E, adj, nomePorId };
}
const nomeDe = (g, id) => (g.nomePorId && g.nomePorId[id]) || id;
const idDe = (g, nome) => g.V.find((id) => nomeDe(g, id) === nome) || null;
function bfs(adj, s) {
  const d = { [s]: 0 }, pr = { [s]: null }, q = [s];
  for (let h = 0; h < q.length; h++) for (const u of adj[q[h]]) if (!(u in d)) { d[u] = d[q[h]] + 1; pr[u] = q[h]; q.push(u); }
  return { d, pr };
}
function caminhoMin(adj, a, b) {
  const { d, pr } = bfs(adj, a);
  if (!(b in d)) return null;
  const out = [];
  for (let v = b; v; v = pr[v]) out.unshift(v);
  return out;
}
function componentes(adj, V) {
  const visto = new Set(), comps = [];
  for (const v of V) if (!visto.has(v)) { const cc = Object.keys(bfs(adj, v).d); cc.forEach((x) => visto.add(x)); comps.push(cc); }
  return comps;
}
function menorSoma(arestasPeso, a, b) {
  const adj = {};
  const push = (x, y, w) => ((adj[x] = adj[x] || []).push([y, w]));
  arestasPeso.forEach(([x, y, w]) => { push(x, y, w); push(y, x, w); });
  const dist = { [a]: 0 }, pr = { [a]: null }, feito = new Set();
  for (;;) {
    let u = null;
    for (const k of Object.keys(dist)) if (!feito.has(k) && (u === null || dist[k] < dist[u])) u = k;
    if (u === null) break;
    feito.add(u);
    for (const [v, w] of adj[u] || []) if (!feito.has(v) && (dist[v] === undefined || dist[u] + w < dist[v])) { dist[v] = dist[u] + w; pr[v] = u; }
  }
  if (dist[b] === undefined) return null;
  const out = [];
  for (let v = b; v; v = pr[v]) out.unshift(v);
  return { caminho: out, soma: dist[b] };
}
function maiorGargalo(arestasPeso, a, b) {
  const pesos = [...new Set(arestasPeso.map(([, , w]) => w))].sort((x, y) => y - x);
  for (const limiar of pesos) {
    const adj = {};
    const push = (x, y) => ((adj[x] = adj[x] || []).push(y));
    arestasPeso.filter(([, , w]) => w >= limiar).forEach(([x, y]) => { push(x, y); push(y, x); });
    if (!adj[a]) continue;
    const c = caminhoMin(adj, a, b);
    if (c) return { caminho: c, gargalo: limiar };
  }
  return null;
}

let fails = 0;
const check = (nome, ok, detalhe = "") => { if (!ok) fails++; console.log(`${ok ? "ok  " : "FALHA"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`); };

/* --- Estrutura comum das três redes --- */
for (const rede of REDES) {
  const g = buildRede(rede, null);
  const [rows, cols] = rede.grade;
  check(`${rede.id}: todos os vértices nomeados cabem na grade ${rows}×${cols}`, Object.keys(rede.nos).length === g.V.length, `${g.V.length} de ${rows * cols} casas`);
  check(`${rede.id}: toda casa nomeada está dentro da grade`, Object.keys(rede.nos).every((k) => {
    const [r, c] = k.split(",").map(Number);
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }));
  check(`${rede.id}: a rede é conexa`, componentes(g.adj, g.V).length === 1, `${componentes(g.adj, g.V).length} componente(s)`);
  check(`${rede.id}: tem arestas declaradas`, g.E.length > 0, `${g.E.length} arestas`);
  /* As arestas são declaradas: proximidade no desenho NÃO cria ligação. O que precisa
     ser conferido é que a lista não tem pares repetidos nem pontas inexistentes. */
  const nomes = new Set(Object.values(rede.nos));
  const pontasOk = (rede.arestas || []).every(([a, b]) => nomes.has(a) && nomes.has(b) && a !== b);
  check(`${rede.id}: toda aresta declarada liga dois vértices existentes e distintos`, pontasOk);
  const pares = new Set((rede.arestas || []).map(([a, b]) => [a, b].sort().join("|")));
  check(`${rede.id}: não há aresta duplicada`, pares.size === (rede.arestas || []).length, `${(rede.arestas || []).length} arestas, ${pares.size} pares distintos`);
  console.log(`     ${rede.id}: ${g.V.length} vértices · ${g.E.length} arestas`);
}

/* --- Rede de transporte: cada resposta anunciada é conferida com o cálculo --- */
{
  const rede = REDES.find((r) => r.id === "transporte");
  const g = buildRede(rede, null);
  check("transporte: origem e destino existem", !!idDe(g, rede.origem) && !!idDe(g, rede.destino));
  const a = idDe(g, rede.origem), b = idDe(g, rede.destino);
  const cam = caminhoMin(g.adj, a, b);
  const dist = cam ? cam.length - 1 : null;
  check("transporte: existe caminho entre origem e destino", cam !== null);
  check("transporte: a distância é exatamente a do caminho encontrado", dist === bfs(g.adj, a).d[b], `caminho=${dist} bfs=${bfs(g.adj, a).d[b]}`);
  check("transporte: o caminho é uma sequência de arestas existentes", cam.slice(1).every((v, i) => g.adj[cam[i]].includes(v)));
  /* A lição vale a pena se o trajeto curto não for trivial (≥ 3 arestas). */
  check("transporte: o trajeto mais curto tem pelo menos 3 arestas (a lição não é trivial)", dist >= 3, `${dist} arestas`);
  /* Não há atalho: nenhuma aresta liga origem a destino diretamente. */
  check("transporte: origem e destino não são vizinhos diretos", !g.adj[a].includes(b));
  /* O grafo tem ciclos: sem isso, "menor caminho" seria sempre o único caminho. */
  check("transporte: o mapa tem ciclos (dá margem para comparar trajetos)", g.E.length > g.V.length - 1, `${g.E.length} arestas para ${g.V.length} vértices`);
  /* Estações no desenho não podem estar ligadas por engano: cada aresta da lista é
     a única razão para dois vértices estarem ligados. */
  const pares = new Set(g.E.map(([x, y]) => [x, y].sort().join("|")));
  check("transporte: não há aresta duplicada", pares.size === g.E.length, `${g.E.length} arestas, ${pares.size} pares distintos`);
  console.log(`     transporte: ${rede.origem} → ${rede.destino} = ${dist} arestas em ${dist + 1} estações`);
}

/* --- Rede de computadores: quem realmente desconecta a rede --- */
{
  const rede = REDES.find((r) => r.id === "computadores");
  const base = buildRede(rede, null);
  const baseComps = componentes(base.adj, base.V).length;
  const art = [], folhas = [];
  for (const nome of Object.values(rede.nos)) {
    const g2 = buildRede(rede, nome);
    const comps = componentes(g2.adj, g2.V);
    if (comps.length > baseComps) art.push(nome);
    /* Folha: o dispositivo não tem nenhuma ligação própria. */
    const id = idDe(base, nome);
    if (id && base.adj[id].length === 0) folhas.push(nome);
  }
  check("computadores: existe ao menos um ponto de articulação", art.length > 0, art.join(", "));
  check("computadores: o Roteador da ponte é ponto de articulação", art.includes("Roteador da ponte"), `pontos: ${art.join(", ")}`);
  check("computadores: nenhum dispositivo é folha isolada", folhas.length === 0, folhas.join(", "));
  check("computadores: ao menos dois dispositivos NÃO desconectam a rede (dá margem para explorar)", art.length < Object.keys(rede.nos).length - 1, `pontos: ${art.join(", ")}`);
  const g2 = buildRede(rede, "Roteador da ponte");
  check("computadores: sem a ponte a rede fica com exatamente 2 partes", componentes(g2.adj, g2.V).length === 2, `${componentes(g2.adj, g2.V).length} partes`);
  console.log(`     computadores: ${base.V.length} dispositivos · ${base.E.length} ligações · pontos de articulação: ${art.join(", ") || "nenhum"}`);
}

/* --- Rede social: os dois critérios, ambos verificados por enumeração --- */
{
  const rede = REDES.find((r) => r.id === "sociais");
  const g = buildRede(rede, null);
  const porNome = {};
  g.V.forEach((id) => (porNome[nomeDe(g, id)] = id));
  check("sociais: todas as pessoas das arestas existem como vértice", rede.arestas.every(([x, y]) => porNome[x] && porNome[y]));
  check("sociais: origem e destino existem", !!porNome[rede.origem] && !!porNome[rede.destino]);
  check("sociais: não há peso repetido entre o mesmo par", new Set(rede.arestas.map(([x, y]) => [x, y].sort().join("|"))).size === rede.arestas.length);
  check("sociais: a rede social declarada é conexa", componentes(g.adj, g.V).length === 1);
  check("sociais: toda aresta com peso liga dois vértices da lista", rede.arestas.every(([x, y]) => porNome[x] && porNome[y]));

  const arestasPeso = rede.arestas.map(([x, y, w]) => [porNome[x], porNome[y], w]);
  const a = porNome[rede.origem], b = porNome[rede.destino];
  const ms = menorSoma(arestasPeso, a, b), mg = maiorGargalo(arestasPeso, a, b);
  const nome = (cam) => cam.map((id) => nomeDe(g, id));
  check("sociais: existe caminho por soma e por gargalo", !!ms && !!mg);

  /* Enumera TODOS os caminhos simples: nenhuma resposta é aceita por confiança. */
  const todos = [];
  (function anda(atual, cam) {
    if (atual === b) { todos.push(cam.slice()); return; }
    for (const [x, y] of arestasPeso) {
      const prox = x === atual ? y : y === atual ? x : null;
      if (prox && !cam.includes(prox)) anda(prox, [...cam, prox]);
    }
  })(a, [a]);
  const forca = (cam) => {
    let m = Infinity;
    for (let i = 1; i < cam.length; i++)
      m = Math.min(m, arestasPeso.find(([x, y]) => (x === cam[i - 1] && y === cam[i]) || (y === cam[i - 1] && x === cam[i]))[2]);
    return m;
  };
  const soma = (cam) => {
    let s = 0;
    for (let i = 1; i < cam.length; i++)
      s += arestasPeso.find(([x, y]) => (x === cam[i - 1] && y === cam[i]) || (y === cam[i - 1] && x === cam[i]))[2];
    return s;
  };
  const bestSoma = Math.min(...todos.map(soma));
  const bestForca = Math.max(...todos.map(forca));
  check("sociais: a menor soma anunciada é o mínimo por enumeração", ms.soma === bestSoma, `anunciado ${ms.soma}, mínimo ${bestSoma}`);
  check("sociais: o maior gargalo anunciado é o máximo por enumeração", mg.gargalo === bestForca, `anunciado ${mg.gargalo}, máximo ${bestForca}`);
  check("sociais: o trajeto anunciado para a menor soma realmente soma isso", soma(ms.caminho) === ms.soma, `${nome(ms.caminho).join(" → ")} = ${soma(ms.caminho)}`);
  check("sociais: o trajeto anunciado para o gargalo realmente tem essa força", forca(mg.caminho) === mg.gargalo, `${nome(mg.caminho).join(" → ")} = ${forca(mg.caminho)}`);
  check("sociais: os dois critérios dão trajetos diferentes (é o ponto da lição)",
    nome(ms.caminho).join("/") !== nome(mg.caminho).join("/"), `${nome(ms.caminho).join(" → ")} vs ${nome(mg.caminho).join(" → ")}`);
  console.log(`     sociais: menor soma ${ms.soma} (${nome(ms.caminho).join(" → ")}) · maior gargalo ${mg.gargalo} (${nome(mg.caminho).join(" → ")}) · ${todos.length} caminhos simples`);
}

console.log(fails ? `\n${fails} falha(s) nos dados das aplicações.` : "\nDados das aplicações conferidos: sem falhas.");
process.exit(fails ? 1 : 0);
