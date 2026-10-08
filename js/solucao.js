/* Graphos / solução: busca da sequência de movimentos e visualização passo a passo. */
(function (G) {
  /* Troca de peças: as brancas terminam onde começaram as pretas e vice-versa.
     BFS no espaço de estados (conjuntos de casas ocupadas), logo o resultado é mínimo. */
  G.solveSwap = (g, pieces, cap = 400000) => {
    const idx = {};
    g.V.forEach((v, i) => (idx[v] = i));
    const W = pieces.W.map((v) => idx[v]),
      B = pieces.B.map((v) => idx[v]),
      A = g.V.map((v) => g.adj[v].map((u) => idx[u]));
    const key = (w, b) =>
      [...w].sort((x, y) => x - y).join(",") +
      "|" +
      [...b].sort((x, y) => x - y).join(",");
    const start = key(W, B),
      goal = key(B, W);
    if (start === goal) return { moves: [], states: 1 };
    const parent = new Map([[start, null]]),
      queue = [[W, B, start]];
    for (let h = 0; h < queue.length; h++) {
      const [w, b, k0] = queue[h];
      if (parent.size > cap) return { error: "limite", states: parent.size };
      const occ = new Set([...w, ...b]);
      for (const col of ["W", "B"]) {
        const mine = col === "W" ? w : b;
        for (let j = 0; j < mine.length; j++)
          for (const to of A[mine[j]]) {
            if (occ.has(to)) continue;
            const w2 = w.slice(),
              b2 = b.slice();
            (col === "W" ? w2 : b2)[j] = to;
            const k = key(w2, b2);
            if (parent.has(k)) continue;
            parent.set(k, { prev: k0, f: mine[j], t: to, c: col });
            if (k === goal) {
              const moves = [];
              for (let c = k; parent.get(c); c = parent.get(c).prev) {
                const s = parent.get(c);
                moves.push({ f: g.V[s.f], t: g.V[s.t], c: s.c });
              }
              return { moves: moves.reverse(), states: parent.size };
            }
            queue.push([w2, b2, k]);
          }
      }
    }
    return { error: "nosol", states: parent.size };
  };

  /* Descreve o problema a resolver e a posição inicial das peças. */
  function problem(p) {
    if (p.kind === "cavalos") {
      if (!p.pieces.W.length || p.pieces.W.length !== p.pieces.B.length)
        return {
          error:
            "A troca exige o mesmo número (≥ 1) de cavalos brancos e pretos. Ajuste na etapa 01 / Estrutura.",
        };
      return { tipo: "troca", start: G.pieceMap(p) };
    }
    if (p.origin && p.dest && p.origin !== p.dest)
      return { tipo: "caminho", start: { [p.origin]: "W" } };
    return {
      error:
        "Defina origem e destino na etapa 05 / Análise para encontrar um caminho.",
    };
  }

  function solve(p, g, prob) {
    if (prob.tipo === "troca") return G.solveSwap(g, p.pieces);
    const path = G.graph.path(g, p.origin, p.dest);
    return path
      ? {
          moves: path.slice(1).map((t, i) => ({ f: path[i], t, c: "W" })),
          states: null,
        }
      : { error: "nosol" };
  }

  const MSG = {
    limite:
      "Espaço de estados grande demais para a busca exata no navegador (limite de 400 mil estados).",
    nosol: "Não existe solução para esta configuração.",
  };

  function initPage() {
    G.initSolution({ problem, solve, messages: MSG });
  }

  if (document.body.dataset.page === "solucao") initPage();
})(window.Graphos);
