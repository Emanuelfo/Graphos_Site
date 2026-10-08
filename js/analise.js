/* Graphos — análise: propriedades matemáticas do grafo e caminho mínimo. */
(function (G) {
  /* Grau, componentes, ciclos independentes (μ = m − n + c), distâncias e diâmetro. */
  G.analyze = (g) => {
    const n = g.V.length, m = g.E.length, deg = g.V.map((v) => g.adj[v].length);
    const comps = G.graph.components(g), D = {};
    let diam = 0;
    for (const v of g.V) {
      D[v] = G.graph.bfs(g, v).d;
      for (const u in D[v]) diam = Math.max(diam, D[v][u]);
    }
    return {
      n, m, comps, D, diam, deg,
      dmin: Math.min(...deg), dmax: Math.max(...deg), davg: 2 * m / n,
      conn: comps.length === 1, cycles: m - n + comps.length,
      isolated: g.V.filter((v) => !g.adj[v].length),
    };
  };

  const matrixText = (g, sep) => [''].concat(g.V).join(sep) + '\n' + g.V.map((v) => [v].concat(g.V.map((u) => (g.adj[v].includes(u) ? 1 : 0))).join(sep)).join('\n');

  function initPage() {
    const p = G.project;
    if (!G.requireStructure()) return;
    const g = G.graph.of(p), A = G.analyze(g), svg = G.$('#gsvg'), rule = G.rule(p);
    G.geometry.ensure(p, g);
    const hubs = new Set(g.V.filter((v) => g.adj[v].length === A.dmax && A.dmax > 0));
    const pieces = p.kind === 'cavalos' ? G.pieceMap(p) : {};
    let sel = null;

    /* Painel fixo: métricas. */
    G.$('#stats').innerHTML = [['Vértices', A.n], ['Arestas', A.m], ['Componentes', A.comps.length], ['Grau mín.', A.dmin], ['Grau máx.', A.dmax], ['Grau médio', A.davg.toFixed(2)], ['Diâmetro', A.conn ? A.diam : '∞'], ['Ciclos indep.', A.cycles]]
      .map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join('');
    G.$('#cycles-note').textContent = A.cycles > 0 ? `Existem ciclos: o grafo contém ${A.cycles} ciclo(s) independente(s).` : 'Não existem ciclos: o grafo é uma floresta.';
    G.$('#conn-note').innerHTML = A.conn ? 'O grafo é conexo: existe caminho entre quaisquer dois vértices.' :
      `<span class="warn">Grafo desconexo: ${A.comps.length} componentes (tamanhos ${A.comps.map((c) => c.length).join(', ')})${A.isolated.length ? `; isolados: ${A.isolated.join(', ')}` : ''}.</span>`;
    G.$('#rule-note').textContent = rule.nota || '';
    const hist = {};
    A.deg.forEach((d) => (hist[d] = (hist[d] || 0) + 1));
    G.$('#hist').innerHTML = Object.keys(hist).sort((a, b) => a - b).map((d) => `<div><span>grau ${d}</span><i style="width:${hist[d] / A.n * 100}%"></i><span>${hist[d]}</span></div>`).join('');
    G.$('#matrix').innerHTML = `<table><tr><th></th>${g.V.map((v) => `<th>${v}</th>`).join('')}</tr>${g.V.map((v) => `<tr><th>${v}</th>${g.V.map((u) => `<td>${g.adj[v].includes(u) ? 1 : 0}</td>`).join('')}</tr>`).join('')}</table>`;
    G.$('#csv').addEventListener('click', () => G.download('adjacencia.csv', matrixText(g, ',')));
    G.$('#json').addEventListener('click', () => G.download('analise.json', JSON.stringify({ vertices: A.n, arestas: A.m, componentes: A.comps, ciclos_independentes: A.cycles, grau_min: A.dmin, grau_max: A.dmax, grau_medio: A.davg, diametro: A.conn ? A.diam : null, graus: Object.fromEntries(g.V.map((v) => [v, g.adj[v].length])) }, null, 1)));

    /* Origem e destino → caminho mínimo (persistido: usado na etapa Solução). */
    const opts = (cur) => '<option value="">—</option>' + g.V.map((v) => `<option${cur === v ? ' selected' : ''}>${v}</option>`).join('');
    const pathNow = () => (p.origin && p.dest && g.adj[p.origin] && g.adj[p.dest] ? G.graph.path(g, p.origin, p.dest) : null);
    function draw() {
      const path = pathNow(), nb = sel ? g.adj[sel] : [];
      const onPath = new Set(path || []), edges = new Set();
      (path || []).forEach((v, i) => { if (i) edges.add(path[i - 1] + '|' + v); });
      G.geometry.render(svg, p, g, {
        pieces,
        cls: (id) => (id === sel ? ' sel' : onPath.has(id) ? ' pth' : nb.includes(id) ? ' nb' : ''),
        edgeCls: (a, b) => (edges.has(a + '|' + b) || edges.has(b + '|' + a) ? ' p' : ''),
        classOf: (v) => (hubs.has(v) ? ' hub' : ''),
      });
      G.$('#gcap').textContent = `G = (${A.n}, ${A.m})`;
      G.$('#path-res').innerHTML = !p.origin || !p.dest ? '<span class="mut">Escolha origem e destino para ver o caminho mínimo.</span>'
        : path ? `<b>Distância: ${path.length - 1} ${path.length === 2 ? 'aresta' : 'arestas'}</b><br>${path.join(' → ')}`
          : '<span class="warn">Não há caminho: os vértices estão em componentes diferentes.</span>';
      G.$('#sel-info').innerHTML = sel ? `<b>${sel}</b> · grau ${g.adj[sel].length}<br>Vizinhos: ${g.adj[sel].join(', ') || '—'}` : '';
    }
    ['origin', 'dest'].forEach((k) => {
      const el = G.$('#' + k); el.innerHTML = opts(p[k]);
      el.addEventListener('change', () => { p[k] = el.value || null; p.solution = null; G.save(); draw(); });
    });
    G.viewport(svg, { fit: () => G.geometry.fit(p.positions), tap: (id) => { sel = sel === id ? null : id; draw(); } });
    draw();
  }

  if (document.body.dataset.page === 'analise') initPage();
})(window.Graphos);
