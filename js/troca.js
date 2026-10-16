/* Graphos / troca: troca de cavalos brancos e pretos, sem capturas e com ordem livre de jogadas.
   Etapas: 1 regras · 2 investigar · 3 matemática · 4 tabuleiros irregulares.
   Mínimo exato = busca em largura no espaço de posições; limite inferior = soma das distâncias individuais. */
(function (G) {
  const PRESETS = [
    { id: "reg", nome: "Regular 4×3", r: 4, c: 3, rm: [], W: ["A1", "A3"], B: ["D1", "D3"] },
    { id: "b2", nome: "Sem B2", r: 4, c: 3, rm: ["B2"], W: ["A1", "A3"], B: ["D1", "D3"] },
    { id: "b1", nome: "Sem B1", r: 4, c: 3, rm: ["B1"], W: ["A1", "A3"], B: ["D1", "D3"] },
    { id: "b2c2", nome: "Sem B2 e C2", r: 4, c: 3, rm: ["B2", "C2"], W: ["A1", "A3"], B: ["D1", "D3"] },
    { id: "iso", nome: "A1 sem saída", r: 4, c: 3, rm: ["B3", "C2"], W: ["A1", "A3"], B: ["D1", "D3"] },
    { id: "3x4", nome: "Regular 3×4", r: 3, c: 4, rm: [], W: ["A1", "A4"], B: ["C1", "C4"] },
    { id: "4x4", nome: "Regular 4×4", r: 4, c: 4, rm: [], W: ["A1", "A4"], B: ["D1", "D4"] },
  ];
  G.trocaPresets = PRESETS;
  if (document.body.dataset.page !== "troca" || (G.fase && G.fase.blocked)) return;
  const J = G.jogo,
    $ = G.$,
    svg = $("#bsvg");
  const NAME = { W: "branco", B: "preto" },
    GL = { W: "♘", B: "♞" };

  let step = 1,
    view = "board",
    rows,
    cols,
    active,
    start,
    cur,
    log,
    attempts = [],
    sel = null,
    hint = 0,
    editing = false,
    replay = null, // { moves, i } ao rever a solução mínima
    analysis = null, // resultado da etapa 3/4
    flash = null,
    p,
    g,
    vp;
  const fb = (k, h) => J.say($("#fb"), k, h);
  const key = () => `${rows}x${cols}|${active.join()}|${start.W.join()}|${start.B.join()}`;
  const goal = () => ({ W: start.B, B: start.W });
  const occ = () => {
    const m = {};
    cur.W.forEach((v) => (m[v] = "W"));
    cur.B.forEach((v) => (m[v] = "B"));
    return m;
  };
  const same = (a, b) => [...a].sort().join() === [...b].sort().join();
  const solved = () => same(cur.W, goal().W) && same(cur.B, goal().B);
  const home = () => cur.W.filter((v) => goal().W.includes(v)).length + cur.B.filter((v) => goal().B.includes(v)).length;
  const total = () => start.W.length + start.B.length;
  const space = () => J.stateSpace(active.length, start.W.length, start.B.length);
  const irregular = () => active.length < rows * cols;

  function setConfig(c) {
    rows = c.r;
    cols = c.c;
    active = G.allCells(rows, cols).filter((x) => !(c.rm || []).includes(x));
    start = { W: [...c.W], B: [...c.B] };
    p = J.board(rows, cols, active);
    g = G.graph.of(p);
    attempts = [];
    analysis = null;
    reset(false);
  }
  function reset(record = true) {
    if (record && log && log.length && !solved()) attempts.push({ n: log.length, ok: false });
    cur = { W: [...start.W], B: [...start.B] };
    log = [];
    sel = null;
    hint = 0;
    replay = null;
    draw();
  }
  /* Estrutura editada à mão (etapa 4): peças e histórico recomeçam. */
  function structureChanged() {
    p = J.board(rows, cols, active);
    g = G.graph.of(p);
    analysis = null;
    attempts = [];
    reset(false);
  }

  /* ---------- Desenho ---------- */
  function draw() {
    const pcs = replay ? replayPieces() : occ(),
      legal = sel && !replay ? g.adj[sel].filter((x) => !pcs[x]) : [];
    const ov = analysis && analysis.paths ? analysis.paths.flatMap((q) => q.path.slice(1).map((v, i) => [q.path[i], v])) : [];
    const isOv = (a, b) => ov.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const shared = new Set(analysis && analysis.shared && step >= 3 ? analysis.shared : []);
    G.board.render(svg, p, {
      graph: view === "graph",
      edges: view === "graph" ? g.E : step >= 3 ? ov : [],
      edgeCls: (a, b) => (isOv(a, b) && step >= 3 ? " p" : sel && (a === sel || b === sel) ? " s" : ""),
      pieces: pcs,
      editable: editing,
      cls: (id) => (id === flash ? " pth" : id === sel ? " sel" : legal.includes(id) ? " nb" : shared.has(id) ? " nb" : ""),
    });
    const now = replay ? { W: [], B: [] } : cur;
    J.marks(svg, p.structure, [
      ...start.B.map((id) => ({ id, kind: "W", hit: !replay && now.W.includes(id) })),
      ...start.W.map((id) => ({ id, kind: "B", hit: !replay && now.B.includes(id) })),
    ]);
    $("#bcap").textContent = `${rows}×${cols} · ${active.length} casas${irregular() ? " (irregular)" : ""}`;
    const n = replay ? replay.i : log.length;
    $("#score").innerHTML =
      `<div><dt>Movimentos</dt><dd class="ac">${n}</dd></div><div><dt>No lugar</dt><dd>${replay ? "·" : `${home()}/${total()}`}</dd></div><div><dt>Tentativa</dt><dd>${attempts.length + 1}</dd></div>`;
    $("#undo").disabled = !!replay || !log.length;
    $("#restart").disabled = !!replay;
    document.querySelectorAll("#view button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    document.querySelectorAll("#steps button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.step === step)));
    const lg = $("#movelog");
    if (lg) lg.innerHTML = logHtml();
  }
  function replayPieces() {
    const m = {};
    start.W.forEach((v) => (m[v] = "W"));
    start.B.forEach((v) => (m[v] = "B"));
    replay.moves.slice(0, replay.i).forEach((x) => {
      delete m[x.f];
      m[x.t] = x.c;
    });
    return m;
  }

  /* ---------- Jogadas ---------- */
  function tap(id) {
    if (replay) return;
    if (editing) return toggleCell(id);
    const o = occ();
    if (!g.adj[id] && !o[id]) return fb("bad", J.explainIllegal(p.structure, sel || id, id, o));
    if (o[id]) {
      sel = sel === id ? null : id;
      const nb = sel ? g.adj[sel].filter((x) => !o[x]) : [];
      fb("info", sel ? `Cavalo ${NAME[o[id]]} em <b>${id}</b>. Saltos livres: ${J.list(nb)}.` : "Seleção removida.");
      return draw();
    }
    if (!sel) return fb("info", "Primeiro toque num cavalo, depois na casa de destino.");
    if (!g.adj[sel].includes(id) || o[id]) {
      flash = id;
      fb("bad", J.explainIllegal(p.structure, sel, id, o));
      draw();
      setTimeout(() => {
        flash = null;
        draw();
      }, 600);
      return;
    }
    const c = o[sel];
    cur[c] = cur[c].map((v) => (v === sel ? id : v));
    log.push({ c, f: sel, t: id });
    sel = null;
    hint = 0;
    if (solved()) return onSolved();
    fb("info", `Movimento ${log.length}: ${GL[c]} ${log.at(-1).f} → <b>${id}</b>. ${home()} de ${total()} cavalos no lugar.`);
    draw();
    if (step >= 2) renderPanel();
  }
  function onSolved() {
    attempts.push({ n: log.length, ok: true });
    J.meta("troca");
    const o = optFor();
    let msg = `Troca concluída em <b>${log.length}</b> movimentos. `;
    let kind = "ok";
    if (o && o.res.moves) {
      const m = o.res.moves.length;
      if (log.length === m) {
        msg += `Esse é o mínimo (${m}): nenhuma troca válida usa menos movimentos.`;
        J.meta("troca-minimo");
      } else {
        msg += `O mínimo é ${m}; você usou ${log.length - m} a mais. Isso é normal: encontrar uma solução é diferente de provar que ela é a menor. Reinicie e compare estratégias.`;
        kind = "info";
      }
    } else msg += "O mínimo não foi calculado para este tamanho.";
    fb(kind, msg);
    draw();
    renderPanel();
  }
  function toggleCell(id) {
    const o = occ();
    if (o[id]) return fb("bad", `A casa ${id} tem um cavalo: não é possível removê-la.`);
    active = active.includes(id) ? active.filter((x) => x !== id) : G.allCells(rows, cols).filter((x) => x === id || active.includes(x));
    structureChanged();
    fb("info", `${id} ${active.includes(id) ? "restaurada" : "removida"}. O grafo foi recalculado: ${g.V.length} vértices e ${g.E.length} arestas.`);
    renderPanel();
  }

  /* ---------- Cálculo exato ---------- */
  const memo = {};
  function optFor() {
    const k = key();
    if (memo[k]) return memo[k];
    if (space() > J.HINT_LIMIT * 2) return null;
    const A = J.swapAnalysis(g, start.W, start.B),
      res = A.impossible ? { error: "nosol", states: 0, conn: true } : G.solveSwapFrom(g, start, goal(), J.CAP);
    return (memo[k] = { A, res });
  }
  const lbNow = () => {
    const a = J.matching(g, cur.W, goal().W),
      b = J.matching(g, cur.B, goal().B);
    return a && b ? a.cost + b.cost : null;
  };
  function giveHint() {
    hint = Math.min(3, hint + 1);
    const left = total() - home();
    if (hint === 1) {
      const lb = lbNow();
      return fb("info", lb === Infinity ? "<b>Dica 1.</b> Algum cavalo não consegue chegar a nenhuma casa de destino: não há solução a partir daqui." : `<b>Dica 1.</b> ${left} de ${total()} cavalos ainda estão fora do lugar. Se cada um andasse sozinho, faltariam pelo menos <b>${lb}</b> saltos (soma das distâncias individuais). É um piso, não a resposta: um cavalo pode bloquear outro.`);
    }
    if (space() > J.HINT_LIMIT) return fb("info", "Neste tamanho a dica exata é desativada para a página não travar. Use a Dica 1 e a análise da etapa 3.");
    const r = G.solveSwapFrom(g, cur, goal(), J.CAP);
    if (r.error) return fb("bad", r.error === "limite" ? "A busca atingiu o limite de estados: não foi possível calcular a dica exata." : "Desta posição não existe solução. Use Desfazer para voltar a uma posição anterior.");
    const m = r.moves[0];
    if (!m) return;
    fb("info", hint === 2 ? `<b>Dica 2.</b> Um próximo movimento de uma solução mínima usa o cavalo <b>${NAME[m.c]}</b> que está em <b>${m.f}</b>.` : `<b>Dica 3.</b> Mova ${GL[m.c]} de <b>${m.f}</b> para <b>${m.t}</b>. A partir daí, faltam ${r.moves.length - 1} movimentos no mínimo.`);
    draw();
  }

  /* ---------- Painel por etapa ---------- */
  const logHtml = () =>
    log.length
      ? log.map((m, j) => `<button type="button" data-j="${j + 1}" class="${j === log.length - 1 ? "cur" : ""}"><span class="mono">${String(j + 1).padStart(2, "0")}</span> ${GL[m.c]} ${m.f} <span style="opacity:.5">→</span> ${m.t}</button>`).join("")
      : '<p class="mut">Nenhum movimento ainda.</p>';
  function renderPanel() {
    const el = $("#pstep");
    if (step === 1)
      el.innerHTML = `<h4>O problema</h4><p>Há ${total()} cavalos: ${start.W.length} brancos (♘) e ${start.B.length} pretos (♞). Eles precisam <b>trocar de lugar</b>: os brancos terminam onde os pretos começaram, e vice-versa. Os círculos nos cantos das casas marcam os destinos: <b>círculo vazio</b> para os brancos, <b>círculo cheio</b> para os pretos. Ele ganha contorno rosa quando o cavalo certo chega.</p><h4>As regras</h4><p>• O cavalo salta em L: duas casas numa direção e uma na perpendicular.<br>• Não há capturas: o destino precisa estar livre.<br>• Só existem as casas do tabuleiro.<br>• Brancos e pretos podem se mover em qualquer ordem.</p><p class="task">Toque num cavalo e depois numa casa destacada. Se errar, o jogo explica o motivo.</p><div class="row"><button type="button" class="p sm" data-go="2">Investigar a solução ${G.icon("arrow-right")}</button></div>`;
    else if (step === 2) {
      const best = attempts.filter((a) => a.ok).reduce((m, a) => Math.min(m, a.n), Infinity);
      el.innerHTML = `<h4>Investigar</h4><p class="mut">Procure uma estratégia. Dicas aparecem aos poucos e valem para a posição atual.</p><div class="row"><button type="button" class="sm" id="hint">Dica ${hint ? `(${hint}/3)` : ""}</button><button type="button" class="g sm" data-reveal>Revelar o mínimo</button></div><h4>Registro de movimentos</h4><div class="moves movelog" id="movelog" aria-label="Movimentos desta tentativa">${logHtml()}</div><p class="mut">Toque num movimento para voltar até ele.</p><h4>Tentativas</h4>${attempts.length ? `<table class="list"><tr><th>#</th><th>Movimentos</th><th>Resultado</th></tr>${attempts.map((a, i) => `<tr><td>${i + 1}</td><td>${a.n}</td><td>${a.ok ? (a.n === best ? "resolvida · melhor" : "resolvida") : "abandonada"}</td></tr>`).join("")}</table><p class="mut">Compare: o que mudou na estratégia da melhor tentativa?</p>` : '<p class="mut">Suas tentativas aparecem aqui quando você reinicia ou resolve.</p>'}${solved() ? `<label class="ask">Explique seu raciocínio<textarea id="why" placeholder="Que ideia ajudou? Que movimentos foram desvio?">${J.store.get("notas", {}).troca || ""}</textarea></label>` : ""}<div id="reveal"></div>`;
    } else renderAnalysisPanel();
  }

  function renderAnalysisPanel() {
    const el = $("#pstep");
    const presets = step === 4 ? `<h4>Escolha um tabuleiro</h4><div class="chips" id="presets">${PRESETS.map((x) => `<button type="button" class="sm ${x.id === curPreset ? "on" : ""}" data-preset="${x.id}">${x.nome}</button>`).join("")}</div><label class="tools-check"><input type="checkbox" id="edit" ${editing ? "checked" : ""}> editar casas tocando no tabuleiro</label><p class="mut">Só as casas existentes valem como posições. O cavalo <i>salta</i>: uma casa ausente não bloqueia o caminho, apenas não pode ser o destino.</p>` : "";
    const lockId = step === 3 ? "3.3" : "3.4",
      J2 = G.jornada,
      lockNote = J2 && !J2.isFree() && J2.status(lockId) === "locked" ? `<p class="fb bad">Fase ${lockId} ainda bloqueada (conclua ${J2.missing(lockId).map((m) => m.id).join(", ")}). Você pode calcular aqui, mas isso não conta para a trilha.</p>` : "";
    const head = lockNote + (step === 3 ? `<h4>Matemática da troca</h4><p class="mut">Calcule o mínimo e compare com o que cada cavalo conseguiria sozinho.</p>` : `<h4>Tabuleiros irregulares</h4>`);
    const est = space();
    el.innerHTML = `${head}${presets}<div class="row"><button type="button" class="p sm" data-run>${analysis ? "Recalcular" : "Calcular o mínimo"}</button></div><p class="mut">Posições possíveis: ${est.toLocaleString("pt-BR")}. ${est > J.CAP ? "Muitas: a busca pode atingir o limite e eu avisarei." : ""}</p><div id="analysis">${analysis ? analysisHtml() : ""}</div>`;
  }
  let curPreset = "reg";

  function runAnalysis() {
    const o = optFor();
    if (!o) {
      analysis = { big: true };
    } else analysis = { ...o.A, res: o.res };
    /* Ordem importa: a fase 3.3 (análise) precisa ser concluída antes de a 3.4 (irregular) receber evidência. */
    if (o && !o.A.skipped && !o.A.impossible) J.meta("analise");
    if (irregular()) J.meta("irregular");
    if (step >= 3 && view !== "graph" && !editing) view = "graph";
    renderPanel();
    draw();
  }
  function analysisHtml() {
    const a = analysis;
    if (a.big) return `<p class="fb bad">Espaço de posições grande demais para a busca exata nesta página (limite de ${J.CAP.toLocaleString("pt-BR")} estados). Não afirmo nenhum mínimo aqui; use um tabuleiro menor ou a etapa Solução, com limite de 400 mil.</p>`;
    if (a.skipped) return `<p class="fb bad">Com mais de 7 cavalos por cor o limite inferior não é calculado nesta página.</p>`;
    const r = a.res,
      parts = [];
    if (a.impossible) {
      parts.push(`<p class="fb bad"><b>Sem solução.</b> Pelo menos um cavalo não consegue chegar a nenhuma casa de destino: está em outra componente do grafo. Isso prova a impossibilidade sem busca, só pela conectividade.</p>`);
    } else {
      const opt = r.moves ? r.moves.length : null,
        gap = opt === null ? "?" : opt - a.lb;
      parts.push(`<dl class="kv"><div><dt>Limite inferior</dt><dd>${a.lb}</dd></div><div><dt>Mínimo exato</dt><dd class="ac">${opt === null ? "?" : opt}</dd></div><div><dt>Diferença</dt><dd>${gap}</dd></div><div><dt>Posições vistas</dt><dd style="font-size:23px">${r.states ?? "?"}</dd></div></dl>`);
      parts.push(`<h4>Caminhos individuais</h4><p>Cada cavalo, sozinho, percorreria:</p><p class="mono small">${a.paths.map((q) => `${q.from} → ${q.to}: ${q.d} (${q.path.join(" → ")})`).join("<br>")}</p><p>A soma é <b>${a.lb}</b>. Casas usadas por mais de um caminho: <b>${J.list(a.shared)}</b> (destacadas no grafo). Ali os cavalos podem se atrapalhar.</p>`);
      if (opt !== null) parts.push(`<p>${gap === 0 ? "Aqui o mínimo coincide com a soma: os caminhos individuais couberam juntos sem desvios." : `A troca real exige <b>${gap}</b> movimento(s) a mais que a soma. Esse é o custo da <b>interferência</b>: cavalos ocupam casas de que os outros precisam e forçam desvios. Por isso a soma dos caminhos mínimos é só um piso.`}</p>`);
      parts.push(`<h4>Paridade</h4><p>Cada salto muda a cor da casa do cavalo que se move. ${paritySentence(a)} Como as casas ocupadas no fim são as mesmas do começo, o <b>total de movimentos é sempre par</b>${opt !== null ? ` (aqui, ${opt})` : ""}. Como o limite inferior também é par, a diferença entre os dois é par.`);
      if (r.moves)
        parts.push(`<h4>Encontrar não é provar</h4><p>Uma sequência válida mostra que ${r.moves.length} movimentos <i>bastam</i>. Que são <i>necessários</i> exige mais: a busca em largura examinou as posições por camadas (${r.states} no total) e nenhuma posição final apareceu antes da camada ${r.moves.length}. Como a busca foi exaustiva até ali, ${r.moves.length} é mesmo o mínimo.</p><div class="row"><button type="button" class="sm" data-replay>Rever a solução mínima</button></div>`);
      else if (r.error === "limite")
        parts.push(`<p class="fb bad"><b>Limite atingido.</b> A busca parou em ${r.states} posições sem achar o objetivo. Não sei se existe solução nem qual o mínimo; só vale o limite inferior (${a.lb}).</p>`);
      else
        parts.push(`<p class="fb bad"><b>Sem solução, provado por esgotamento.</b> Os cavalos conseguem chegar às casas de destino sozinhos, mas a busca percorreu todas as ${r.states} posições alcançáveis e nenhuma é a troca. O bloqueio mútuo impede a troca; o limite inferior (${a.lb}) existe, mas não é atingível.</p>`);
    }
    return parts.join("");
  }
  function paritySentence(a) {
    const f = (list, name) => (list.every((x) => x.parity !== null) ? (new Set(list.map((x) => x.parity)).size === 1 ? `Cada cavalo ${name} faz um número ${list[0].parity ? "ímpar" : "par"} de saltos.` : "") : "");
    return `${f(a.forcedW, "branco")} ${f(a.forcedB, "preto")}`.trim();
  }

  /* ---------- Eventos ---------- */
  $("#pstep").addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-go]")) return setStep(+t.closest("[data-go]").dataset.go);
    if (t.closest("#hint")) return giveHint(), renderPanel();
    if (t.closest("[data-j]")) {
      log = log.slice(0, +t.closest("[data-j]").dataset.j);
      cur = { W: [...start.W], B: [...start.B] };
      log.forEach((m) => (cur[m.c] = cur[m.c].map((v) => (v === m.f ? m.t : v))));
      sel = null;
      hint = 0;
      fb("info", `Voltou ao movimento ${log.length}. Experimente outro caminho a partir daqui.`);
      draw();
      return renderPanel();
    }
    if (t.closest("[data-reveal]")) {
      const o = optFor();
      $("#reveal").innerHTML = o && o.res.moves ? `<p class="fb info">O mínimo para esta troca é <b>${o.res.moves.length}</b> movimentos. ${attempts.some((a) => a.ok) ? "" : "Você ainda não resolveu: tente chegar lá."}</p>` : '<p class="fb bad">Não foi possível calcular o mínimo (sem solução ou limite).</p>';
      return;
    }
    if (t.closest("[data-run]")) {
      $("#analysis").innerHTML = '<p class="mut" role="status">Calculando…</p>';
      return void setTimeout(runAnalysis, 30);
    }
    if (t.closest("[data-preset]")) {
      curPreset = t.closest("[data-preset]").dataset.preset;
      setConfig(PRESETS.find((x) => x.id === curPreset));
      fb("info", `${PRESETS.find((x) => x.id === curPreset).nome}: ${g.V.length} vértices e ${g.E.length} arestas. Calcule o mínimo ou jogue.`);
      if (vp) vp.fit();
      return renderPanel();
    }
    if (t.closest("[data-replay]") && analysis?.res?.moves) {
      replay = { moves: analysis.res.moves, i: 0 };
      $("#analysis").insertAdjacentHTML("afterbegin", `<div class="row rp" id="rp"><button type="button" class="sm" data-rp="-1">${G.icon("caret-left")} Anterior</button><button type="button" class="sm p" data-rp="1">Próximo ${G.icon("caret-right")}</button><button type="button" class="g sm" data-rp="0">Sair</button></div>`);
      fb("info", `Solução mínima, passo 0 de ${replay.moves.length}.`);
      return draw();
    }
    const rp = t.closest("[data-rp]");
    if (rp && replay) {
      const d = +rp.dataset.rp;
      if (d === 0) {
        replay = null;
        $("#rp")?.remove();
        fb("info", "Saiu da revisão.");
      } else {
        replay.i = Math.max(0, Math.min(replay.moves.length, replay.i + d));
        const m = replay.moves[replay.i - 1];
        fb("info", replay.i ? `Passo ${replay.i} de ${replay.moves.length}: ${GL[m.c]} ${m.f} → ${m.t}.` : "Posição inicial.");
      }
      draw();
    }
  });
  $("#pstep").addEventListener("change", (e) => {
    if (e.target.id === "edit") {
      editing = e.target.checked;
      if (editing) view = "board";
      fb("info", editing ? "Edição ligada: toque numa casa vazia para removê-la ou restaurá-la." : "Edição desligada.");
      draw();
    }
  });
  $("#pstep").addEventListener("input", (e) => {
    if (e.target.id === "why") {
      const n = J.store.get("notas", {});
      n.troca = e.target.value;
      J.store.set("notas", n);
    }
  });
  function setStep(n) {
    step = n;
    editing = n === 4 ? editing : false;
    replay = null;
    if (n === 3 && !editing) view = "graph";
    if (n <= 2) view = "board";
    renderPanel();
    draw();
    const dica = ["", "", "Registre, compare e peça dicas aos poucos.", "Calcule o mínimo e veja por que a soma dos caminhos individuais não basta.", "Remova casas e veja como o grafo e o mínimo mudam."][n];
    if (dica) fb("info", dica);
    else J.idle($("#fb"));
  }
  $("#steps").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setStep(+b.dataset.step);
  });
  $("#view").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) {
      view = b.dataset.view;
      if (view === "graph") editing = false;
      draw();
    }
  });
  $("#undo").addEventListener("click", () => {
    const m = log.pop();
    if (!m) return;
    cur[m.c] = cur[m.c].map((v) => (v === m.t ? m.f : v));
    sel = null;
    hint = 0;
    fb("info", "Movimento desfeito.");
    draw();
    renderPanel();
  });
  $("#restart").addEventListener("click", () => {
    reset(true);
    fb("info", "Nova tentativa. Que estratégia diferente você quer testar?");
    renderPanel();
  });

  setConfig(PRESETS[0]);
  vp = G.viewport(svg, { fit: () => G.board.fit(p.structure), tap });
  renderPanel();
  J.idle($("#fb"));
  /* ?fase= abre a etapa correspondente (3.1 → regras, 3.2 → investigar, 3.3 → matemática, 3.4 → irregulares). */
  const STEP_OF = { "3.1": 1, "3.2": 2, "3.3": 3, "3.4": 4 };
  if (G.fase && G.fase.asked && STEP_OF[G.fase.focus.id] > 1) setStep(STEP_OF[G.fase.focus.id]);
})(window.Graphos);
