/* Graphos / explorar: vértice, aresta, adjacência, caminho e distância sobre o tabuleiro do cavalo. */
(function (G) {
  if (document.body.dataset.page !== "explorar" || (G.fase && G.fase.blocked)) return;
  const J = G.jogo,
    $ = G.$,
    svg = $("#bsvg");
  const SIZES = { "4x3": [4, 3], "5x5": [5, 5], "6x6": [6, 6], "8x8": [8, 8] };
  const CONCEPTS = [
    {
      nome: "Vértice",
      texto: "Cada casa do tabuleiro é um <b>vértice</b>: um ponto do grafo.",
      tarefa:
        "Toque num canto e numa casa do centro. Compare quantas arestas saem de cada uma.",
    },
    {
      nome: "Aresta",
      texto:
        "Cada salto em L possível liga duas casas. Essa ligação é uma <b>aresta</b>.",
      tarefa:
        "Toque em B3 e conte as arestas que saem dela. Depois, faça uma previsão para o canto A1.",
    },
    {
      nome: "Adjacência",
      texto:
        "Duas casas são <b>adjacentes</b> quando há uma aresta entre elas.",
      tarefa:
        "Toque em duas casas. Teste um par adjacente e um par que não é.",
    },
    {
      nome: "Caminho",
      texto:
        "Um <b>caminho</b> é uma sequência de casas em que cada casa é adjacente à seguinte.",
      tarefa:
        "Toque numa casa e continue pelos saltos do cavalo, até formar um caminho de pelo menos 3 arestas.",
    },
    {
      nome: "Distância",
      texto:
        "A <b>distância</b> entre duas casas é o menor número de arestas de um caminho entre elas.",
      tarefa:
        "Escolha duas casas, aposte a distância e confira com a busca em largura.",
    },
  ];

  let p, g, c, view;
  let sel = null,
    pair = [],
    path = [],
    seen = { sim: false, nao: false },
    reveal = null; // { dist, path, layers } após conferir a distância
  let guess = { c: -1, v: "" }; // último palpite digitado, por conceito
  /* Cada conceito corresponde a uma fase da jornada (ver js/jornada.js). O estado de conclusão
     vem do motor; no modo livre nada é lido nem gravado. */
  const Jor = G.jornada,
    free = !Jor || Jor.isFree(),
    PH = Jor ? Jor.PAGES.explorar : [];
  const done = CONCEPTS.map((_, i) => !free && Jor.isDone(PH[i]));
  const locked = (i) => !free && Jor.status(PH[i]) === "locked";
  const sent = new Set(); // evidência enviada uma vez por conceito nesta visita
  const degrees = new Set(); // graus observados no conceito 0
  const revealed = new Set(); // pares cuja distância já foi revelada (conceito 4)
  const askedIdx = G.fase && G.fase.focus ? PH.indexOf(G.fase.focus.id) : -1;
  c = askedIdx >= 0 ? askedIdx : Math.max(0, done.findIndex((d) => !d));
  if (locked(c)) c = Math.max(0, done.findIndex((d, i) => !d && !locked(i)));
  view = "board";

  function setSize(key) {
    const [r, k] = SIZES[key];
    p = J.board(r, k);
    g = G.graph.of(p);
    reset();
  }
  function reset() {
    sel = null;
    pair = [];
    path = [];
    seen = { sim: false, nao: false };
    reveal = null;
  }
  function complete(i) {
    const first = !done[i];
    done[i] = true;
    if (!free && !sent.has(i)) {
      sent.add(i);
      J.store.set("explorar", { done });
      Jor.evidence(`explorar:${i}`);
      if (done.every(Boolean)) J.meta("conceitos");
    }
    if (first) renderConcepts();
  }

  /* ---------- Desenho ---------- */
  const edgesOf = (ids) =>
    g.E.filter(([a, b]) => ids.includes(a) || ids.includes(b));
  function draw() {
    let cls = () => "",
      edges = [],
      edgeCls = () => " s";
    if (c === 0) cls = (id) => (id === sel ? " sel" : "");
    if (c === 1 && sel) {
      const nb = g.adj[sel];
      cls = (id) => (id === sel ? " sel" : nb.includes(id) ? " nb" : "");
      edges = edgesOf([sel]).filter(([a, b]) => a === sel || b === sel);
    }
    if (c === 2) {
      cls = (id) => (pair.includes(id) ? " sel" : "");
      if (pair.length === 2 && g.adj[pair[0]].includes(pair[1]))
        edges = g.E.filter(
          ([a, b]) =>
            (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]),
        );
    }
    if (c === 3 && path.length) {
      const end = path.at(-1),
        nb = g.adj[end];
      cls = (id) =>
        id === end ? " sel" : path.includes(id) ? " pth" : nb.includes(id) ? " nb" : "";
      edges = path.slice(1).map((v, i) => [path[i], v]);
      edgeCls = () => " p";
    }
    if (c === 4) {
      cls = (id) =>
        reveal && reveal.path.includes(id)
          ? " pth"
          : pair.includes(id)
            ? " sel"
            : "";
      if (reveal) {
        edges = reveal.path.slice(1).map((v, i) => [reveal.path[i], v]);
        edgeCls = () => " p";
      }
    }
    const graphView = view === "graph";
    G.board.render(svg, p, {
      graph: graphView,
      vertices: !graphView && c === 0,
      edges: graphView ? g.E : edges,
      edgeCls: graphView
        ? (a, b) => (edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ? (c === 3 || c === 4 ? " p" : " s") : "")
        : edgeCls,
      cls,
    });
    if (c === 4 && reveal) {
      const map = {};
      reveal.layers.forEach((ids, k) => ids.forEach((id) => (map[id] = k)));
      J.labels(svg, p.structure, map, "dist");
    }
    $("#bcap").textContent =
      `${p.structure.rows}×${p.structure.cols} · G = (${g.V.length}, ${g.E.length})`;
    document.querySelectorAll("#view button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.view === view));
      b.classList.toggle("on", b.dataset.view === view);
    });
  }

  /* ---------- Toques no tabuleiro ---------- */
  const fb = (kind, html) => J.say($("#fb"), kind, html);
  function tap(id) {
    if (!g.adj[id]) return;
    if (c === 0) {
      sel = id;
      const d = g.adj[id].length;
      degrees.add(d);
      const more = degrees.size < 2;
      fb(
        more ? "info" : "ok",
        `<b>${id}</b> é um vértice. Seu <b>grau</b> é ${d}: ${J.plural(d, "aresta sai", "arestas saem")} dele.` +
          (more
            ? " Agora toque numa casa de grau diferente (compare um canto com o centro)."
            : " Vértices diferentes têm graus diferentes: a posição no tabuleiro importa."),
      );
      if (!more) complete(0);
    } else if (c === 1) {
      sel = id;
      const nb = g.adj[id];
      fb(
        "info",
        `De <b>${id}</b> ${nb.length === 1 ? "sai" : "saem"} ${J.plural(nb.length, "aresta", "arestas")}, para ${J.list(nb)}. Cada uma é um salto em L que cabe no tabuleiro.`,
      );
    } else if (c === 2) {
      pair = pair.length === 2 ? [id] : [...pair, id];
      if (pair.length === 1)
        fb("info", `Primeira casa: <b>${id}</b>. Toque numa segunda casa.`);
      else if (pair[0] === pair[1]) {
        pair = [id];
        fb("info", "Escolha uma casa diferente para comparar.");
      } else {
        const [a, b] = pair,
          adj = g.adj[a].includes(b),
          [r1, c1] = J.rc(a),
          [r2, c2] = J.rc(b);
        seen[adj ? "sim" : "nao"] = true;
        fb(
          adj ? "ok" : "info",
          adj
            ? `<b>${a}</b> e <b>${b}</b> são adjacentes: o deslocamento é (${Math.abs(r1 - r2)}, ${Math.abs(c1 - c2)}). Repare que uma casa é ${J.shadeName(a)} e a outra é ${J.shadeName(b)}.`
            : `<b>${a}</b> e <b>${b}</b> não são adjacentes: o deslocamento (${Math.abs(r1 - r2)}, ${Math.abs(c1 - c2)}) não é em L, ou seja, não é (1, 2) nem (2, 1).`,
        );
        if (seen.sim && seen.nao) complete(2);
      }
    } else if (c === 3) {
      if (!path.length) {
        path = [id];
        fb("info", `Início do caminho em <b>${id}</b>. Siga por um salto do cavalo.`);
      } else {
        const last = path.at(-1);
        if (id === last) return;
        if (!g.adj[last].includes(id))
          return fb("bad", J.explainIllegal(p.structure, last, id, {}));
        path.push(id);        const n = path.length - 1;
        fb(
          n >= 3 ? "ok" : "info",
          `Caminho com ${J.plural(n, "aresta", "arestas")}: ${path.join(" → ")}.` +
            (n >= 3 ? " Um caminho de verdade, porque cada passo é uma aresta." : ""),
        );
        if (n >= 3) complete(3);
      }
    } else if (c === 4) {
      pair = pair.length === 2 ? [id] : [...pair, id];
      reveal = null;
      guess = { c: -1, v: "" };
      if (pair.length === 1)
        fb("info", `Origem: <b>${id}</b>. Toque na casa de destino.`);
      else if (pair[0] === pair[1]) {
        pair = [id];
        fb("info", "Escolha um destino diferente da origem.");
      } else
        fb(
          "info",
          `De <b>${pair[0]}</b> a <b>${pair[1]}</b>. Quantos saltos você acha que são necessários, no mínimo?`,
        );
      renderExtra();
    }
    draw();
  }

  /* ---------- Objetivo e tarefa, junto do tabuleiro ----------
     O estudante precisa ver o problema e responder sem procurar os controles pela tela.
     Por isso o conceito, a definição e a tarefa ficam num único lugar, imediatamente
     antes do tabuleiro. A explicação longa e as setas ficam no painel de etapas.
     `ctask-bar` (nome + tarefa) permanece visível em telas pequenas enquanto o
     estudante olha a figura; a definição rola junto porque não é instrução de ação. */
  function renderTask() {
    const host = $("#ctask");
    if (!host) return;
    const k = CONCEPTS[c],
      st = locked(c) ? "locked" : done[c] ? "done" : "open";
    host.className = `ctask is-${st}`;
    host.innerHTML =
      `<div class="ctask-bar"><p class="ctask-head"><span class="mono">${c + 1} / ${CONCEPTS.length}</span> <b>${k.nome}</b>` +
      `<span class="chip is-${st === "open" ? "open" : st}">${st === "done" ? "Concluída" : st === "locked" ? "Bloqueada" : `Fase ${PH[c] || ""}`}</span></p>` +
      `<p class="ctask-todo"><b>Tarefa:</b> ${k.tarefa}</p></div>` +
      `<p class="ctask-obj">${k.texto}</p><div id="c-extra"></div>`;
    renderExtra();
  }

  /* ---------- Painel de conceitos: só as etapas, para não repetir o que está
     ao lado do tabuleiro. ---------- */
  function renderConcepts() {
    $("#concepts").innerHTML = CONCEPTS.map((k, i) => {
      const on = i === c;
      return (
        `<li class="concept${on ? " on" : ""}${done[i] ? " done" : ""}${locked(i) ? " locked" : ""}">` +
        `<button type="button" class="c-head" data-c="${i}" aria-expanded="${on}"${locked(i) ? ' aria-disabled="true"' : ""}><span class="c-no" aria-hidden="true">${done[i] ? G.icon("check") : locked(i) ? G.icon("lock") : i + 1}</span><b>${k.nome}</b><span class="c-ph mono">fase ${PH[i] || ""}</span>${done[i] ? '<span class="sr-only"> (concluído)</span>' : ""}${locked(i) ? '<span class="sr-only"> (bloqueado)</span>' : ""}</button>` +
        (on
          ? `<div class="c-body"><div class="row">${i > 0 ? '<button type="button" class="g sm" data-go="-1">Anterior</button>' : ""}${i < CONCEPTS.length - 1 ? `<button type="button" class="sm ${done[i] ? "p" : ""}" data-go="1">Próximo conceito ${G.icon("arrow-right")}</button>` : ""}</div></div>`
          : "") +
        `</li>`
      );
    }).join("");
    renderTask();
  }
  function renderExtra() {
    const el = $("#c-extra");
    if (!el) return;
    if (c === 1)
      el.innerHTML = `<label class="ask">Quantas arestas saem do canto A1?<span class="ask-row"><input id="guess" type="number" min="0" inputmode="numeric" autocomplete="off"><button type="button" class="sm p" data-check>Conferir</button></span></label>`;
    else if (c === 4)
      el.innerHTML =
        pair.length === 2
          ? `<label class="ask">Distância de ${pair[0]} a ${pair[1]}, em arestas<span class="ask-row"><input id="guess" type="number" min="0" inputmode="numeric" autocomplete="off"><button type="button" class="sm p" data-check>Conferir</button></span></label>`
          : "";
    else el.innerHTML = "";
    if (guess.c === c && $("#guess")) $("#guess").value = guess.v; // sobrevive ao redesenho
  }
  function check() {
    const input = $("#guess"),
      v = Number(input?.value);
    if (!input || input.value.trim() === "" || !Number.isInteger(v) || v < 0)
      return fb("bad", "Digite um número inteiro, 0 ou maior.");
    if (c === 1) {
      const real = g.adj.A1.length;
      sel = "A1";
      if (v === real) {
        fb(
          "ok",
          `Isso mesmo: <b>${real}</b>. No canto, só dois saltos em L cabem no tabuleiro (${J.list(g.adj.A1)}). Casas do centro têm mais arestas.`,
        );
        complete(1);
      } else
        fb(
          "bad",
          `Ainda não. Toque em A1 e veja quais saltos em L terminam dentro do tabuleiro. Tente de novo.`,
        );
      draw();
    } else if (c === 4) {
      const [a, b] = pair,
        pth = G.graph.path(g, a, b),
        real = pth.length - 1;
      const pairKey = [a, b].sort().join("-"),
        fresh = !revealed.has(pairKey);
      revealed.add(pairKey);
      reveal = { dist: real, path: pth, layers: J.layers(g, a) };
      const where = reveal.layers.findIndex((ids) => ids.includes(b));
      fb(
        v === real ? "ok" : "info",
        (v === real
          ? `Acertou: d(${a}, ${b}) = <b>${real}</b>. `
          : `A distância é <b>${real}</b>, não ${v}. Sem problema: veja por quê. `) +
          `Os números nas casas mostram a camada da busca em largura: ${b} só aparece na camada ${where}, depois de esgotar as casas mais próximas. Um caminho mínimo: ${pth.join(" → ")}.`,
      );
      if (v === real && fresh) complete(4);
      else if (v === real)
        fb("info", `Acertou, mas a distância desse par já tinha sido revelada. Escolha outro par e aposte antes de conferir.`);
      draw();
    }
  }
  /* Os controles de resposta vivem na área de tarefa (junto do tabuleiro) e o
     restante no painel de conceitos. A delegação no documento cobre os dois,
     mesmo depois de qualquer redesenho. */
  document.addEventListener("click", (e) => {
    const head = e.target.closest("[data-c]"),
      go = e.target.closest("[data-go]");
    if (e.target.closest("[data-check]")) return check();
    if (head || go) {
      const to = head ? +head.dataset.c : Math.max(0, Math.min(CONCEPTS.length - 1, c + +go.dataset.go));
      if (locked(to)) {
        const miss = Jor.missing(PH[to]).map((m) => `${m.id} · ${m.nome}`).join(", ");
        return fb("bad", `Este conceito pertence à fase ${PH[to]}, ainda bloqueada. Conclua antes: ${miss}.`);
      }
      c = to;
      reset();
      guess = { c: -1, v: "" };
      renderConcepts();
      fb("info", CONCEPTS[c].tarefa);
      draw();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "guess") guess = { c, v: e.target.value };
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "guess") {
      e.preventDefault();
      check();
    }
  });
  $("#view").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    view = b.dataset.view;
    draw();
    fb(
      "info",
      view === "graph"
        ? "Mesmo problema, outro desenho: pontos e linhas. As ligações continuam as mesmas."
        : "De volta ao tabuleiro. As casas são os vértices; os saltos, as arestas.",
    );
  });
  $("#size").addEventListener("change", (e) => {
    setSize(e.target.value);
    vp.fit();
    renderConcepts();
    fb("info", `Tabuleiro ${e.target.value.replace("x", " × ")}. ${CONCEPTS[c].tarefa}`);
    draw();
  });

  setSize("5x5");
  const vp = G.viewport(svg, { fit: () => G.board.fit(p.structure), tap });
  renderConcepts();
  fb("info", CONCEPTS[c].tarefa);
  draw();
})(window.Graphos);
