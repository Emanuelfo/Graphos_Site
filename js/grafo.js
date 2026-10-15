/* Graphos / grafo: vértices, arestas e adjacências geradas a partir da estrutura + regra. */
(function (G) {
  let cache = { key: '', graph: null };

  G.graph = {
    /* Estrutura + regra → grafo { V, adj, E }. Um vértice por elemento, uma aresta por relação. */
    build(p) {
      const rule = G.rule(p), els = G.elements(p.structure);
      const pos = new Map(els.map((e) => [e.r + ',' + e.c, e.id]));
      const at = (r, c) => pos.get(r + ',' + c) || null;
      const adj = {};
      els.forEach((e) => (adj[e.id] = rule.related(e, at)));
      const V = els.map((e) => e.id), order = Object.fromEntries(V.map((v, i) => [v, i])), E = [];
      for (const a of V) for (const b of adj[a]) if (order[a] < order[b]) E.push([a, b]);
      return { V, adj, E };
    },
    /* Mesmo grafo enquanto estrutura e regra não mudarem. */
    of(p) {
      const s = p.structure, key = `${s.rows}x${s.cols}|${s.active.join()}|${p.rule.type}`;
      if (cache.key !== key) cache = { key, graph: G.graph.build(p) };
      return cache.graph;
    },
    /* Busca em largura: distâncias d e predecessores pr a partir de s. */
    bfs(g, s) {
      const d = { [s]: 0 }, pr = { [s]: null }, q = [s];
      for (let h = 0; h < q.length; h++) {
        for (const u of g.adj[q[h]]) if (!(u in d)) { d[u] = d[q[h]] + 1; pr[u] = q[h]; q.push(u); }
      }
      return { d, pr };
    },
    /* Caminho mínimo de a até b (lista de vértices) ou null. */
    path(g, a, b) {
      const { d, pr } = G.graph.bfs(g, a);
      if (!(b in d)) return null;
      const out = [];
      for (let v = b; v; v = pr[v]) out.unshift(v);
      return out;
    },
    /* Vértices de cada componente conexa. */
    components(g) {
      const seen = new Set(), comps = [];
      for (const v of g.V) if (!seen.has(v)) {
        const c = Object.keys(G.graph.bfs(g, v).d);
        c.forEach((x) => seen.add(x)); comps.push(c);
      }
      return comps;
    },
  };

  /* ---------- Página: Grafo ---------- */
  function initPage() {
    const p = G.project;
    if (!G.requireStructure()) return;
    const g = G.graph.of(p), svg = G.$('#bsvg'), pieces = p.kind === 'cavalos' ? G.pieceMap(p) : {};
    let sel = null;

    const nbrs = () => (sel ? g.adj[sel] : []);
    const edgeCls = (a, b) => (sel && (a === sel || b === sel) ? ' s' : '');
    function draw() {
      const nb = nbrs();
      G.board.render(svg, p, {
        edges: g.E, edgeCls, graph: true, pieces,
        cls: (id) => (id === sel ? ' sel' : nb.includes(id) ? ' nb' : ''),
      });
      G.$('#bcap').textContent = `G = (${g.V.length}, ${g.E.length})`;
      G.$('#adj').innerHTML = `<tr><th>Vértice</th><th>Grau</th><th>Vizinhos</th></tr>` +
        g.V.map((v) => `<tr data-id="${v}" class="${v === sel ? 'cur' : ''}"><td>${v}</td><td>${g.adj[v].length}</td><td>${g.adj[v].join(', ') || '-'}</td></tr>`).join('');
    }
    function summary() {
      const comps = G.graph.components(g), iso = g.V.filter((v) => !g.adj[v].length);
      G.$('#gsum').innerHTML = `<span class="tag">${g.V.length} vértices</span><span class="tag">${g.E.length} arestas</span>` +
        (p.kind === 'cavalos' ? '<p class="mut" style="margin-top:10px">Vértice claro: cavalo branco · escuro: cavalo preto.</p>' : '') +
        (comps.length > 1 ? `<p class="warn" style="margin-top:10px"><b>O grafo tem ${comps.length} componentes conexas${iso.length ? ` e ${iso.length} vértice(s) isolado(s)` : ''}.</b></p>` : '');
    }
    const select = (id) => { if (g.adj[id]) { sel = sel === id ? null : id; draw(); } };
    G.viewport(svg, { fit: () => G.board.fit(p.structure), tap: select });
    G.$('#adj').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) select(tr.dataset.id); });
    summary(); draw();
  }

  if (document.body.dataset.page === 'grafo') initPage();
})(window.Graphos);
