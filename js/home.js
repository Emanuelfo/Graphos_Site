/* Live demonstration uses the same graph and knight rules as the laboratory. */
(function (G) {
  if (document.body.dataset.page !== "home") return;
  const ex = G.examples[0],
    sample = ex.build(),
    graph = G.graph.of(sample);
  G.$("#ex-list").innerHTML = G.examples
    .map(
      (e) =>
        `<article><h3>Problema dos Cavalos<br><span class="muted-word">Tabuleiro 3 × 4</span></h3><p>${e.descricao}</p><div class="example-facts"><div><strong>12</strong><span>casas no tabuleiro</span></div><div><strong>4</strong><span>cavalos em jogo</span></div></div><button type="button" class="btn p" data-ex="${e.id}">Carregar exemplo ${G.icon("arrow-up-right")}</button></article>`,
    )
    .join("");
  G.$("#ex-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ex]");
    if (b) G.loadExample(b.dataset.ex);
  });
  G.$("#journey-links").innerHTML = G.STEPS.map(
    (s, i) =>
      `<a href="${s.href}"><span>${String(i + 1).padStart(2, "0")}</span>${s.nome}</a>`,
  ).join("");
  const svg = G.$("#hero-graph"),
    reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const board = {},
    circular = {},
    current = {};
  graph.V.forEach((id, i) => {
    board[id] = { x: 192 + (i % 3) * 88, y: 98 + Math.floor(i / 3) * 88 };
    const a = (i / graph.V.length) * Math.PI * 2 - Math.PI / 2;
    circular[id] = { x: 280 + 177 * Math.cos(a), y: 230 + 177 * Math.sin(a) };
    current[id] = { ...board[id] };
  });
  const pieces = G.pieceMap(sample);
  svg.innerHTML =
    '<g class="demo-tiles">' +
    graph.V.map(
      (id) =>
        `<rect class="demo-tile" x="${board[id].x - 44}" y="${board[id].y - 44}" width="88" height="88" rx="5"/>`,
    ).join("") +
    "</g>" +
    '<g class="demo-edges">' +
    graph.E.map(
      ([a, b]) => `<line class="demo-edge" data-a="${a}" data-b="${b}"/>`,
    ).join("") +
    "</g>" +
    graph.V.map(
      (id) =>
        `<g class="demo-node" data-node="${id}" tabindex="0" role="button" aria-label="Casa ${id}, ${graph.adj[id].length} conexões" aria-pressed="false"><circle class="node-disc" r="23"/><text y="4">${id}</text>${pieces[id] ? `<text class="node-knight ${pieces[id] === "B" ? "black" : ""}" y="-30">${pieces[id] === "W" ? "♘" : "♞"}</text>` : ""}</g>`,
    ).join("");
  const nodes = [...svg.querySelectorAll("[data-node]")],
    edges = [...svg.querySelectorAll(".demo-edge")];
  let selected = "A1",
    mode = "board",
    tl;
  function paint() {
    nodes.forEach((n) => {
      const p = current[n.dataset.node];
      n.setAttribute("transform", `translate(${p.x},${p.y})`);
    });
    edges.forEach((e) => {
      const a = current[e.dataset.a],
        b = current[e.dataset.b];
      e.setAttribute("x1", a.x);
      e.setAttribute("y1", a.y);
      e.setAttribute("x2", b.x);
      e.setAttribute("y2", b.y);
    });
  }
  function select(id, announce = true) {
    selected = selected === id ? null : id;
    nodes.forEach((n) => {
      const id = n.dataset.node;
      n.classList.toggle("selected", id === selected);
      n.classList.toggle(
        "neighbor",
        !!selected && graph.adj[selected].includes(id),
      );
      n.setAttribute("aria-pressed", String(id === selected));
    });
    edges.forEach((e) =>
      e.classList.toggle(
        "active",
        e.dataset.a === selected || e.dataset.b === selected,
      ),
    );
    if (announce)
      G.$("#demo-caption").textContent = selected
        ? `${selected} se conecta a ${graph.adj[selected].join(" e ")}. O cavalo sempre se move em L.`
        : "Cada casa é um vértice. Toque para ver suas conexões.";
  }
  selected = null;
  select("A1", false);
  paint();
  function transform(view) {
    mode = view;
    if (tl) tl.kill();
    const target = view === "graph" ? circular : board;
    G.$("#demo-modes")
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.view === view)),
      );
    G.$("#demo-caption").textContent =
      view === "graph"
        ? "A forma muda. As 12 casas e 14 conexões continuam as mesmas."
        : "Cada casa é um vértice. Toque para ver suas conexões.";
    const tiles = svg.querySelector(".demo-tiles");
    if (!window.gsap || reduced.matches) {
      graph.V.forEach((id) => Object.assign(current[id], target[id]));
      tiles.style.opacity = view === "graph" ? 0 : 1;
      paint();
      return;
    }
    tl = gsap.timeline({
      defaults: { duration: 1.15, ease: "power3.inOut" },
      onUpdate: paint,
    });
    tl.to(tiles, { opacity: view === "graph" ? 0 : 1, duration: 0.5 }, 0);
    graph.V.forEach((id, i) =>
      tl.to(current[id], { ...target[id] }, i * 0.016),
    );
  }
  G.$("#demo-modes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) transform(b.dataset.view);
  });
  G.$("#demo-play").addEventListener("click", () =>
    transform(mode === "board" ? "graph" : "board"),
  );
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
  reduced.addEventListener("change", () => transform(mode));
  window.addEventListener("pagehide", () => {
    if (tl) tl.kill();
  });
  G.icons();
})(window.Graphos);
