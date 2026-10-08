/* The solution has one persistent transport and a single clock for both views. */
(function (G) {
  G.initSolution = ({ problem, solve, messages }) => {
    const p = G.project;
    if (!G.requireStructure()) return;
    const g = G.graph.of(p),
      prob = problem(p),
      bsvg = G.$("#bsvg"),
      gsvg = G.$("#gsvg");
    G.geometry.ensure(p, g);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let index = 0,
      timer = null,
      animation = null,
      speed = 1000,
      error = prob.error || "",
      cleanup = () => {};
    const moves = () => p.solution?.moves || [];
    const glyph = { W: "♘", B: "♞" };
    const deck = document.createElement("div");
    deck.className = "player-deck";
    deck.id = "transport";
    G.$(".viz").appendChild(deck);
    G.$(".viz").dataset.mobileScene = "board";
    G.$(".viz")
      .querySelectorAll(".card")
      .forEach((card, i) => (card.dataset.scene = i ? "graph" : "board"));
    G.$(".viz").insertAdjacentHTML(
      "afterbegin",
      `<div class="solution-view-tabs seg" aria-label="Visualização da solução"><button type="button" data-scene-tab="board" aria-pressed="true">${G.icon("squares-four")} Tabuleiro</button><button type="button" data-scene-tab="graph" aria-pressed="false">${G.icon("graph")} Grafo</button></div>`,
    );
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const cancelAnimation = () => {
      animation?.kill();
      animation = null;
      cleanup();
      cleanup = () => {};
    };
    const positions = () => {
      const pcs = { ...(prob.start || {}) };
      moves()
        .slice(0, index)
        .forEach((m) => {
          delete pcs[m.f];
          pcs[m.t] = m.c;
        });
      return pcs;
    };
    function draw() {
      const pcs = positions(),
        used = new Set(),
        last = index ? moves()[index - 1] : null;
      moves()
        .slice(0, index)
        .forEach((m) => {
          used.add(m.f + "|" + m.t);
          used.add(m.t + "|" + m.f);
        });
      const edgeCls = (a, b) =>
        last &&
        ((a === last.f && b === last.t) || (b === last.f && a === last.t))
          ? " p"
          : used.has(a + "|" + b)
            ? " s"
            : "";
      const cls = (id) => (last?.t === id ? " pth" : "");
      G.board.render(bsvg, p, {
        edges: g.E.filter(([a, b]) => used.has(a + "|" + b)),
        edgeCls,
        cls,
        pieces: pcs,
      });
      G.geometry.render(gsvg, p, g, { edgeCls, cls, pieces: pcs });
      G.$("#bcap").textContent = `${p.structure.rows} × ${p.structure.cols}`;
      G.$("#gcap").textContent = `G = (${g.V.length}, ${g.E.length})`;
      updateTransport();
      updateMoves();
    }
    function buildPanel() {
      G.$("#sol-title").textContent =
        prob.tipo === "troca"
          ? "Troca de cavalos"
          : prob.tipo
            ? `Caminho ${p.origin} → ${p.dest}`
            : "Sem problema definido";
      const box = G.$("#sol");
      if (!prob.tipo) {
        box.innerHTML = `<p class="warn">${error}</p>`;
        return;
      }
      box.innerHTML =
        `<div class="solution-summary"><button type="button" class="p wide" id="run">${p.solution ? "Recalcular solução" : "Encontrar solução"} ${G.icon("arrow-right")}</button><p class="mut" style="margin-top:14px">${prob.tipo === "troca" ? "Busca em largura: o menor número possível de movimentos para trocar as posições." : "Caminho mínimo entre origem e destino por busca em largura."}</p>${error ? `<p class="warn" role="alert">${error}</p>` : ""}` +
        (p.solution
          ? `<dl class="kv"><div><dt>Movimentos</dt><dd class="ac">${moves().length}</dd></div>${p.solution.states ? `<div><dt>Estados explorados</dt><dd style="font-size:23px">${p.solution.states}</dd></div>` : ""}</dl></div><div class="solution-list"><h4>Sequência de movimentos</h4><div class="moves" aria-label="Movimentos da solução">${moves()
              .map(
                (m, j) =>
                  `<button type="button" data-j="${j + 1}"><span class="mono">${String(j + 1).padStart(2, "0")}</span> ${glyph[m.c]} ${m.f} <span style="opacity:.5">→</span> ${m.t}</button>`,
              )
              .join(
                "",
              )}</div><details><summary>Trajetórias dos cavalos</summary><p class="mut" id="trajectories"></p></details><div class="row"><button type="button" class="g sm" id="txt">${G.icon("download-simple")} Baixar movimentos</button></div></div>`
          : "</div>");
    }
    function buildTransport() {
      if (!prob.tipo) {
        deck.innerHTML =
          '<p class="mut">Defina o problema nas etapas Estrutura e Análise para começar.</p>';
        return;
      }
      if (!p.solution) {
        deck.innerHTML =
          '<div><p class="mut">Acompanhe cada movimento nas duas representações.</p><button type="button" class="p" data-run>Encontrar solução</button></div>';
        return;
      }
      deck.innerHTML = `<div class="player-heading"><div class="player-caption"><span class="move-counter" id="move-counter">00</span><div><strong id="move-title"></strong><small id="move-detail" role="status"></small></div></div><label class="player-speed">Velocidade<select id="play-speed"><option value="1333">0,75×</option><option value="1000" selected>1×</option><option value="667">1,5×</option></select></label></div><input class="timeline" id="timeline" type="range" min="0" max="${moves().length}" value="0" step="1" aria-label="Movimento da solução"><div class="pb"><button type="button" data-s="first" aria-label="Reiniciar">${G.icon("skip-back")}</button><button type="button" data-s="-1" aria-label="Passo anterior">${G.icon("caret-left")}</button><button type="button" class="p" data-s="play" aria-label="Reproduzir">${G.icon("play")}</button><button type="button" data-s="pause" aria-label="Pausar">${G.icon("pause")}</button><button type="button" data-s="1" aria-label="Próximo passo">${G.icon("caret-right")}</button></div>`;
      G.$("#play-speed").value = String(speed);
    }
    function updateTransport(moving = false) {
      if (!prob.tipo || !p.solution) return;
      const n = moves().length,
        last = moves()[index - 1],
        done = index === n && !moving;
      G.$(".viz").classList.toggle("solution-complete", done);
      G.$("#move-counter").textContent = String(index).padStart(2, "0");
      G.$("#move-title").textContent = done
        ? prob.tipo === "troca"
          ? "Troca concluída."
          : "Destino alcançado."
        : last
          ? `${last.c === "W" ? "Branco" : "Preto"}: ${last.f} → ${last.t}`
          : "Cada movimento conta.";
      G.$("#move-detail").textContent = done
        ? `${n} movimentos. A solução mínima está completa.`
        : index
          ? `Movimento ${index} de ${n}${timer ? " · Reproduzindo" : ""}`
          : "Reproduza ou percorra a sequência no seu ritmo.";
      G.$("#timeline").value = String(index);
      G.$("#timeline").setAttribute(
        "aria-valuetext",
        `Movimento ${index} de ${n}`,
      );
      G.$('[data-s="play"]').setAttribute("aria-pressed", String(!!timer));
      G.$('[data-s="pause"]').disabled = !timer;
      G.$('[data-s="-1"]').disabled = index === 0;
      G.$('[data-s="1"]').disabled = index === n;
    }
    function updateMoves() {
      G.$("#sol")
        .querySelectorAll("[data-j]")
        .forEach((row) => {
          const active = +row.dataset.j === index;
          row.classList.toggle("cur", active);
          if (active) row.setAttribute("aria-current", "step");
          else row.removeAttribute("aria-current");
        });
      const trajectories = Object.entries(prob.start || {}).map(([v, c]) => ({
        c,
        r: [v],
      }));
      moves()
        .slice(0, index)
        .forEach((m) => {
          const t = trajectories.find((t) => t.c === m.c && t.r.at(-1) === m.f);
          if (t) t.r.push(m.t);
        });
      if (G.$("#trajectories"))
        G.$("#trajectories").innerHTML = trajectories
          .map((t) => `${glyph[t.c]} ${t.r.join(" → ")}`)
          .join("<br>");
    }
    function animateMove(m, backward) {
      if (!window.gsap || reduced.matches) return updateTransport();
      const from = backward ? m.t : m.f,
        to = backward ? m.f : m.t;
      const boardPiece = bsvg.querySelector(`[data-piece="${to}"]`),
        graphPiece = gsvg.querySelector(`[data-piece="${to}"]`);
      if (!boardPiece || !graphPiece) return;
      const els = G.elements(p.structure),
        a = els.find((e) => e.id === from),
        b = els.find((e) => e.id === to);
      const boardDelta = [(a.c - b.c) * 50, (a.r - b.r) * 50],
        graphDelta = [
          p.positions[from][0] - p.positions[to][0],
          p.positions[from][1] - p.positions[to][1],
        ];
      const target = graphPiece.closest(".n"),
        color = m.c;
      // Carry the occupied vertex with its horse; the graph's vertices stay fixed.
      const traveler = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      traveler.setAttribute("class", `piece-traveler n ${color}`);
      traveler.setAttribute("aria-hidden", "true");
      traveler.appendChild(target.querySelector("circle").cloneNode(true));
      traveler.appendChild(graphPiece.cloneNode(true));
      gsvg.appendChild(traveler);
      target.classList.remove(color);
      graphPiece.style.opacity = "0";
      cleanup = () => {
        traveler.remove();
        graphPiece.style.opacity = "";
        target.classList.add(color);
        boardPiece.removeAttribute("transform");
        boardPiece.style.transform = "";
      };
      boardPiece.setAttribute(
        "transform",
        `translate(${boardDelta[0]} ${boardDelta[1]})`,
      );
      traveler.setAttribute(
        "transform",
        `translate(${graphDelta[0]} ${graphDelta[1]})`,
      );
      updateTransport(true);
      const clock = { t: 0 },
        duration = Math.min(0.72, (speed / 1000) * 0.75);
      animation = gsap.to(clock, {
        t: 1,
        duration,
        ease: "power2.inOut",
        onUpdate: () => {
          const t = clock.t,
            arc = Math.sin(Math.PI * t) * 9;
          boardPiece.setAttribute(
            "transform",
            `translate(${boardDelta[0] * (1 - t)} ${boardDelta[1] * (1 - t) - arc})`,
          );
          traveler.setAttribute(
            "transform",
            `translate(${graphDelta[0] * (1 - t)} ${graphDelta[1] * (1 - t)})`,
          );
        },
        onComplete: () => {
          cleanup();
          cleanup = () => {};
          animation = null;
          updateTransport();
        },
      });
    }
    function moveTo(next, animate = true) {
      cancelAnimation();
      const before = index;
      index = Math.max(0, Math.min(moves().length, next));
      if (index === moves().length) stop();
      draw();
      if (animate && Math.abs(index - before) === 1)
        animateMove(moves()[Math.max(index, before) - 1], index < before);
    }
    function play() {
      stop();
      if (!moves().length) return;
      if (index === moves().length) moveTo(0, false);
      timer = setInterval(() => moveTo(index + 1), speed);
      updateTransport();
    }
    function run() {
      stop();
      cancelAnimation();
      const result = solve(p, g, prob);
      index = 0;
      if (result.moves) {
        p.solution = { moves: result.moves, states: result.states };
        error = "";
      } else {
        p.solution = null;
        error = messages[result.error] || messages.nosol;
      }
      G.save();
      buildPanel();
      buildTransport();
      draw();
    }
    G.$(".work").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.sceneTab) {
        stop();
        cancelAnimation();
        G.$(".viz").dataset.mobileScene = b.dataset.sceneTab;
        G.$(".solution-view-tabs")
          .querySelectorAll("button")
          .forEach((button) =>
            button.setAttribute("aria-pressed", String(button === b)),
          );
        draw();
        if (window.gsap && !reduced.matches)
          gsap.fromTo(
            G.$(`[data-scene="${b.dataset.sceneTab}"]`),
            { opacity: 0.4 },
            { opacity: 1, duration: 0.3 },
          );
        return;
      }
      if (b.id === "run" || b.hasAttribute("data-run")) return run();
      if (b.id === "txt")
        return G.download(
          "movimentos.txt",
          moves()
            .map((m, j) => `${j + 1}. ${m.c} ${m.f}->${m.t}`)
            .join("\n"),
        );
      if (b.dataset.j) {
        stop();
        return moveTo(+b.dataset.j, false);
      }
      const s = b.dataset.s;
      if (!s) return;
      if (s === "play") return play();
      stop();
      if (s === "pause") return updateTransport(!!animation);
      moveTo(s === "first" ? 0 : index + Number(s), s !== "first");
    });
    deck.addEventListener("input", (e) => {
      if (e.target.id === "timeline") {
        stop();
        moveTo(+e.target.value, false);
      }
    });
    deck.addEventListener("change", (e) => {
      if (e.target.id === "play-speed") {
        speed = +e.target.value;
        if (timer) play();
      }
    });
    G.viewport(bsvg, { fit: () => G.board.fit(p.structure) });
    G.viewport(gsvg, { fit: () => G.geometry.fit(p.positions) });
    G.correspondence();
    const suspend = () => {
      stop();
      cancelAnimation();
      updateTransport();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) suspend();
    });
    window.addEventListener("pagehide", suspend);
    reduced.addEventListener("change", () => {
      if (reduced.matches) {
        cancelAnimation();
        updateTransport();
      }
    });
    if (prob.tipo && !p.solution && p.exampleId) run();
    else {
      buildPanel();
      buildTransport();
      draw();
    }
  };
})(window.Graphos);
