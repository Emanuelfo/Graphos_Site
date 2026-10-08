/* Graphos / regras: definem quais elementos da estrutura se relacionam.
   A regra não conhece a representação visual; só diz quem se conecta com quem. */
(function (G) {
  G.rules = {
    knight: {
      id: 'knight',
      nome: 'Movimento do cavalo',
      descricao: 'Dois passos numa direção e um na perpendicular, formando um “L”. Cada salto permitido liga duas casas.',
      nota: 'Cada salto de cavalo muda a cor da casa; por isso, casas da mesma cor ficam sempre a distância par.',
      offsets: [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]],
      /* Elementos relacionados a `el`. `at(r,c)` devolve o id do elemento ativo na posição, ou null.
         As regras devem ser simétricas (se A→B então B→A): o grafo é não direcionado. */
      related(el, at) {
        return this.offsets.map(([dr, dc]) => at(el.r + dr, el.c + dc)).filter(Boolean);
      },
    },
  };
  G.rule = (p) => G.rules[p.rule.type];

  /* ---------- Página: Regras ---------- */
  function initPage() {
    const p = G.project;
    if (!G.requireStructure()) return;
    const rule = G.rule(p), svg = G.$('#bsvg');
    let sel = null;

    const rows = rule.offsets.map(([dr, dc]) => `<tr><td>${dr > 0 ? '+' : ''}${dr}</td><td>${dc > 0 ? '+' : ''}${dc}</td></tr>`).join('');
    G.$('#rule-name').textContent = rule.nome;
    G.$('#rule-desc').textContent = rule.descricao;
    G.$('#rule-offsets').innerHTML = `<tr><th>Δ linha</th><th>Δ coluna</th></tr>${rows}`;
    G.$('#rule-preview').innerHTML = preview(rule);

    function neighbors(id) {
      const els = G.elements(p.structure), pos = new Map(els.map((e) => [e.r + ',' + e.c, e.id]));
      const el = els.find((e) => e.id === id);
      return el ? rule.related(el, (r, c) => pos.get(r + ',' + c) || null) : [];
    }
    function draw() {
      const nb = sel ? neighbors(sel) : [];
      G.board.render(svg, p, { cls: (id) => (id === sel ? ' sel' : nb.includes(id) ? ' nb' : '') });
      G.$('#bcap').textContent = `${p.structure.rows}×${p.structure.cols} · ${p.structure.active.length} casas`;
      G.$('#sel-info').innerHTML = sel
        ? `<b>${sel}</b> → ${nb.length ? nb.join(', ') : '<span class="mut">nenhuma casa alcançável</span>'}<br><span class="mut">${nb.length} ${nb.length === 1 ? 'relação' : 'relações'} a partir desta casa.</span>`
        : '<span class="mut">Toque numa casa para ver as casas que a regra liga a ela.</span>';
    }
    G.viewport(svg, { fit: () => G.board.fit(p.structure), tap: (id) => { if (!p.structure.active.includes(id)) return; sel = sel === id ? null : id; draw(); } });
    draw();
  }

  /* Miniatura 5×5: a peça no centro e as casas que a regra alcança. */
  function preview(rule) {
    const C = 28, hit = new Set(rule.offsets.map(([dr, dc]) => `${2 + dr},${2 + dc}`));
    let h = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const on = hit.has(`${r},${c}`), mid = r === 2 && c === 2;
      h += `<rect x="${c * C}" y="${r * C}" width="${C}" height="${C}" fill="${mid ? 'var(--ac)' : on ? 'var(--pur2)' : 'none'}" stroke="var(--line)"/>`;
    }
    return `<svg viewBox="-1 -1 ${5 * C + 2} ${5 * C + 2}" width="150" role="img" aria-label="Casas alcançadas pelo movimento">${h}</svg>`;
  }

  if (document.body.dataset.page === 'regras') initPage();
})(window.Graphos);
