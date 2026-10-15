/* Graphos / laboratório: monte um tabuleiro, preveja, teste. Todo resultado é calculado, nunca fixo. */
(function (G) {
  if (document.body.dataset.page !== "laboratorio" || (G.fase && G.fase.blocked)) return;
  const J = G.jogo,
    $ = G.$,
    svg = $("#bsvg");
  let mode = "caminho",
    tool = "cells",
    rows = 5,
    cols = 5,
    active = G.allCells(5, 5),
    W = [],
    B = [],
    origin = "A1",
    dest = "E5",
    view = "board",
    ref = null,
    p,
    g,
    imp = null,
    vp;
  const fb = (k, h) => J.say($("#fb"), k, h);
  const sync = () => {
    p = J.board(rows, cols, active);
    g = G.graph.of(p);
    imp = null;
  };

  /* ---------- Cálculo da verdade ---------- */
  function truth() {
    if (mode === "caminho") {
      if (!origin || !dest || !g.adj[origin] || !g.adj[dest]) return { error: "Escolha origem e destino em casas existentes." };
      if (origin === dest) return { error: "Origem e destino precisam ser diferentes." };
      const path = G.graph.path(g, origin, dest);
      return path ? { value: path.length - 1, path } : { value: null, why: "origem e destino estão em componentes diferentes do grafo" };
    }
    if (!W.length || W.length !== B.length) return { error: "A troca precisa do mesmo número (pelo menos 1) de cavalos brancos e pretos." };
    if (J.stateSpace(active.length, W.length, B.length) > J.HINT_LIMIT * 2) return { error: "Posições demais para a busca exata nesta página. Use menos cavalos ou um tabuleiro menor." };
    const A = J.swapAnalysis(g, W, B);
    if (!A.skipped && A.impossible) return { value: null, why: "algum cavalo não alcança nenhuma casa de destino (conectividade)", A };
    const r = G.solveSwapFrom(g, { W, B }, { W: B, B: W }, J.CAP);
    if (r.error === "limite") return { error: `A busca atingiu o limite de ${J.CAP.toLocaleString("pt-BR")} posições: não posso afirmar o mínimo.` };
    return r.moves ? { value: r.moves.length, A } : { value: null, why: `a busca percorreu todas as ${r.states} posições alcançáveis e nenhuma é a troca`, A };
  }

  /* ---------- Desenho ---------- */
  function draw() {
    const pcs = mode === "troca" ? Object.fromEntries([...W.map((v) => [v, "W"]), ...B.map((v) => [v, "B"])]) : origin && g.adj[origin] ? { [origin]: "W" } : {};
    G.board.render(svg, p, {
      graph: view === "graph",
      edges: view === "graph" ? g.E : [],
      pieces: pcs,
      editable: view === "board",
      cls: (id) => (imp && imp[id] ? (imp[id].kind === "longer" ? " imp1" : imp[id].kind === "cut" || imp[id].kind === "split" ? " imp2" : "") : ""),
    });
    if (mode === "caminho" && dest && g.adj[dest]) J.marks(svg, p.structure, [{ id: dest, kind: "B" }]);
    if (mode === "troca") J.marks(svg, p.structure, [...B.map((id) => ({ id, kind: "W" })), ...W.map((id) => ({ id, kind: "B" }))]);
    const m = J.metrics(p, mode === "caminho" ? origin : null, mode === "caminho" ? dest : null);
    $("#bcap").textContent = `${rows}×${cols} · ${active.length} casas${m ? ` · G = (${m.vertices}, ${m.edges}) · ${m.comps} ${m.comps === 1 ? "componente" : "componentes"}` : ""}`;
    $("#rows").value = rows;
    $("#cols").value = cols;
    const tools = mode === "caminho" ? [["cells", "Casas"], ["origin", "Origem"], ["dest", "Destino"]] : [["cells", "Casas"], ["W", "♘ Branco"], ["B", "♞ Preto"]];
    $("#tools").innerHTML = tools.map(([k, t]) => `<button type="button" data-tool="${k}" aria-pressed="${k === tool}">${t}</button>`).join("");
    document.querySelectorAll("#mode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    document.querySelectorAll("#view button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    $("#ask-text").textContent = mode === "caminho" ? `Quantos saltos separam ${origin || "a origem"} de ${dest || "o destino"}? Ou não há caminho?` : "Qual o mínimo de movimentos para trocar os cavalos? Ou a troca é impossível?";
    $("#crit-note").textContent = imp ? "Rosa: remover a casa aumenta a distância. Vermelho: remove a ligação (desconecta). Sem cor: nenhum efeito." : "";
    renderCompare();
    renderBook();
  }
  function renderCompare() {
    if (!ref) return ($("#cmp").innerHTML = '<p class="mut">Fixe a configuração atual, altere o tabuleiro e compare.</p>');
    const cur = J.metrics(p, mode === "caminho" ? origin : null, mode === "caminho" ? dest : null);
    if (!cur) return;
    const rowsDef = [["Vértices", "vertices"], ["Arestas", "edges"], ["Componentes", "comps"], ["Diâmetro", "diam"], ["Grau máx.", "dmax"], ["Distância A→B", "dist"]];
    const f = (v) => (v === null || v === undefined ? "–" : v);
    $("#cmp").innerHTML = `<table class="list"><tr><th></th><th>Ref.</th><th>Agora</th><th>Δ</th></tr>${rowsDef.map(([t, k]) => `<tr><td>${t}</td><td>${f(ref[k])}</td><td>${f(cur[k])}</td><td>${typeof ref[k] === "number" && typeof cur[k] === "number" ? (cur[k] - ref[k] > 0 ? "+" : "") + (cur[k] - ref[k]) : "–"}</td></tr>`).join("")}</table><p class="mut">O que mudou no grafo? Por que o formato mudou esses números?</p>`;
  }
  const book = () => J.store.get("lab", []);
  function renderBook() {
    const b = book();
    $("#book").innerHTML = b.length ? `<table class="list"><tr><th>Configuração</th><th>Previu</th><th>Real</th></tr>${b.slice(-8).reverse().map((e) => `<tr><td>${e.cfg}</td><td>${e.pred}</td><td>${e.real} ${e.ok ? "✓" : "✗"}</td></tr>`).join("")}</table>` : '<p class="mut">Suas hipóteses testadas aparecem aqui.</p>';
  }

  /* ---------- Interações ---------- */
  function tap(id) {
    const exists = active.includes(id);
    if (tool === "cells") {
      active = exists ? active.filter((x) => x !== id) : G.allCells(rows, cols).filter((x) => x === id || active.includes(x));
      if (exists) {
        W = W.filter((x) => x !== id);
        B = B.filter((x) => x !== id);
        if (origin === id) origin = null;
        if (dest === id) dest = null;
      }
      sync();
      fb("info", `${id} ${exists ? "removida" : "restaurada"}. Agora o grafo tem ${g.V.length} vértices e ${g.E.length} arestas. O que você espera que mude?`);
    } else {
      if (!exists) return fb("bad", `A casa ${id} não existe. Restaure-a com a ferramenta Casas.`);
      if (tool === "origin" || tool === "dest") {
        if ((tool === "origin" ? dest : origin) === id) return fb("bad", "Origem e destino precisam ser diferentes.");
        if (tool === "origin") origin = id;
        else dest = id;
        fb("info", `${tool === "origin" ? "Origem" : "Destino"}: ${id}.`);
      } else {
        const had = W.includes(id) ? "W" : B.includes(id) ? "B" : null;
        W = W.filter((x) => x !== id);
        B = B.filter((x) => x !== id);
        if (had !== tool) (tool === "W" ? W : B).push(id);
        fb("info", `${W.length} brancos e ${B.length} pretos.`);
      }
      imp = null;
    }
    $("#crit").checked = false;
    draw();
  }
  function test() {
    const t = truth();
    if (t.error) return fb("bad", t.error);
    const saysImp = $("#imp").checked,
      raw = $("#pred").value.trim();
    if (!saysImp && (raw === "" || !Number.isInteger(+raw) || +raw < 0)) return fb("bad", "Faça uma previsão: digite um número inteiro ou marque “acho que é impossível”.");
    const pred = saysImp ? null : +raw,
      ok = pred === t.value;
    const real = t.value === null ? "impossível" : t.value;
    J.meta("hipotese");
    if (ok) J.meta("acerto");
    const b = book();
    b.push({ cfg: `${rows}×${cols}, ${active.length} casas, ${mode === "caminho" ? `${origin}→${dest}` : `${W.length}+${B.length}`}`, pred: saysImp ? "impossível" : pred, real, ok });
    J.store.set("lab", b.slice(-30));
    let why = "";
    if (t.value === null) why = ` Motivo: ${t.why}.`;
    else if (mode === "caminho") why = ` Um caminho mínimo: ${t.path.join(" → ")}.`;
    else if (t.A && !t.A.skipped && t.A.lb !== null) why = ` Soma das distâncias individuais: ${t.A.lb}; a diferença (${t.value - t.A.lb}) é o custo da interferência.`;
    fb(ok ? "ok" : "info", `${ok ? "Previsão confirmada" : `Você previu ${saysImp ? "impossível" : pred}`}. Resultado calculado: <b>${real}</b>.${why}${ok ? "" : " Que parte do raciocínio pode ser revista? Teste outra configuração e compare."}`);
    renderBook();
  }
  $("#test").addEventListener("click", test);
  $("#pred").addEventListener("keydown", (e) => e.key === "Enter" && test());
  $("#mode").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    mode = b.dataset.mode;
    tool = "cells";
    if (mode === "troca" && !W.length && !B.length && rows >= 4 && cols >= 3) {
      /* Sugestão inicial: os quatro cantos, para começar a testar já. */
      W = ["A1", `A${cols}`].filter((x) => active.includes(x));
      B = [`${String.fromCharCode(64 + rows)}1`, `${String.fromCharCode(64 + rows)}${cols}`].filter((x) => active.includes(x));
    }
    imp = null;
    $("#crit").checked = false;
    fb("info", mode === "caminho" ? "Pergunta: quantos saltos entre a origem e o destino?" : "Pergunta: qual o mínimo para trocar os cavalos?");
    draw();
  });
  $("#tools").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (b) {
      tool = b.dataset.tool;
      draw();
    }
  });
  $("#mk").addEventListener("click", () => {
    const r = +$("#rows").value,
      c = +$("#cols").value;
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 1 || c < 1 || r > 8 || c > 8) return fb("bad", "Use de 1 a 8 linhas e colunas.");
    rows = r;
    cols = c;
    active = G.allCells(r, c);
    W = [];
    B = [];
    origin = "A1";
    dest = `${String.fromCharCode(64 + r)}${c}`;
    if (origin === dest) dest = null;
    sync();
    vp.fit();
    fb("info", `Novo tabuleiro ${r}×${c}: ${g.V.length} vértices e ${g.E.length} arestas.`);
    draw();
  });
  $("#ref").addEventListener("click", () => {
    ref = J.metrics(p, mode === "caminho" ? origin : null, mode === "caminho" ? dest : null);
    fb("info", ref ? "Referência fixada. Altere o tabuleiro e veja a comparação no painel." : "Não há casas para fixar.");
    draw();
  });
  $("#crit").addEventListener("change", (e) => {
    imp = e.target.checked ? J.impact(p, mode === "caminho" ? origin : null, mode === "caminho" ? dest : null) : null;
    if (imp) {
      const n1 = Object.values(imp).filter((x) => x.kind === "longer").length,
        n2 = Object.values(imp).filter((x) => x.kind === "cut" || x.kind === "split").length;
      fb("info", `Cada casa foi removida e o grafo recalculado: ${J.plural(n1, "casa aumenta", "casas aumentam")} a distância e ${J.plural(n2, "casa desconecta", "casas desconectam")} o grafo.`);
    }
    draw();
  });
  $("#view").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) {
      view = b.dataset.view;
      draw();
    }
  });

  sync();
  vp = G.viewport(svg, { fit: () => G.board.fit(p.structure), tap });
  fb("info", "Toque nas casas para removê-las ou restaurá-las, faça uma previsão e teste.");
  draw();
})(window.Graphos);
