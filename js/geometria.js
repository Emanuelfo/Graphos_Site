/* Graphos — geometria: posições dos vértices, disposições e desenho do grafo.
   As posições são independentes das conexões: mover um vértice nunca altera o grafo. */
(function (G) {
  const SIZE = 600, PAD = 50;

  /* Reescala posições para caber em [PAD, SIZE-PAD], preservando proporção. */
  function normalize(P, V) {
    const xs = V.map((v) => P[v][0]), ys = V.map((v) => P[v][1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    const k = (SIZE - 2 * PAD) / Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0, 1);
    V.forEach((v) => (P[v] = [PAD + (P[v][0] - x0) * k, PAD + (P[v][1] - y0) * k]));
    return P;
  }
  /* Gerador pseudoaleatório determinístico (mesma semente, mesma disposição). */
  const rng = (s) => () => (s = Math.imul(s ^ (s >>> 15), s | 1), s ^= s + Math.imul(s ^ (s >>> 7), s | 61), ((s ^ (s >>> 14)) >>> 0) / 4294967296);

  const layouts = {
    /* Posições do próprio tabuleiro. */
    grade(g, p) {
      const rc = {}; G.elements(p.structure).forEach((e) => (rc[e.id] = [e.c, e.r]));
      const P = {}; g.V.forEach((v) => (P[v] = rc[v].slice()));
      return normalize(P, g.V);
    },
    /* Vértices igualmente espaçados em uma circunferência. */
    circulo(g, p, order = g.V) {
      const P = {}, n = order.length;
      order.forEach((v, i) => (P[v] = [300 + 250 * Math.cos(2 * Math.PI * i / n - Math.PI / 2), 300 + 250 * Math.sin(2 * Math.PI * i / n - Math.PI / 2)]));
      return P;
    },
    /* Forças: vértices se repelem, arestas atraem (Fruchterman–Reingold). */
    forca(g, p) {
      const R = rng(p.seed * 7919 + 13), n = g.V.length, P = {};
      if (!n) return P;
      const k = Math.sqrt(520 * 520 / n) * 0.85;
      g.V.forEach((v, i) => { const a = 2 * Math.PI * i / n + R(); P[v] = [300 + 200 * Math.cos(a) * (0.4 + R()), 300 + 200 * Math.sin(a) * (0.4 + R())]; });
      const T = 420;
      for (let it = 0; it < T; it++) {
        const t = (1 - it / T) * 40 + 1, F = {};
        g.V.forEach((v) => (F[v] = [0, 0]));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const a = g.V[i], b = g.V[j];
          let dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1];
          const d = Math.hypot(dx, dy) || 0.01, f = k * k / d;
          dx /= d; dy /= d;
          F[a][0] += dx * f; F[a][1] += dy * f; F[b][0] -= dx * f; F[b][1] -= dy * f;
        }
        for (const [a, b] of g.E) {
          let dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1];
          const d = Math.hypot(dx, dy) || 0.01, f = d * d / k;
          dx /= d; dy /= d;
          F[a][0] -= dx * f; F[a][1] -= dy * f; F[b][0] += dx * f; F[b][1] += dy * f;
        }
        for (const v of g.V) {
          F[v][0] += (300 - P[v][0]) * 0.15; F[v][1] += (300 - P[v][1]) * 0.15;
          const d = Math.hypot(F[v][0], F[v][1]) || 1, m = Math.min(d, t);
          P[v][0] += F[v][0] / d * m; P[v][1] += F[v][1] / d * m;
        }
      }
      normalize(P, g.V);
      let min = Infinity; // evita vértices sobrepostos
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) min = Math.min(min, Math.hypot(P[g.V[i]][0] - P[g.V[j]][0], P[g.V[i]][1] - P[g.V[j]][1]));
      if (min < 30) g.V.forEach((v) => (P[v] = [300 + (P[v][0] - 300) * Math.min(30 / min, 2), 300 + (P[v][1] - 300) * Math.min(30 / min, 2)]));
      return P;
    },
  };

  /* Interseção própria entre os segmentos p1p2 e p3p4 (ponto ou null). */
  function intersect(p1, p2, p3, p4) {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
    const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    return t > 0 && t < 1 && u > 0 && u < 1 ? [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])] : null;
  }

  G.geometry = {
    layouts,
    /* Garante posições para todos os vértices (calcula se faltarem). */
    ensure(p, g) {
      if (!p.positions || g.V.some((v) => !p.positions[v])) {
        p.positions = (layouts[p.layout] || layouts.forca)(g, p);
        G.save();
      }
      return p.positions;
    },
    apply(p, g, name) { p.layout = name; p.positions = layouts[name](g, p); G.save(); },
    /* Pontos onde duas arestas sem vértice em comum se cruzam. */
    crossings(g, P) {
      const pts = [];
      for (let i = 0; i < g.E.length; i++) for (let j = i + 1; j < g.E.length; j++) {
        const [a, b] = g.E[i], [c, d] = g.E[j];
        if (a === c || a === d || b === c || b === d) continue;
        const q = intersect(P[a], P[b], P[c], P[d]);
        if (q) pts.push(q);
      }
      return pts;
    },
    fit(P) {
      const v = Object.values(P);
      if (!v.length) return [0, 0, SIZE, SIZE];
      const xs = v.map((q) => q[0]), ys = v.map((q) => q[1]), x0 = Math.min(...xs) - 40, y0 = Math.min(...ys) - 40;
      return [x0, y0, Math.max(Math.max(...xs) + 40 - x0, 200), Math.max(Math.max(...ys) + 40 - y0, 200)];
    },
    /* opções: cls(id), edgeCls(a,b), pieces, crossings, classOf(id) */
    render(svg, p, g, o = {}) {
      const P = p.positions, cls = o.cls || (() => ''), pieces = o.pieces || {};
      let h = g.E.map(([a, b]) => `<line class="e${o.edgeCls ? o.edgeCls(a, b) : ''}" x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}"/>`).join('');
      for (const v of g.V) {
        const [x, y] = P[v], k = pieces[v];
        h += `<g class="cell n ${k || ''}${cls(v)}${o.classOf ? o.classOf(v) : ''}" data-id="${v}" tabindex="0" role="button" aria-label="Vértice ${v}">` +
          `<circle cx="${x}" cy="${y}" r="18"/><text x="${x}" y="${y + 4}">${v}</text>${k ? G.knight(x + 4, y - 30, 24, k) : ''}</g>`;
      }
      if (o.crossings) h += o.crossings.map(([x, y]) => `<circle class="x" cx="${x}" cy="${y}" r="5"/>`).join('');
      svg.innerHTML = h;
    },
  };

  /* ---------- Página: Geometria ---------- */
  function initPage() {
    const p = G.project;
    if (!G.requireStructure()) return;
    const g = G.graph.of(p), bsvg = G.$('#bsvg'), gsvg = G.$('#gsvg'), pieces = p.kind === 'cavalos' ? G.pieceMap(p) : {};
    const comps = G.graph.components(g), compOf = {};
    comps.forEach((c, i) => c.forEach((v) => (compOf[v] = i)));
    let sel = null;
    G.geometry.ensure(p, g);

    const flag = (id) => G.$('#' + id).checked;
    function draw() {
      const nb = sel ? g.adj[sel] : [], cls = (id) => (id === sel ? ' sel' : nb.includes(id) ? ' nb' : '');
      const edgeCls = (a, b) => (sel && (a === sel || b === sel) ? ' s' : '');
      const X = G.geometry.crossings(g, p.positions);
      G.board.render(bsvg, p, { edges: flag('showE') ? g.E : [], edgeCls, cls, pieces });
      G.geometry.render(gsvg, p, g, {
        cls, edgeCls, pieces, crossings: flag('showX') ? X : null,
        classOf: flag('showC') && comps.length > 1 ? (v) => ` c${compOf[v] % 4}` : null,
      });
      G.$('#bcap').textContent = `${p.structure.rows}×${p.structure.cols} · ${p.structure.active.length} casas`;
      G.$('#gcap').textContent = `G = (${g.V.length}, ${g.E.length})`;
      G.$('#metrics').innerHTML = `<div><dt>Cruzamentos</dt><dd class="ac">${X.length}</dd></div><div><dt>Componentes</dt><dd>${comps.length}</dd></div><div><dt>Disposição</dt><dd style="font-size:18px;line-height:2">${({ grade: 'Grade', circulo: 'Círculo', forca: 'Forças' })[p.layout] || 'Manual'}</dd></div>`;
      document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === p.layout));
      G.$('#sel-info').innerHTML = sel
        ? `<b>${sel}</b> · grau ${g.adj[sel].length}<br>Vizinhos: ${g.adj[sel].join(', ') || '—'}`
        : '<span class="mut">Toque num vértice (ou casa) para destacar suas conexões.</span>';
    }
    const tap = (id) => { if (g.adj[id]) { sel = sel === id ? null : id; draw(); } };
    G.viewport(bsvg, { fit: () => G.board.fit(p.structure), tap });
    const gvp = G.viewport(gsvg, {
      fit: () => G.geometry.fit(p.positions), tap,
      drag: (id, x, y) => { p.positions[id] = [x, y]; p.layout = 'manual'; draw(); },
      dragEnd: G.save,
    });
    G.$('#layouts').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      G.geometry.apply(p, g, b.dataset.layout); gvp.fit(); draw();
    });
    G.$('#reshuffle').addEventListener('click', () => { p.seed++; G.geometry.apply(p, g, 'forca'); gvp.fit(); draw(); });
    ['showE', 'showX', 'showC'].forEach((id) => G.$('#' + id).addEventListener('change', draw));
    G.correspondence();
    draw();
  }

  if (document.body.dataset.page === 'geometria') initPage();
})(window.Graphos);
