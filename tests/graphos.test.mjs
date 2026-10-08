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
  "geometria",
  "analise",
  "solucao",
])
  vm.runInContext(await readFile(`js/${name}.js`, "utf8"), context);
const G = context.window.Graphos,
  example = () => G.examples[0].build();
test("Original example retains 12 vertices, 14 edges and symmetric knight moves", () => {
  const p = example(),
    g = G.graph.of(p);
  assert.equal(g.V.length, 12);
  assert.equal(g.E.length, 14);
  const cells = Object.fromEntries(
    G.elements(p.structure).map((c) => [c.id, c]),
  );
  for (const [a, b] of g.E) {
    assert.ok(g.adj[b].includes(a));
    assert.equal(
      [Math.abs(cells[a].r - cells[b].r), Math.abs(cells[a].c - cells[b].c)]
        .sort()
        .join(","),
      "1,2",
    );
  }
});
test("Graph analysis retains known invariants", () => {
  const a = G.analyze(G.graph.of(example()));
  assert.equal(a.cycles, 3);
  assert.equal(a.diam, 5);
  assert.equal(a.dmin, 2);
  assert.equal(a.dmax, 3);
  assert.equal(a.conn, true);
});
test("BFS returns the minimum path and honors disconnected boards", () => {
  const p = example(),
    g = G.graph.of(p),
    path = G.graph.path(g, "A1", "D3");
  assert.equal(path.length, 4);
  path.slice(1).forEach((v, i) => assert.ok(g.adj[path[i]].includes(v)));
  p.structure.active = ["A1", "A2"];
  assert.equal(G.graph.path(G.graph.of(p), "A1", "A2"), null);
});
test("All geometry layouts preserve graph topology and have finite coordinates", () => {
  const p = example(),
    g = G.graph.of(p),
    edges = JSON.stringify(g.E);
  for (const name of ["grade", "circulo", "forca"]) {
    G.geometry.apply(p, g, name);
    assert.equal(Object.keys(p.positions).length, 12);
    assert.ok(Object.values(p.positions).flat().every(Number.isFinite));
    assert.equal(JSON.stringify(g.E), edges);
  }
});
test("Knight swap remains a valid minimum solution of 16 moves", () => {
  const p = example(),
    g = G.graph.of(p),
    result = G.solveSwap(g, p.pieces),
    map = G.pieceMap(p);
  assert.equal(result.moves.length, 16);
  for (const m of result.moves) {
    assert.equal(map[m.f], m.c);
    assert.equal(map[m.t], undefined);
    assert.ok(g.adj[m.f].includes(m.t));
    delete map[m.f];
    map[m.t] = m.c;
  }
  p.pieces.W.forEach((v) => assert.equal(map[v], "B"));
  p.pieces.B.forEach((v) => assert.equal(map[v], "W"));
});
test("Solver reports impossible positions and respects its state cap", () => {
  const p = example();
  p.structure.active = ["A1", "A2"];
  p.pieces = { W: ["A1"], B: ["A2"] };
  assert.equal(G.solveSwap(G.graph.of(p), p.pieces).error, "nosol");
  const q = example();
  assert.equal(G.solveSwap(G.graph.of(q), q.pieces, 1).error, "limite");
});
test("Structural edits invalidate geometry, endpoints and solution but preserve pieces", () => {
  G.project = example();
  G.project.solution = { moves: [{}] };
  G.project.positions = { A1: [0, 0] };
  G.reset("structure");
  assert.equal(G.project.solution, null);
  assert.equal(G.project.positions, null);
  assert.equal(G.project.origin, null);
  assert.equal(G.project.dest, null);
  assert.equal(G.project.pieces.W.length, 2);
  assert.equal(
    JSON.parse(storage.get("graphos.projeto")).structure.active.length,
    12,
  );
});
test("Single-vertex geometry stays finite and disconnected analysis remains valid", () => {
  const p = example();
  p.structure.active = ["A1"];
  const g = G.graph.of(p);
  G.geometry.apply(p, g, "forca");
  assert.ok(Object.values(p.positions).flat().every(Number.isFinite));
  p.structure.active = ["A1", "A2"];
  const a = G.analyze(G.graph.of(p));
  assert.equal(a.comps.length, 2);
  assert.equal(a.cycles, 0);
});
