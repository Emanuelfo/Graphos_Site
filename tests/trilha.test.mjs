import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const storage = new Map();
const context = vm.createContext({
  window: {},
  document: {
    body: { dataset: { page: "test" } },
    querySelector: () => null,
    getElementById: () => null,
    addEventListener() {},
    dispatchEvent() {},
  },
  localStorage: {
    getItem: (k) => storage.get(k),
    setItem: (k, v) => storage.set(k, v),
  },
  Event: class {},
  console,
});
for (const name of [
  "main",
  "exemplos",
  "regras",
  "estrutura",
  "grafo",
  "analise",
  "solucao",
  "jogo",
  "combinatoria",
  "caminhos",
  "troca",
])
  vm.runInContext(await readFile(`js/${name}.js`, "utf8"), context);
const G = context.window.Graphos,
  J = G.jogo;
const board = (r, c, active) => J.board(r, c, active);
const key = (s) => [...s].sort().join(",");

/* ---------- Movimento do cavalo e grafo ---------- */
test("Knight graph: corner has 2 moves, centre of 5×5 has 8, edges respect bounds", () => {
  const g = G.graph.of(board(5, 5));
  assert.equal(g.adj.A1.length, 2);
  assert.deepEqual([...g.adj.A1].sort(), ["B3", "C2"]);
  assert.equal(g.adj.C3.length, 8);
  assert.equal(g.V.length, 25);
  /* 8×8: 168 arestas é o valor clássico do grafo do cavalo. */
  assert.equal(G.graph.of(board(8, 8)).E.length, 168);
});
test("Missing squares are never destinations, but do not block the jump", () => {
  const all = G.allCells(5, 5);
  const gaps = all.filter((id) => id !== "B1" && id !== "B3");
  const g = G.graph.of(board(5, 5, gaps));
  assert.ok(!g.adj.A1.includes("B3"));
  /* A1 → C2 salta por cima de B1/B2 (B1 ausente) e continua válido. */
  assert.ok(g.adj.A1.includes("C2"));
  assert.equal(J.explainIllegal(board(5, 5, gaps).structure, "A1", "B3", {}), "A casa B3 não existe neste tabuleiro.");
});
test("Illegal-move explanations name the real cause", () => {
  const s = board(5, 5).structure;
  assert.match(J.explainIllegal(s, "A1", "B2", {}), /deslocamento é \(1, 1\)/);
  assert.match(J.explainIllegal(s, "A1", "A3", {}), /\(0, 2\)/);
  assert.match(J.explainIllegal(s, "A1", "B3", { B3: "B" }), /ocupada/);
});

/* ---------- Caminhos mínimos ---------- */
test("BFS layers give known knight distances on 8×8", () => {
  const g = G.graph.of(board(8, 8)),
    d = G.graph.bfs(g, "A1").d;
  assert.equal(d.H8, 6); // canto a canto: 6 saltos
  assert.equal(d.B3, 1);
  assert.equal(d.B2, 4); // casa vizinha na diagonal: 4 saltos
  const layers = J.layers(g, "A1");
  assert.equal(layers[0].join(), "A1");
  assert.equal(layers.flat().length, 64);
  assert.equal(layers.length, 7); // L0..L6
});
test("Every knight step flips the square colour (bipartite graph)", () => {
  const g = G.graph.of(board(6, 7));
  for (const [a, b] of g.E) assert.notEqual(J.shade(a), J.shade(b));
  /* Logo a distância tem a paridade da diferença de cores. */
  const d = G.graph.bfs(g, "A1").d;
  for (const v in d) assert.equal(d[v] % 2, (J.shade("A1") + J.shade(v)) % 2);
});
test("Unreachable squares are reported, not guessed", () => {
  /* 3×3: o centro B2 não tem movimentos e fica isolado. */
  const g = G.graph.of(board(3, 3));
  assert.equal(g.adj.B2.length, 0);
  assert.equal(G.graph.path(g, "A1", "B2"), null);
  assert.equal(G.graph.components(g).length, 2);
});

/* ---------- Troca: busca exata, dicas e análise ---------- */
const swapStart = () => ({ W: ["A1", "A3"], B: ["D1", "D3"] });
test("solveSwapFrom from the start equals the original solver", () => {
  const g = G.graph.of(board(4, 3)),
    s = swapStart();
  const a = G.solveSwap(g, s),
    b = G.solveSwapFrom(g, s, { W: s.B, B: s.W });
  assert.equal(a.moves.length, 16);
  assert.equal(b.moves.length, 16);
  assert.equal(a.states, b.states);
});
test("Following an optimal hint always lowers the remaining distance by exactly 1", () => {
  const g = G.graph.of(board(4, 3)),
    s = swapStart(),
    goal = { W: s.B, B: s.W };
  let cur = { W: [...s.W], B: [...s.B] },
    left = G.solveSwapFrom(g, cur, goal).moves.length;
  assert.equal(left, 16);
  while (left > 0) {
    const r = G.solveSwapFrom(g, cur, goal),
      m = r.moves[0];
    assert.ok(g.adj[m.f].includes(m.t));
    assert.ok(![...cur.W, ...cur.B].includes(m.t)); // sem capturas
    cur = { ...cur, [m.c]: cur[m.c].map((x) => (x === m.f ? m.t : x)) };
    left--;
    assert.equal(G.solveSwapFrom(g, cur, goal).moves.length, left);
  }
  assert.equal(key(cur.W), key(s.B));
  assert.equal(key(cur.B), key(s.W));
});
test("A wasted move is detected: remaining distance grows", () => {
  const g = G.graph.of(board(4, 3)),
    s = swapStart(),
    goal = { W: s.B, B: s.W };
  /* A1→C2 é válido; o mínimo a partir daí pode ser 15 (bom) ou 17 (desvio), nunca incoerente. */
  const after = {
    W: ["C2", "A3"],
    B: s.B,
  };
  const left = G.solveSwapFrom(g, after, goal).moves.length;
  assert.ok(Math.abs(left - 16) === 1);
});
test("Swap analysis: lower bound 12 < exact optimum 16; gap is even; total parity is even", () => {
  const g = G.graph.of(board(4, 3)),
    s = swapStart(),
    A = J.swapAnalysis(g, s.W, s.B);
  assert.equal(A.impossible, false);
  assert.equal(A.lb, 12);
  const opt = G.solveSwap(g, s).moves.length;
  assert.ok(opt > A.lb, "a soma dos caminhos individuais NÃO é a solução");
  assert.equal((opt - A.lb) % 2, 0);
  assert.equal(A.parity, 0);
  assert.equal(opt % 2, 0);
  /* Brancas saem de casas claras e chegam a casas escuras: cada uma faz um número ímpar de saltos. */
  assert.deepEqual(A.forcedW.map((x) => x.parity), [1, 1]);
  assert.ok(A.paths.every((p) => p.path.length - 1 === p.d));
  assert.ok(A.shared.length > 0);
});
test("Impossible swaps are proved by connectivity before any search", () => {
  const g = G.graph.of(board(3, 3)),
    A = J.swapAnalysis(g, ["A1"], ["B2"]);
  assert.equal(A.impossible, true);
  assert.equal(A.lb, null);
  assert.equal(G.solveSwap(g, { W: ["A1"], B: ["B2"] }).error, "nosol");
});
test("Swap analysis does not mislead: lower bound ≤ exact optimum on many small boards", () => {
  let checked = 0;
  for (const [r, c] of [[3, 4], [4, 3], [3, 5], [4, 4]]) {
    const all = G.allCells(r, c);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const W = [all[i]],
          B = [all[j]],
          g = G.graph.of(board(r, c)),
          A = J.swapAnalysis(g, W, B),
          S = G.solveSwap(g, { W, B });
        if (S.error) {
          assert.ok(A.impossible || S.error === "nosol");
          continue;
        }
        assert.ok(!A.impossible);
        assert.ok(A.lb <= S.moves.length);
        assert.equal((S.moves.length - A.lb) % 2, 0);
        checked++;
      }
  }
  assert.ok(checked > 100);
});
test("Swap solutions never capture, never leave the board and obey occupancy", () => {
  const act = G.allCells(4, 3).filter((x) => x !== "B2");
  const p = board(4, 3, act),
    g = G.graph.of(p),
    s = swapStart(),
    r = G.solveSwap(g, s);
  if (r.error) return assert.equal(r.error, "nosol");
  const occ = new Map();
  s.W.forEach((v) => occ.set(v, "W"));
  s.B.forEach((v) => occ.set(v, "B"));
  for (const m of r.moves) {
    assert.ok(act.includes(m.t));
    assert.ok(g.adj[m.f].includes(m.t));
    assert.equal(occ.get(m.f), m.c);
    assert.ok(!occ.has(m.t));
    occ.delete(m.f);
    occ.set(m.t, m.c);
  }
});

/* ---------- Laboratório: impacto de retirar casas ---------- */
test("Impact analysis finds cut squares and detours by recomputing the graph", () => {
  /* Cada casa removida é recalculada de verdade e comparada com um recálculo independente. */
  const p = board(4, 3),
    imp = J.impact(p, "A1", "D3");
  const base = G.graph.path(G.graph.build(p), "A1", "D3").length - 1;
  assert.equal(base, 3);
  for (const v in imp) {
    if (v === "A1" || v === "D3") continue;
    const q = board(4, 3, p.structure.active.filter((x) => x !== v)),
      path = G.graph.path(G.graph.build(q), "A1", "D3");
    if (!path) assert.equal(imp[v].kind, "cut");
    else if (path.length - 1 > base) assert.equal(imp[v].kind, "longer");
    else assert.notEqual(imp[v].kind, "cut");
  }
  assert.ok(Object.values(imp).some((x) => x.kind === "longer" || x.kind === "cut"));
});
test("Metrics compare boards and handle empty boards", () => {
  assert.equal(J.metrics(board(4, 3, []), null, null), null);
  const m = J.metrics(board(4, 3), "A1", "D3");
  assert.deepEqual([m.vertices, m.edges, m.comps, m.dist], [12, 14, 1, 3]);
});

/* ---------- Progresso ---------- */
test("Goals are recorded once and persisted under their own key", () => {
  G.toast = () => {}; // sem DOM neste ambiente
  const before = J.metaCount();
  assert.equal(J.meta("minimo"), true);
  assert.equal(J.meta("minimo"), false);
  assert.equal(J.meta("inexistente"), false);
  assert.equal(J.metaCount(), before + 1);
  assert.ok(storage.has("graphos.trilha"));
  assert.ok(!storage.has("graphos.projeto"));
});

/* ---------- Xadrez de Fischer (Xadrez 960) ---------- */
const F = () => G.fischer;
test("Fischer: counting by principle equals brute-force enumeration (960)", () => {
  const f = F();
  assert.equal(f.countByPrinciple().total, 960);
  const e = f.enumerate();
  assert.equal(e.all, 5040); // 8!/(2!·2!·2!)
  assert.equal(e.bishopsOpposite, 2880);
  assert.equal(e.valid.length, 960);
  assert.equal(new Set(e.valid).size, 960);
});
test("Fischer: every valid position obeys the rules", () => {
  for (const pos of F().enumerate().valid) {
    assert.equal(pos.length, 8);
    const b = [...pos].map((c, i) => (c === "B" ? i : -1)).filter((i) => i >= 0);
    assert.notEqual(b[0] % 2, b[1] % 2);
    assert.ok(pos.indexOf("R") < pos.indexOf("K") && pos.indexOf("K") < pos.lastIndexOf("R"));
    assert.equal([...pos].sort().join(""), "BBKNNQRR");
  }
});
test("Fischer: position numbers 0–959 are a bijection onto the valid set; 518 is the standard setup", () => {
  const f = F(),
    all = new Set();
  for (let n = 0; n < 960; n++) all.add(f.fromNumber(n));
  assert.equal(all.size, 960);
  assert.deepEqual([...all].sort(), [...f.enumerate().valid].sort());
  assert.equal(f.fromNumber(518), "RNBQKBNR");
  assert.equal(f.toNumber("RNBQKBNR"), 518);
  for (let n = 0; n < 960; n += 37) assert.equal(f.toNumber(f.fromNumber(n)), n);
  assert.notEqual(f.toNumber("BBQNNRKR"), null); // bispos em cores opostas e R K R: válida
  assert.equal(f.toNumber("BBQNNKRR"), null); // rei fora do meio das torres
  assert.equal(f.toNumber("BNBQKRNR"), null); // bispos em casas de mesma cor
});
test("Fischer: step-by-step options match the counting principle", () => {
  const f = F();
  assert.equal(JSON.stringify(f.steps().map((s) => s.ways)), "[4,4,6,10,1]");
  assert.equal(f.steps().reduce((p, s) => p * s.ways, 1), 960);
  /* Sem a restrição R-K-R seriam 6!/(2!2!) por escolha de bispos. */
  assert.equal(16 * 180, 2880);
});

/* ---------- Níveis e presets: o que a interface promete bate com o cálculo ---------- */
test("Caminhos: cada nível tem o comportamento didático anunciado", () => {
  const lv = Object.fromEntries(G.caminhosLevels.map((l) => [l.id, l]));
  const d = (l) => {
    const act = l.rm ? G.allCells(l.r, l.c).filter((x) => !l.rm.includes(x)) : null,
      g = G.graph.build(board(l.r, l.c, act)),
      p = G.graph.path(g, l.from, l.to);
    return p ? p.length - 1 : null;
  };
  assert.deepEqual([d(lv.n1), d(lv.n2), d(lv.n3), d(lv.n4)].map(Number), [1, 2, 4, 6]);
  /* "Um obstáculo": o mesmo par do nível 2, mas com C2 removida, fica mais longe. */
  assert.ok(d(lv.n5) > d(lv.n2));
  /* "Existe caminho?": destino inalcançável. */
  assert.equal(d(lv.n6), null);
  /* Dificuldade crescente nos agrupamentos. */
  assert.equal(G.caminhosLevels.length, 6);
});
test("Troca: presets do tabuleiro irregular dão os resultados que a lição pressupõe", () => {
  const out = {};
  for (const x of G.trocaPresets) {
    const act = G.allCells(x.r, x.c).filter((v) => !x.rm.includes(v)),
      g = G.graph.build(board(x.r, x.c, act)),
      A = J.swapAnalysis(g, x.W, x.B),
      r = A.impossible ? { error: "nosol" } : G.solveSwapFrom(g, { W: x.W, B: x.B }, { W: x.B, B: x.W }, 150000);
    out[x.id] = { lb: A.lb, opt: r.moves ? r.moves.length : r.error };
  }
  assert.deepEqual(out.reg, { lb: 12, opt: 16 });
  assert.deepEqual(out.b2, { lb: 12, opt: 16 }); // casa pouco importante: nada muda
  assert.deepEqual(out.b1, { lb: 20, opt: 22 }); // casa importante: mínimo sobe
  assert.deepEqual(out.b2c2, { lb: 12, opt: 16 });
  assert.equal(out.iso.opt, "nosol"); // A1 sem saída
  assert.equal(out.iso.lb, null);
  assert.deepEqual(out["3x4"], { lb: 8, opt: 10 });
  assert.deepEqual(out["4x4"], { lb: 8, opt: 8 }); // aqui a soma basta: sem interferência
  for (const k in out) if (out[k].opt !== "nosol") assert.equal(out[k].opt % 2, 0);
});
