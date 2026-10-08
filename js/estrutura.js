/* Graphos / estrutura: tabuleiro (renderização compartilhada) e editor da etapa 01. */
(function (G) {
  const C = 50; // lado de uma casa no sistema de coordenadas do SVG

  G.board = {
    fit: (s) => [-4, -4, s.cols * C + 8, s.rows * C + 8],
    center: (r, c) => [c * C + C / 2, r * C + C / 2],
    /* opções: cls(id), edges, edgeCls(a,b), vertices, pieces {id:'W'|'B'}, editable */
    render(svg, p, o = {}) {
      const { rows, cols, active } = p.structure, act = new Set(active), cls = o.cls || (() => '');
      const pieces = o.pieces || {}, xy = {};
      if (o.graph) { // grafo: um vértice circular por casa ativa, na posição da casa
        const els = G.elements(p.structure);
        els.forEach((e) => (xy[e.id] = G.board.center(e.r, e.c)));
        const ed = (o.edges || []).map(([a, b]) => `<line class="e${o.edgeCls ? o.edgeCls(a, b) : ''}" x1="${xy[a][0]}" y1="${xy[a][1]}" x2="${xy[b][0]}" y2="${xy[b][1]}"/>`);
        const hi = ed.filter((x) => /class="e (s|p)/.test(x)), lo = ed.filter((x) => !/class="e (s|p)/.test(x));
        const nodes = els.map((e) => `<g class="cell n ${pieces[e.id] || ''}${cls(e.id)}" data-id="${e.id}" tabindex="0" role="button" aria-label="Vértice ${e.id}"><circle cx="${xy[e.id][0]}" cy="${xy[e.id][1]}" r="17"/><text x="${xy[e.id][0]}" y="${xy[e.id][1] + 4}">${e.id}</text></g>`);
        svg.innerHTML = lo.join('') + hi.join('') + nodes.join('');
        return;
      }
      let cells = '', dots = '', pcs = '', outlines = '';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const id = G.cellId(r, c), on = act.has(id);
        xy[id] = G.board.center(r, c);
        cells += `<g class="cell${on ? cls(id) : ''}" data-id="${id}"${on || o.editable ? ` tabindex="0" role="button" aria-label="Casa ${id}${on ? '' : ' removida'}"` : ''}>` +
          `<rect x="${c * C}" y="${r * C}" width="${C}" height="${C}" class="${on ? ((r + c) % 2 ? 'dk' : 'lt') : 'void'}"/>` +
          (on ? `<text class="id" x="${c * C + 4}" y="${r * C + 11}">${id}</text>` : '') + '</g>';
        if (on && o.vertices) dots += `<circle class="vx" cx="${xy[id][0]}" cy="${xy[id][1]}" r="4.5"/>`;
        if (on && /\b(sel|nb|pth)\b/.test(cls(id))) outlines += `<g class="${cls(id)}" aria-hidden="true" pointer-events="none"><rect x="${c*C+1.5}" y="${r*C+1.5}" width="${C-3}" height="${C-3}" fill="none" rx="1"/></g>`;
        if (pieces[id]) pcs += G.knight(c * C + C * 0.1, r * C + C * 0.06, C * 0.8, pieces[id]).replace('<use ', `<use data-piece="${id}" `);
      }
      const edges = (o.edges || []).map(([a, b]) =>
        `<line class="e${o.edgeCls ? o.edgeCls(a, b) : ''}" x1="${xy[a][0]}" y1="${xy[a][1]}" x2="${xy[b][0]}" y2="${xy[b][1]}"/>`).join('');
      svg.innerHTML = cells + edges + dots + pcs + outlines;
    },
  };

  /* ---------- Página: Estrutura ---------- */
  function initPage() {
    const q = new URLSearchParams(location.search).get('modo');
    if (q === 'tabuleiro' || q === 'cavalos') { G.project = G.newProject(q); G.save(); history.replaceState(null, '', 'estrutura.html'); }
    const p = G.project, svg = G.$('#bsvg');
    let tool = 'cells';

    const num = (id) => +G.$('#' + id).value;
    const validDim = (r, c) => Number.isInteger(r) && Number.isInteger(c) && r >= 1 && c >= 1 && r <= 20 && c <= 20;

    function update() {
      const knights = p.kind === 'cavalos';
      if (!knights) tool = 'cells';
      document.querySelectorAll('#kind button').forEach((b) => { b.classList.toggle('on', b.dataset.kind === p.kind); b.setAttribute('aria-pressed', String(b.dataset.kind === p.kind)); });
      document.querySelectorAll('#tools button').forEach((b) => { b.classList.toggle('on', b.dataset.tool === tool); b.setAttribute('aria-pressed', String(b.dataset.tool === tool)); });
      G.$('#pieces').hidden = !knights;
      G.$('#rows').value = p.structure.rows; G.$('#cols').value = p.structure.cols;
      G.$('#count').textContent = `♘ ${p.pieces.W.length} brancos · ♞ ${p.pieces.B.length} pretos`;
      G.$('#bcap').textContent = `${p.structure.rows}×${p.structure.cols} · ${p.structure.active.length} casas`;
      G.board.render(svg, p, { editable: true, pieces: knights ? G.pieceMap(p) : {} });
    }

    function onTap(id) {
      const act = new Set(p.structure.active);
      if (tool === 'cells') {
        if (act.has(id)) { act.delete(id); p.pieces.W = p.pieces.W.filter((x) => x !== id); p.pieces.B = p.pieces.B.filter((x) => x !== id); }
        else act.add(id);
        p.structure.active = G.allCells(p.structure.rows, p.structure.cols).filter((x) => act.has(x));
        G.reset('structure');
      } else {
        if (!act.has(id)) return G.toast('Casa removida: ative-a antes de colocar um cavalo.');
        const had = p.pieces.W.includes(id) ? 'W' : p.pieces.B.includes(id) ? 'B' : null;
        p.pieces.W = p.pieces.W.filter((x) => x !== id); p.pieces.B = p.pieces.B.filter((x) => x !== id);
        if (had !== tool) p.pieces[tool].push(id);
        G.reset('pieces');
      }
      update();
    }

    function setDim(r, c) {
      if (!validDim(r, c)) return G.toast('Dimensões inválidas: use inteiros de 1 a 20.');
      p.structure = { rows: r, cols: c, active: G.allCells(r, c) };
      p.pieces = { W: [], B: [] };
      G.reset('structure'); vp.fit(); update();
    }

    /* Tabuleiro aleatório: remove uma porcentagem de casas e sorteia cavalos de cada cor. */
    function randomBoard() {
      const r = num('rr'), c = num('rc'), pct = num('rp'), k = num('rk');
      if (!validDim(r, c) || !(pct >= 0 && pct < 100)) return G.toast('Parâmetros inválidos.');
      const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((u, v) => u[0] - v[0]).map((x) => x[1]);
      const all = G.allCells(r, c), removed = new Set(shuffle(all).slice(0, Math.floor(all.length * pct / 100)));
      const active = all.filter((x) => !removed.has(x)), pick = shuffle(active), n = Math.min(k, Math.floor(active.length / 2));
      p.structure = { rows: r, cols: c, active };
      p.pieces = p.kind === 'cavalos' ? { W: pick.slice(0, n), B: pick.slice(n, 2 * n) } : { W: [], B: [] };
      G.reset('structure'); vp.fit(); update();
    }

    /* Texto: uma linha por fileira; # casa, . ausente, W/B cavalo. */
    const toText = () => {
      const m = G.pieceMap(p), act = new Set(p.structure.active);
      let s = '';
      for (let r = 0; r < p.structure.rows; r++) {
        for (let c = 0; c < p.structure.cols; c++) { const id = G.cellId(r, c); s += !act.has(id) ? '.' : m[id] || '#'; }
        s += '\n';
      }
      return s;
    };
    function fromText(t) {
      const ls = t.trim().split('\n').map((x) => x.trim()).filter(Boolean), rows = ls.length, cols = Math.max(0, ...ls.map((x) => x.length));
      if (!validDim(rows, cols)) return G.toast('Texto inválido: use de 1 a 20 linhas e colunas.');
      const active = [], W = [], B = [];
      ls.forEach((l, r) => [...l].forEach((ch, c) => {
        if (!'#WB'.includes(ch)) return;
        const id = G.cellId(r, c); active.push(id);
        if (ch === 'W') W.push(id); if (ch === 'B') B.push(id);
      }));
      p.structure = { rows, cols, active }; p.pieces = { W, B };
      G.reset('structure'); vp.fit(); update();
    }

    const vp = G.viewport(svg, { fit: () => G.board.fit(p.structure), tap: onTap });
    G.$('#mk').addEventListener('click', () => setDim(num('rows'), num('cols')));
    ['rows', 'cols'].forEach((id) => G.$('#' + id).addEventListener('keydown', (e) => { if (e.key === 'Enter') setDim(num('rows'), num('cols')); }));
    G.$('#kind').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { p.kind = b.dataset.kind; G.reset('pieces'); update(); } });
    G.$('#tools').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { tool = b.dataset.tool; update(); } });
    G.$('#clear-pieces').addEventListener('click', () => { p.pieces = { W: [], B: [] }; G.reset('pieces'); update(); });
    G.$('#gen').addEventListener('click', randomBoard);
    G.$('#cfg-show').addEventListener('click', () => { G.$('#cfg').value = toText(); });
    G.$('#cfg-apply').addEventListener('click', () => fromText(G.$('#cfg').value));
    G.$('#cfg-save').addEventListener('click', () => G.download('estrutura.txt', toText()));
    G.$('#reset').addEventListener('click', () => { setDim(p.structure.rows, p.structure.cols); G.toast('Estrutura redefinida.'); });
    if (p.exampleId) G.toast('Exemplo carregado: Problema dos Cavalos / Tabuleiro 3×4.');
    update();
  }

  if (document.body.dataset.page === 'estrutura') initPage();
})(window.Graphos);
