/* Graphos / caminhos: o estudante move o cavalo; a busca em largura calcula o mínimo de verdade. */
(function (G) {
  const without = (r, c, rm) => G.allCells(r, c).filter((x) => !rm.includes(x));
  /* Níveis: só definem o tabuleiro e os extremos. O mínimo é sempre calculado. */
  const LEVELS = [
    { id: "n1", nivel: "Iniciante", nome: "Primeiro salto", r: 5, c: 5, from: "A1", to: "B3" },
    { id: "n2", nivel: "Iniciante", nome: "Em poucos saltos", r: 5, c: 5, from: "A1", to: "A3" },
    { id: "n3", nivel: "Intermediário", nome: "A casa ao lado", r: 8, c: 8, from: "A1", to: "B2" },
    { id: "n4", nivel: "Intermediário", nome: "De canto a canto", r: 8, c: 8, from: "A1", to: "H8" },
    { id: "n5", nivel: "Desafio", nome: "Um obstáculo", r: 5, c: 5, from: "A1", to: "A3", rm: ["C2"] },
    { id: "n6", nivel: "Desafio", nome: "Existe caminho?", r: 3, c: 3, from: "A1", to: "B2" },
  ];
  G.caminhosLevels = LEVELS;
  if (document.body.dataset.page !== "caminhos" || (G.fase && G.fase.blocked)) return;
  const J = G.jogo,
    $ = G.$,
    svg = $("#bsvg");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SIZES = { "4x3": [4, 3], "5x5": [5, 5], "6x6": [6, 6], "8x8": [8, 8] };
  let mode = "levels",
    level = LEVELS[0],
    p,
    g,
    origin = null,
    dest = null,
    path = [],
    hint = 0,
    showReach = null,
    shown = null, // camadas reveladas na explicação
    flash = null,
    vp;
  /* Fase 2.3 abre no nível "Existe caminho?". */
  if (G.fase && G.fase.asked && G.fase.focus.id === "2.3") level = LEVELS.find((l) => l.id === "n6");
  const prog = () => J.store.get("caminhos", {});
  const fb = (k, h) => J.say($("#fb"), k, h);
  const pos = () => path.at(-1);
  const dist = () => (origin && dest ? G.graph.bfs(g, origin).d[dest] : undefined);
  const finished = () => path.length > 1 && pos() === dest;

  function load() {
    if (mode === "levels") {
      p = J.board(level.r, level.c, level.rm ? without(level.r, level.c, level.rm) : null);
      origin = level.from;
      dest = level.to;
    } else {
      const [r, c] = SIZES[$("#size").value];
      p = J.board(r, c);
      origin = dest = null;
    }
    g = G.graph.of(p);
    path = origin ? [origin] : [];
    hint = 0;
    showReach = null;
    shown = null;
    $("#result").innerHTML = "";
    if (vp) vp.fit();
    if (mode === "levels")
      J.idle($("#fb"), "Pense antes de tocar: o resultado aparece aqui.");
    else fb("info", "Toque na casa de <b>origem</b> e depois na de <b>destino</b>.");
    draw();
  }

  function draw() {
    const legal = pos() && !finished() ? g.adj[pos()] : [],
      sm = $("#showmoves").checked;
    G.board.render(svg, p, {
      edges: path.slice(1).map((v, i) => [path[i], v]),
      edgeCls: () => " p",
      pieces: pos() ? { [pos()]: "W" } : {},
      cls: (id) =>
        id === flash ? " pth" : id === dest ? " pth" : id === pos() ? " sel" : sm && legal.includes(id) ? " nb" : "",
    });
    if (dest)
      J.marks(svg, p.structure, [{ id: dest, kind: "B", hit: finished() }]);
    if (showReach) J.labels(svg, p.structure, Object.fromEntries(showReach.map((v) => [v, "·"])), "dist");
    if (shown) {
      const map = {};
      shown.layers.forEach((ids, k) => k <= shown.k && ids.forEach((id) => (map[id] = k)));
      J.labels(svg, p.structure, map, "dist");
    }
    $("#bcap").textContent = `${p.structure.rows}×${p.structure.cols} · ${p.structure.active.length} casas`;
    const d = dist(),
      fin = finished();
    /* O objetivo fica acima do tabuleiro (`.ctask`): uma linha com o nível e o
       trajeto, para o estudante não precisar procurar o alvo no painel. */
    $("#ctask").innerHTML =
      `<div class="ctask-bar"><p class="ctask-head"><span class="mono">${mode === "levels" ? level.nivel : "Livre"}</span> <b>${mode === "levels" ? esc(level.nome) : "Tabuleiro livre"}</b></p>` +
      `<p class="ctask-todo">${
        origin && dest
          ? `Leve o cavalo de <b>${origin}</b> até <b>${dest}</b> com o menor número de saltos.`
          : origin
            ? `Origem <b>${origin}</b>. Toque na casa de destino.`
            : "Toque na casa de origem e depois na de destino."
      }</p></div>` +
      (origin && dest
        ? `<p class="ctask-obj">Origem ${origin} (${J.shadeName(origin)}) → destino ${dest} (${J.shadeName(dest)})${d === undefined ? ": nenhum caminho entre elas." : ` · ${fin || hint >= 2 ? `${d} ${d === 1 ? "salto" : "saltos"} no mínimo` : "quantos saltos você acha que são necessários?"}`}</p>`
        : "");
    $("#score").innerHTML =
      `<div><dt>Saltos</dt><dd class="ac">${Math.max(0, path.length - 1)}</dd></div><div><dt>Mínimo</dt><dd>${fin || hint >= 2 ? (d === undefined ? "∞" : d) : "?"}</dd></div>`;
    $("#undo").disabled = path.length < 2;
    $("#hint").disabled = !origin || !dest || fin;
    $("#hint").textContent = hint ? `Dica (${Math.min(hint, 3)}/3)` : "Dica";
    $("#reach").disabled = !pos();
    document.querySelectorAll("#mode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    renderLevels();
  }
  function renderLevels() {
    const box = $("#levels");
    box.hidden = mode !== "levels";
    $("#size-wrap").hidden = mode !== "free";
    if (mode !== "levels") return;
    const pr = prog();
    let last = "";
    box.innerHTML = LEVELS.map((l) => {
      const r = pr[l.id],
        head = l.nivel !== last ? `<h4>${l.nivel}</h4>` : "";
      last = l.nivel;
      return `${head}<button type="button" class="lv${l.id === level.id ? " on" : ""}" data-lv="${l.id}"><span>${l.nome}</span><small class="mono">${r ? (r.min ? "mínimo" : r.none ? "investigado" : "resolvido") : ""}</small></button>`;
    }).join("");
  }

  /* Hints graduais: paridade, depois o valor, depois o próximo salto. */
  function giveHint() {
    hint++;
    const from = pos(),
      d = G.graph.bfs(g, from).d;
    if (hint === 1) {
      const diff = (J.shade(from) + J.shade(dest)) % 2;
      fb("info", `<b>Dica 1.</b> Cada salto troca a cor da casa. ${from} é ${J.shadeName(from)} e ${dest} é ${J.shadeName(dest)}: o número de saltos que faltam precisa ser <b>${diff ? "ímpar" : "par"}</b>.`);
    } else if (hint === 2) {
      fb("info", dest in d
        ? `<b>Dica 2.</b> Daqui existe caminho com <b>${d[dest]}</b> ${d[dest] === 1 ? "salto" : "saltos"}. Procure uma sequência assim.`
        : `<b>Dica 2.</b> Nenhuma sequência de saltos leva de ${from} a ${dest}. Use <i>Casas alcançáveis</i> para conferir.`);
    } else {
      const nxt = dest in d && d[dest] > 0 ? G.graph.path(g, from, dest)[1] : null;
      fb("info", nxt ? `<b>Dica 3.</b> Um próximo salto de um caminho mínimo vai para <b>${nxt}</b>.` : "<b>Dica 3.</b> Não há próximo salto: o destino não é alcançável.");
    }
    draw();
  }

  function win() {
    const n = path.length - 1,
      d = dist(),
      pr = prog(),
      key = mode === "levels" ? level.id : "livre";
    const minimo = n === d;
    if (mode === "levels") {
      const old = pr[key] || {};
      pr[key] = { ...old, min: old.min || minimo, best: Math.min(old.best || 99, n) };
      J.store.set("caminhos", pr);
    }
    if (minimo) J.meta("minimo");
    /* Fase 2.2: caminho mínimo num trajeto de distância ≥ 2 (o primeiro nível, de um salto, não conta). */
    if (minimo && d >= 2 && G.jornada) G.jornada.evidence("caminhos:min2");
    const layers = J.layers(g, origin);
    shown = { layers, k: d };
    fb(minimo ? "ok" : "info",
      minimo
        ? `Destino alcançado em <b>${n}</b> saltos, o mínimo. Você encontrou um caminho de comprimento mínimo.`
        : `Destino alcançado em <b>${n}</b> saltos. O mínimo é <b>${d}</b>: seu caminho usou ${n - d} a mais. Boa persistência; que tal reiniciar e tentar outra rota?`);
    $("#result").innerHTML =
      `<h4>Por que ${d} é o mínimo?</h4><p>A busca em largura parte de ${origin} e visita as casas por camadas: ${layers.slice(0, d + 1).map((l, k) => `camada ${k}: ${l.length} ${l.length === 1 ? "casa" : "casas"}`).join("; ")}. O destino <b>${dest}</b> só aparece na camada <b>${d}</b>, então nenhum caminho tem menos de ${d} saltos.</p>` +
      `<label class="ask">Camadas reveladas<input id="layer" type="range" min="0" max="${d}" value="${d}" aria-valuetext="até a camada ${d}"></label>` +
      (minimo ? "" : `<div class="row"><button type="button" class="sm" id="show-opt">Ver um caminho mínimo</button></div>`) +
      `<label class="ask">Explique seu raciocínio<textarea id="why" placeholder="Por que você escolheu esse caminho?">${(J.store.get("notas", {})[key]) || ""}</textarea></label>`;
    draw();
  }

  function tap(id) {
    if (!g.adj[id]) return;
    if (!origin || !dest) {
      if (!origin) { origin = id; path = [id]; fb("info", `Origem: <b>${id}</b>. Agora toque no destino.`); }
      else if (id === origin) fb("bad", "O destino precisa ser diferente da origem.");
      else { dest = id; const d = dist(); fb("info", `Destino: <b>${id}</b>. ${d === undefined ? "Será que existe caminho?" : "Quantos saltos você acha que são necessários?"} Comece a mover o cavalo.`); }
      return draw();
    }
    if (finished()) return fb("info", "Você já chegou. Use Reiniciar para tentar outra rota.");
    const from = pos();
    if (id === from) return;
    if (!g.adj[from].includes(id)) {
      flash = id;
      fb("bad", J.explainIllegal(p.structure, from, id, {}));
      draw();
      setTimeout(() => { flash = null; draw(); }, 600);
      return;
    }
    path.push(id);
    showReach = null;
    if (finished()) return win();
    fb("info", `Salto ${path.length - 1}: ${from} → <b>${id}</b>.`);
    draw();
  }

  /* ---------- Eventos ---------- */
  $("#levels").addEventListener("click", (e) => {
    const b = e.target.closest("[data-lv]");
    if (b) { level = LEVELS.find((l) => l.id === b.dataset.lv); load(); }
  });
  $("#mode").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) { mode = b.dataset.mode; load(); }
  });
  $("#size").addEventListener("change", load);
  $("#showmoves").addEventListener("change", draw);
  $("#undo").addEventListener("click", () => { if (path.length > 1) { path.pop(); shown = null; $("#result").innerHTML = ""; fb("info", "Salto desfeito."); draw(); } });
  $("#restart").addEventListener("click", load);
  $("#hint").addEventListener("click", () => { if (origin && dest && !finished()) giveHint(); });
  $("#reach").addEventListener("click", () => {
    const d = G.graph.bfs(g, pos()).d,
      list = Object.keys(d);
    showReach = list;
    const ok = dest && dest in d;
    fb("info", `A partir de ${pos()} o cavalo alcança ${J.plural(list.length, "casa", "casas")} (marcadas com ·)${dest ? (ok ? `, incluindo o destino ${dest}.` : `, e o destino <b>${dest}</b> não está entre elas: não existe caminho.`) : "."}`);
    if (dest && !ok) { const pr = prog(); if (mode === "levels") { pr[level.id] = { ...(pr[level.id] || {}), none: true }; J.store.set("caminhos", pr); } J.meta("sem-caminho"); }
    draw();
  });
  $("#result").addEventListener("input", (e) => {
    if (e.target.id === "layer") { shown.k = +e.target.value; e.target.setAttribute("aria-valuetext", `até a camada ${shown.k}`); draw(); }
    if (e.target.id === "why") { const n = J.store.get("notas", {}); n[mode === "levels" ? level.id : "livre"] = e.target.value; J.store.set("notas", n); }
  });
  $("#result").addEventListener("click", (e) => {
    if (e.target.id === "show-opt") {
      const opt = G.graph.path(g, origin, dest);
      fb("info", `Um caminho mínimo: ${opt.join(" → ")} (${opt.length - 1} saltos). Há outros de mesmo comprimento.`);
    }
  });

  load();
  vp = G.viewport(svg, { fit: () => G.board.fit(p.structure), tap });
})(window.Graphos);
