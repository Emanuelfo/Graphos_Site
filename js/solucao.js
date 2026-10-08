/* Graphos — solução: busca da sequência de movimentos e visualização passo a passo. */
(function (G) {
  /* Troca de peças: as brancas terminam onde começaram as pretas e vice-versa.
     BFS no espaço de estados (conjuntos de casas ocupadas), logo o resultado é mínimo. */
  G.solveSwap = (g, pieces, cap = 400000) => {
    const idx = {};
    g.V.forEach((v, i) => (idx[v] = i));
    const W = pieces.W.map((v) => idx[v]), B = pieces.B.map((v) => idx[v]), A = g.V.map((v) => g.adj[v].map((u) => idx[u]));
    const key = (w, b) => [...w].sort((x, y) => x - y).join(',') + '|' + [...b].sort((x, y) => x - y).join(',');
    const start = key(W, B), goal = key(B, W);
    if (start === goal) return { moves: [], states: 1 };
    const parent = new Map([[start, null]]), queue = [[W, B, start]];
    for (let h = 0; h < queue.length; h++) {
      const [w, b, k0] = queue[h];
      if (parent.size > cap) return { error: 'limite', states: parent.size };
      const occ = new Set([...w, ...b]);
      for (const col of ['W', 'B']) {
        const mine = col === 'W' ? w : b;
        for (let j = 0; j < mine.length; j++) for (const to of A[mine[j]]) {
          if (occ.has(to)) continue;
          const w2 = w.slice(), b2 = b.slice();
          (col === 'W' ? w2 : b2)[j] = to;
          const k = key(w2, b2);
          if (parent.has(k)) continue;
          parent.set(k, { prev: k0, f: mine[j], t: to, c: col });
          if (k === goal) {
            const moves = [];
            for (let c = k; parent.get(c); c = parent.get(c).prev) { const s = parent.get(c); moves.push({ f: g.V[s.f], t: g.V[s.t], c: s.c }); }
            return { moves: moves.reverse(), states: parent.size };
          }
          queue.push([w2, b2, k]);
        }
      }
    }
    return { error: 'nosol', states: parent.size };
  };

  /* Descreve o problema a resolver e a posição inicial das peças. */
  function problem(p) {
    if (p.kind === 'cavalos') {
      if (!p.pieces.W.length || p.pieces.W.length !== p.pieces.B.length) return { error: 'A troca exige o mesmo número (≥ 1) de cavalos brancos e pretos. Ajuste na etapa 01 — Estrutura.' };
      return { tipo: 'troca', start: G.pieceMap(p) };
    }
    if (p.origin && p.dest && p.origin !== p.dest) return { tipo: 'caminho', start: { [p.origin]: 'W' } };
    return { error: 'Defina origem e destino na etapa 05 — Análise para encontrar um caminho.' };
  }

  function solve(p, g, prob) {
    if (prob.tipo === 'troca') return G.solveSwap(g, p.pieces);
    const path = G.graph.path(g, p.origin, p.dest);
    return path ? { moves: path.slice(1).map((t, i) => ({ f: path[i], t, c: 'W' })), states: null } : { error: 'nosol' };
  }

  const MSG = { limite: 'Espaço de estados grande demais para a busca exata no navegador (limite de 400 mil estados).', nosol: 'Não existe solução para esta configuração.' };

  function initPage() {
    const p = G.project;
    if (!G.requireStructure()) return;
    const g = G.graph.of(p), prob = problem(p), bsvg = G.$('#bsvg'), gsvg = G.$('#gsvg');
    G.geometry.ensure(p, g);
    let i = 0, timer = null, err = prob.error || '';
    const glyph = { W: '♘', B: '♞' };

    const moves = () => (p.solution ? p.solution.moves : []);
    /* Peças após os `i` primeiros movimentos. */
    function positions() {
      const m = { ...(prob.start || {}) };
      moves().slice(0, i).forEach((mv) => { delete m[mv.f]; m[mv.t] = mv.c; });
      return m;
    }
    function trail() { // arestas já percorridas e a do último movimento
      const used = new Set(), last = i ? moves()[i - 1] : null;
      moves().slice(0, i).forEach((mv) => { used.add(mv.f + '|' + mv.t); used.add(mv.t + '|' + mv.f); });
      return { used, last: last && new Set([last.f + '|' + last.t, last.t + '|' + last.f]) };
    }
    function trajectories() {
      const T = Object.entries(prob.start || {}).map(([v, c]) => ({ c, r: [v] }));
      moves().slice(0, i).forEach((mv) => { const k = T.find((x) => x.c === mv.c && x.r[x.r.length - 1] === mv.f); if (k) k.r.push(mv.t); });
      return T;
    }

    function draw() {
      const pcs = positions(), { used, last } = trail();
      const edgeCls = (a, b) => (last && last.has(a + '|' + b) ? ' p' : used.has(a + '|' + b) ? ' s' : '');
      const cls = (id) => { const mv = i ? moves()[i - 1] : null; return mv && (mv.t === id) ? ' pth' : ''; };
      const onlyUsed = g.E.filter(([a, b]) => used.has(a + '|' + b));
      G.board.render(bsvg, p, { edges: onlyUsed, edgeCls, cls, pieces: pcs });
      G.geometry.render(gsvg, p, g, { pieces: pcs, edgeCls, cls });
      G.$('#bcap').textContent = `${p.structure.rows}×${p.structure.cols}`;
      G.$('#gcap').textContent = `G = (${g.V.length}, ${g.E.length})`;
      panel();
    }

    function panel() {
      const box = G.$('#sol'), n = moves().length, isSwap = prob.tipo === 'troca';
      G.$('#sol-title').textContent = !prob.tipo ? 'Sem problema definido' : isSwap ? 'Troca de cavalos' : `Caminho ${p.origin} → ${p.dest}`;
      if (!prob.tipo) { box.innerHTML = `<p class="warn">${err}</p>`; return; }
      let h = `<div class="row"><button type="button" class="p" id="run">${p.solution ? 'Recalcular solução' : 'Encontrar solução'}</button></div>` +
        `<p class="mut">${isSwap ? 'Busca em largura nos estados do tabuleiro: o resultado é o menor número possível de movimentos.' : 'Caminho mínimo entre origem e destino (busca em largura).'}</p>`;
      if (err) h += `<p class="warn">${err}</p>`;
      if (p.solution) {
        h += `<dl class="kv"><div><dt>Movimentos</dt><dd class="ac">${n}</dd></div><div><dt>Passo atual</dt><dd>${i}/${n}</dd></div>${p.solution.states ? `<div><dt>Estados</dt><dd>${p.solution.states}</dd></div>` : ''}</dl>` +
          `<div class="pb"><button type="button" data-s="first" aria-label="Reiniciar">⏮</button><button type="button" data-s="-1" aria-label="Passo anterior">‹</button><button type="button" class="p" data-s="play" aria-label="Reproduzir">▶</button><button type="button" data-s="pause" aria-label="Pausar">⏸</button><button type="button" data-s="1" aria-label="Próximo passo">›</button></div>`;
        if (isSwap) h += `<div class="moves">${moves().map((m, j) => `<div data-j="${j + 1}" class="${j === i - 1 ? 'cur' : ''}">${j + 1}. ${glyph[m.c]} ${m.f} → ${m.t}</div>`).join('')}</div>` +
          `<h4>Trajetória de cada cavalo</h4><p class="mut">${trajectories().map((t) => `${glyph[t.c]} ${t.r.join(' → ')}`).join('<br>')}</p>`;
        else h += `<h4>Sequência</h4><p>${[p.origin, ...moves().map((m) => m.t)].map((v, j) => `<span class="${j <= i ? 'tag' : 'mut'}">${v}</span>`).join(' → ')}</p>`;
        h += `<div class="row"><button type="button" id="txt">Baixar movimentos</button></div>`;
      }
      box.innerHTML = h;
    }

    function run() {
      clearInterval(timer);
      const r = solve(p, g, prob);
      if (r.moves) { p.solution = { moves: r.moves, states: r.states }; err = ''; i = 0; G.save(); }
      else { p.solution = null; err = MSG[r.error] || MSG.nosol; }
      draw();
    }
    const step = (d) => { i = Math.max(0, Math.min(moves().length, i + d)); draw(); };
    G.$('#sol').addEventListener('click', (e) => {
      const b = e.target.closest('button'), row = e.target.closest('[data-j]');
      if (row) { clearInterval(timer); i = +row.dataset.j; return draw(); }
      if (!b) return;
      if (b.id === 'run') return run();
      if (b.id === 'txt') return G.download('movimentos.txt', moves().map((m, j) => `${j + 1}. ${m.c} ${m.f}->${m.t}`).join('\n'));
      const s = b.dataset.s;
      if (s === 'first') { clearInterval(timer); i = 0; draw(); }
      else if (s === 'pause') clearInterval(timer);
      else if (s === 'play') {
        clearInterval(timer); if (i >= moves().length) i = 0;
        timer = setInterval(() => { if (i >= moves().length) return clearInterval(timer); step(1); }, 700);
      } else if (s) { clearInterval(timer); step(+s); }
    });
    G.viewport(bsvg, { fit: () => G.board.fit(p.structure) });
    G.viewport(gsvg, { fit: () => G.geometry.fit(p.positions) });
    G.correspondence();
    if (prob.tipo && !p.solution && p.exampleId) run(); else draw();
  }

  if (document.body.dataset.page === 'solucao') initPage();
})(window.Graphos);
