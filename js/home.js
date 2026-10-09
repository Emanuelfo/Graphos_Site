/* The visual narrative is generated from the actual knight graph. */
(function (G) {
  if (document.body.dataset.page !== "home") return;
  const ex = G.examples[0],
    sample = ex.build(),
    graph = G.graph.of(sample);
  const reduced = G.reducedMotion;
  const pieces = G.pieceMap(sample),
    path = G.graph.path(graph, "A1", "D3");
  const pathEdges = new Set(
    path.slice(1).flatMap((v, i) => [path[i] + "|" + v, v + "|" + path[i]]),
  );
  G.$("#ex-list").innerHTML = G.examples
    .map(
      (e) =>
        `<article><p class="example-label">Comece pelo problema original</p><h3>Um pequeno tabuleiro.<br />Uma grande pergunta.</h3><p>${e.descricao}</p><div class="example-facts"><div><strong>12</strong><span>casas</span></div><div><strong>14</strong><span>conexões</span></div><div><strong>4</strong><span>cavalos</span></div></div><button type="button" class="btn p" data-ex="${e.id}">Abrir este exemplo ${G.icon("arrow-up-right")}</button></article>`,
    )
    .join("");
  G.$("#ex-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ex]");
    if (b) G.loadExample(b.dataset.ex);
  });
  G.$("#start-example").addEventListener("click", () => G.loadExample(ex.id));
  G.$("#journey-links").innerHTML = G.STEPS.map(
    (s, i) =>
      `<a href="${s.href}"><span>${String(i + 1).padStart(2, "0")}</span>${s.nome}${G.icon("arrow-up-right")}</a>`,
  ).join("");
  G.board.render(G.$("#study-board"), sample, { pieces });
  G.$("#study-board")
    .querySelectorAll("[tabindex]")
    .forEach((cell) => {
      cell.removeAttribute("tabindex");
      cell.removeAttribute("role");
      cell.removeAttribute("aria-label");
    });
  const iso = (c, r) => ({
    x: 400 + (c - 1) * 90 - (r - 1.5) * 90,
    y: 270 + (c - 1) * 48 + (r - 1.5) * 48,
  });
  const polygon = (c, r) =>
    [
      [c - 0.5, r - 0.5],
      [c + 0.5, r - 0.5],
      [c + 0.5, r + 0.5],
      [c - 0.5, r + 0.5],
    ]
      .map(([x, y]) => {
        const p = iso(x, y);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  const board = {},
    ring = {},
    finish = {},
    rest = graph.V.filter((v) => !path.includes(v));
  G.elements(sample.structure).forEach((e, i) => {
    board[e.id] = iso(e.c, e.r);
    const a = (i / graph.V.length) * Math.PI * 2 - Math.PI / 2;
    ring[e.id] = { x: 400 + 205 * Math.cos(a), y: 270 + 205 * Math.sin(a) };
    const j = path.indexOf(e.id),
      k = rest.indexOf(e.id);
    finish[e.id] =
      j >= 0
        ? { x: 130 + j * 180, y: 195 }
        : { x: 130 + (k % 4) * 180, y: 350 + Math.floor(k / 4) * 100 };
  });
  function scene(svg, interactive) {
    const state = { layout: 0, reveal: 0, path: 0 },
      current = {},
      elements = G.elements(sample.structure);
    let selected = null;
    svg.innerHTML = `<g class="scene-floor"><ellipse class="scene-shadow" cx="400" cy="430" rx="260" ry="40"/><polygon class="scene-base" points="85,294 355,438 715,246 445,102" transform="translate(0 16)"/>${elements.map((e) => `<polygon class="scene-tile ${(e.r + e.c) % 2 ? "dark" : ""}" data-tile="${e.id}" points="${polygon(e.c, e.r)}"/>`).join("")}</g><g class="scene-edges">${graph.E.map(([a, b]) => `<line class="scene-edge" data-a="${a}" data-b="${b}"/>`).join("")}</g>${graph.V.map((id) => `<g class="scene-node" data-node="${id}" ${interactive ? `tabindex="0" role="button" aria-label="Casa ${id}, ${graph.adj[id].length} conexões" aria-pressed="false"` : ""}><circle class="scene-disc" r="23"/><circle class="scene-hit" r="34"/><text class="scene-label" y="5">${id}</text>${pieces[id] ? `<g class="scene-piece"><ellipse class="piece-shadow" cx="0" cy="0" rx="30" ry="12"/>${G.knight(-43, -87, 86, pieces[id]).replace('class="k"', 'class="k piece-depth" transform="translate(5 4)"')}${G.knight(-43, -87, 86, pieces[id])}</g>` : ""}</g>`).join("")}`;
    const nodes = [...svg.querySelectorAll(".scene-node")],
      edges = [...svg.querySelectorAll(".scene-edge")],
      tiles = [...svg.querySelectorAll(".scene-tile")];
    function paint() {
      const a = Math.min(1, state.layout),
        b = Math.max(0, state.layout - 1);
      svg.querySelector(".scene-floor").style.opacity = String(
        1 - Math.min(1, a * 1.6),
      );
      nodes.forEach((n) => {
        const id = n.dataset.node,
          p = board[id],
          r = ring[id],
          f = finish[id];
        const x = p.x + (r.x - p.x) * a + (f.x - r.x) * b,
          y = p.y + (r.y - p.y) * a + (f.y - r.y) * b;
        current[id] = { x, y };
        n.setAttribute("transform", `translate(${x} ${y})`);
        n.querySelector(".scene-disc").style.opacity = String(
          Math.min(1, a * 2),
        );
        n.querySelector(".scene-label").setAttribute(
          "y",
          String(30 * (1 - a) + 5 * a),
        );
        n.querySelector(".scene-label").style.opacity = String(
          selected === id || a > 0.1 ? 1 : 0.85,
        );
        const pc = n.querySelector(".scene-piece");
        if (pc) {
          pc.setAttribute(
            "transform",
            `translate(0 ${-20 * a}) scale(${1 - 0.48 * a})`,
          );
          pc.style.opacity = String(1 - b);
        }
        n.classList.toggle("selected", selected === id);
        n.classList.toggle(
          "neighbor",
          !!selected && graph.adj[selected].includes(id),
        );
        n.classList.toggle("on-path", state.path > 0.1 && path.includes(id));
      });
      edges.forEach((e) => {
        const a = current[e.dataset.a],
          b = current[e.dataset.b],
          active = e.dataset.a === selected || e.dataset.b === selected;
        ["x1", "y1", "x2", "y2"].forEach((key, i) =>
          e.setAttribute(key, [a.x, a.y, b.x, b.y][i]),
        );
        const onPath = pathEdges.has(e.dataset.a + "|" + e.dataset.b);
        e.classList.toggle("active", active);
        e.classList.toggle("on-path", onPath && state.path > 0.1);
        e.style.opacity = String(
          active
            ? 1
            : state.reveal *
                (onPath ? 0.55 + 0.45 * state.path : 0.55 - 0.43 * state.path),
        );
      });
      tiles.forEach((t) =>
        t.classList.toggle("selected", t.dataset.tile === selected),
      );
    }
    function select(id) {
      selected = selected === id ? null : id;
      nodes.forEach((n) =>
        n.setAttribute("aria-pressed", String(n.dataset.node === selected)),
      );
      G.$("#demo-caption").textContent = selected
        ? `${selected} → ${graph.adj[selected].join(" / ")}. Estes são os saltos possíveis.`
        : "Selecione uma casa. Descubra onde o cavalo pode chegar.";
      paint();
    }
    if (interactive) {
      svg.addEventListener("click", (e) => {
        const n = e.target.closest("[data-node]");
        if (n) select(n.dataset.node);
      });
      svg.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const n = e.target.closest("[data-node]");
          if (n) {
            e.preventDefault();
            select(n.dataset.node);
          }
        }
      });
    }
    paint();
    return { state, paint };
  }
  const hero = scene(G.$("#hero-graph"), true),
    story = scene(G.$("#story-graph"), false);
  let mode = "board",
    heroTween;
  function transform(view) {
    mode = view;
    heroTween?.kill();
    G.$("#demo-modes")
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.view === view)),
      );
    G.$("#demo-caption").textContent =
      view === "graph"
        ? "O espaço mudou. As 14 conexões são as mesmas."
        : "Selecione uma casa. Descubra onde o cavalo pode chegar.";
    const target = {
      layout: view === "graph" ? 1 : 0,
      reveal: view === "graph" ? 1 : 0,
      path: 0,
    };
    if (!window.gsap || reduced.matches) {
      Object.assign(hero.state, target);
      hero.paint();
      return;
    }
    heroTween = gsap.to(hero.state, {
      ...target,
      duration: 1.4,
      ease: "power3.inOut",
      onUpdate: hero.paint,
    });
  }
  G.$("#demo-modes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) transform(b.dataset.view);
  });
  G.$("#demo-play").addEventListener("click", () =>
    transform(mode === "board" ? "graph" : "board"),
  );
  reduced.addEventListener("change", () => transform(mode));
  G.$("#mode-board").innerHTML = Array.from(
    { length: 12 },
    (_, i) =>
      `<rect class="preview-cell ${i % 2 ? "dark" : ""} ${i === 5 ? "removed" : ""}" x="${54 + (i % 3) * 48}" y="${15 + Math.floor(i / 3) * 48}" width="46" height="46"/>`,
  ).join("");
  G.$("#mode-knights").innerHTML =
    `<path class="preview-route" d="M45 112H115V45H260" fill="none"/>${G.knight(5, 72, 75, "W")}${G.knight(75, 8, 75, "W")}${G.knight(150, 72, 75, "B")}${G.knight(220, 8, 75, "B")}`;
  G.homeScene = story;
  window.addEventListener("pagehide", () => heroTween?.kill());
  G.icons();
})(window.Graphos);
