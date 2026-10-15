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

/* ---------- As peças do xadrez como regras de grafo (fase 1.5) ----------
   Cada peça tem de gerar um grafo não direcionado e sem laços, com a contagem de
   arestas prevista pela geometria do tabuleiro. Um erro aqui apareceria como
   "grau" errado na tela do estudante. */
const peca = (type, n = 5) => ({
  kind: "tabuleiro",
  rule: { type },
  structure: { rows: n, cols: n, active: G.allCells(n, n) },
});
const grafoDe = (type, n = 5) => G.graph.build(peca(type, n));
/* Um grafo não direcionado e sem laços: nenhuma casa aponta para si mesma. */
function semLacosSimetrico(g) {
  const temLaco = g.V.some((v) => g.adj[v].includes(v));
  const simetrico = g.V.every((v) => g.adj[v].every((w) => g.adj[w].includes(v)));
  const semRepeticao = g.V.every((v) => new Set(g.adj[v]).size === g.adj[v].length);
  const arestasCoerentes = g.E.every(([a, b]) => g.adj[a].includes(b) && g.adj[b].includes(a));
  const contagem = g.E.reduce((s, [, b]) => s + 1, 0) * 2 === g.V.reduce((s, v) => s + g.adj[v].length, 0);
  return { ok: !temLaco && simetrico && semRepeticao && arestasCoerentes && contagem, temLaco, simetrico, semRepeticao };
}

/* Arestas do bispo, calculadas da geometria: numa diagonal de comprimento L há
   L·(L−1)/2 pares de casas, e cada par é uma aresta (o bispo anda qualquer
   distância na diagonal). Somam-se as duas famílias de diagonais: 2n−1 em cada. */
function arestasDoBispo(n) {
  let total = 0;
  for (let d = 0; d < 2 * n - 1; d++) {
    const L = Math.min(n, d + 1) - Math.max(0, d - (n - 1));
    if (L > 1) total += (L * (L - 1)) / 2; // família ↘
    const L2 = Math.min(n, d + 1, 2 * n - 1 - d);
    if (L2 > 1) total += (L2 * (L2 - 1)) / 2; // família ↙
  }
  return total;
}

/* Arestas do rei, calculadas da geometria: cada casa do interior tem grau 8, cada
   casa de borda tem grau 5 e cada canto tem grau 3. Somando os graus e dividindo
   por 2 (cada aresta liga duas casas) chega-se ao número de arestas. */
function arestasDoRei(n) {
  let graus = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const bordas = (r === 0 || r === n - 1 ? 1 : 0) + (c === 0 || c === n - 1 ? 1 : 0);
      graus += bordas === 2 ? 3 : bordas === 1 ? 5 : 8;
    }
  return graus / 2;
}

test("cada peça gera um grafo simples, simétrico e com a contagem de arestas prevista", () => {
  const n = 5, total = n * n;
  const esperado = {
    /* Torre: cada casa liga-se a n−1 da sua linha e n−1 da sua coluna. */
    rook: (n * n * 2 * (n - 1)) / 2,
    bishop: arestasDoBispo(n),
    king: arestasDoRei(n),
  };
  for (const type of ["knight", "rook", "bishop", "queen", "king"]) {
    const g = grafoDe(type, n);
    const r = semLacosSimetrico(g);
    assert.ok(r.ok, `${type}: grafo inválido (laço=${r.temLaco}, simétrico=${r.simetrico}, sem repetição=${r.semRepeticao})`);
    assert.equal(g.V.length, total, `${type}: um vértice por casa`);
    assert.ok(g.E.length > 0, `${type}: tem arestas`);
    /* A lista de arestas tem de bater com a soma dos graus: nenhuma aresta perdida. */
    const somaGraus = g.V.reduce((s, v) => s + g.adj[v].length, 0) / 2;
    assert.equal(g.E.length, somaGraus, `${type}: arestas coerentes com os graus`);
  }
  assert.equal(grafoDe("rook", n).E.length, esperado.rook, "torre");
  assert.equal(grafoDe("bishop", n).E.length, esperado.bishop, "bispo");
  assert.equal(grafoDe("king", n).E.length, esperado.king, "rei");
  /* A dama é exatamente a soma da torre com o bispo. */
  assert.equal(
    grafoDe("queen", n).E.length,
    grafoDe("rook", n).E.length + grafoDe("bishop", n).E.length,
    "dama = torre + bispo",
  );
  /* O cavalo não ganha nem perde arestas em relação à enumeração dos oito saltos. */
  const c = grafoDe("knight", n);
  const saltos = G.rules.knight.offsets.length;
  assert.ok(c.E.length <= (total * saltos) / 2, "cavalo: no máximo os 8 saltos por casa");
});

test("o grau de uma casa depende só da peça, e o canto é o mais afetado", () => {
  const n = 8;
  const g = {
    knight: grafoDe("knight", n),
    rook: grafoDe("rook", n),
    bishop: grafoDe("bishop", n),
    queen: grafoDe("queen", n),
    king: grafoDe("king", n),
  };
  /* Canto A1 num 8×8: cavalo 2, torre 14, bispo 7, dama 21, rei 3. */
  assert.equal(g.knight.adj.A1.length, 2, "cavalo no canto");
  assert.equal(g.rook.adj.A1.length, 14, "torre no canto");
  assert.equal(g.bishop.adj.A1.length, 7, "bispo no canto");
  assert.equal(g.queen.adj.A1.length, 21, "dama no canto");
  assert.equal(g.king.adj.A1.length, 3, "rei no canto");
  assert.equal(g.queen.adj.A1.length, g.rook.adj.A1.length + g.bishop.adj.A1.length, "dama no canto = torre + bispo");
  /* Centro D4: torre 14, dama 27, rei 8. As peças que deslizam sentem mais a borda. */
  assert.equal(g.rook.adj.D4.length, 14, "torre no centro");
  assert.equal(g.queen.adj.D4.length, 27, "dama no centro");
  assert.equal(g.king.adj.D4.length, 8, "rei no centro");
  assert.ok(g.bishop.adj.D4.length > g.bishop.adj.A1.length, "o bispo alcança mais do centro");
});

test("o bispo nunca sai da cor da casa: o grafo dele tem duas componentes", () => {
  const n = 5, g = grafoDe("bishop", n);
  /* Duas componentes, uma por cor de casa — o resultado que a fase 1.5 explica. */
  const comps = G.graph.components(g);
  assert.equal(comps.length, 2, "bispo: duas componentes");
  for (const comp of comps) {
    const cores = new Set(comp.map((id) => {
      const [r, c] = [id.charCodeAt(0) - 65, Number(id.slice(1)) - 1];
      return (r + c) % 2;
    }));
    assert.equal(cores.size, 1, "cada componente do bispo tem uma única cor de casa");
  }
  /* E nenhum movimento direto entre cores diferentes. */
  for (const [a, b] of g.E) {
    const cor = (id) => (id.charCodeAt(0) - 65 + Number(id.slice(1)) - 1) % 2;
    assert.equal(cor(a), cor(b), "aresta do bispo liga casas da mesma cor");
  }
  /* Torre e rei, ao contrário, alcançam todo o tabuleiro. */
  assert.equal(G.graph.components(grafoDe("rook", n)).length, 1, "torre: conexo");
  assert.equal(G.graph.components(grafoDe("king", n)).length, 1, "rei: conexo");
});

test("casa ausente bloqueia quem desliza e não bloqueia o cavalo", () => {
  /* Um buraco em A2: a torre de A1 perde toda a coluna 1, o cavalo não perde nada. */
  const comBuraco = (type) => {
    const p = peca(type, 5);
    p.structure.active = p.structure.active.filter((id) => id !== "A2");
    return G.graph.build(p);
  };
  const torre = comBuraco("rook"), torreCheia = grafoDe("rook", 5);
  assert.ok(torre.adj.A1.length < torreCheia.adj.A1.length, "a torre perde movimentos com uma casa ausente");
  assert.ok(!torre.adj.A1.includes("A3"), "a torre não salta por cima do buraco");
  assert.ok(!torre.adj.A1.includes("A5"), "a torre não alcança além do buraco");
  /* O cavalo pula por cima: só o destino importa. */
  const cavalo = comBuraco("knight");
  assert.deepEqual(
    [...cavalo.adj.A1].sort(),
    [...grafoDe("knight", 5).adj.A1].sort(),
    "o cavalo não é afetado por um buraco que não é destino",
  );
});
