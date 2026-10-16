/* Graphos / pecas: as peças do xadrez como grafos (fase 1.5).
   O tabuleiro é o mesmo; muda a REGRA que diz quem se liga a quem. Aqui o estudante
   troca de peça e observa o efeito no grafo: grau das casas, casas alcançáveis,
   distâncias e componentes conexas.

   Reutiliza o que já existe: as regras (js/regras.js, que agora traz torre, bispo,
   dama e rei), o motor de grafos (js/grafo.js), o desenho (js/estrutura.js) e o
   feedback (js/jogo.js). Nenhum movimento é simulado à mão: o grafo vem do motor. */
(function (G) {
  if (document.body.dataset.page !== "pecas" || (G.fase && G.fase.blocked)) return;
  const J = G.jogo,
    $ = G.$,
    svg = $("#bsvg");
  const SIZES = { "4x4": 4, "5x5": 5, "8x8": 8 };
  /* Duas etapas, como na Trilha: comparar graus e construir um caminho. */
  const ETAPAS = [
    {
      id: "graus",
      nome: "Graus diferentes",
      evidencia: "pecas:graus",
      tarefa:
        "Escolha uma casa de canto e conte quantos movimentos ela tem. Troque de peça e repita: o grau da mesma casa muda.",
      criterio: "Observar o grau de uma mesma casa em pelo menos duas peças diferentes.",
    },
    {
      id: "caminho",
      nome: "Caminhos de cada peça",
      evidencia: "pecas:caminho",
      tarefa:
        "Com a peça escolhida, toque em duas casas e confira se existe caminho entre elas e qual é o mais curto.",
      criterio: "Conferir um caminho entre duas casas (ou verificar que ele não existe).",
    },
  ];

  const Jor = G.jornada,
    free = !Jor || Jor.isFree(),
    PH = Jor ? Jor.PAGES.pecas || [] : [];
  /* Nome curto da peça, para as frases de retorno: "a torre", "o bispo". */
  const NOME = {
    knight: "o cavalo",
    rook: "a torre",
    bishop: "o bispo",
    queen: "a dama",
    king: "o rei",
  };
  const como = (k) => NOME[k] || G.rules[k].nome;
  /* Só a peça, sem artigo: para rótulos e frases que já trazem preposição. */
  const semArtigo = (k) => como(k).replace(/^[oa] /, "");
  const done = ETAPAS.map((_, i) => !free && Jor.isDone(PH[i]));
  const locked = (i) => !free && Jor.status(PH[i]) === "locked";
  const enviadas = new Set();
  let c = 0,
    peca = "rook",
    view = "board",
    /* Precisa acompanhar o `selected` de #size em pecas.html. */
    ord = SIZES["5x5"],
    grausVistos = new Set();

  /* Estado por etapa: o par de casas e a casa selecionada não se misturam entre
     "graus" e "caminho". */
  let etapas = [0, 1].map(() => ({ sel: null, pair: [] }));

  const fb = (kind, html) => J.say($("#fb"), kind, html);
  const respondeu = (i) => done[i] || (i === 0 && grausVistos.size >= 2);
  function conclui(i) {
    const primeira = !done[i];
    done[i] = true;
    if (!free && !enviadas.has(i)) {
      enviadas.add(i);
      Jor.evidence(ETAPAS[i].evidencia);
    }
    /* O painel depende do grafo atual; quem chamou já vai redesenhar em seguida. */
    if (primeira) {
      const { g } = monta();
      renderPainel(g, componentes(g));
      renderTarefa();
    }
  }
  /* Trocar de etapa: limpa a seleção da etapa de destino para não herdar estado. */
  function vaiPara(i, aviso) {
    if (i === c) return;
    if (i < 0 || i >= ETAPAS.length) return;
    if (locked(i)) {
      const miss = Jor.missing(PH[i]).map((m) => `${m.id} · ${m.nome}`).join(", ");
      return fb("bad", `Esta etapa pertence à fase ${PH[i]}, ainda bloqueada. Conclua antes: ${miss}.`);
    }
    c = i;
    etapas[c] = { sel: null, pair: [] };
    renderPainel(monta().g, componentes(monta().g));
    renderTarefa();
    aviso ? fb("info", aviso) : J.idle($("#fb"));
    draw();
  }

  /* ---------- Grafo da peça escolhida ---------- */
  function monta() {
    const structure = { rows: ord, cols: ord, active: G.allCells(ord, ord) };
    const p = { kind: "tabuleiro", structure, rule: { type: peca } };
    const g = G.graph.build(p);
    return { p, g };
  }
  const grau = (g, id) => g.adj[id].length;
  function componentes(g) {
    return G.graph.components(g);
  }
  function alcancaveis(g, src) {
    return Object.keys(G.graph.bfs(g, src).d);
  }

  /* ---------- Desenho ---------- */
  function draw() {
    const { p, g } = monta();
    const { sel, pair } = etapas[c];
    const cam = pair.length === 2 ? G.graph.path(g, pair[0], pair[1]) : null;
    const destaque = cam || [];
    const cls = (id) => {
      if (pair.includes(id)) return " sel";
      if (destaque.includes(id)) return " pth";
      if (sel && !pair.length && g.adj[sel].includes(id)) return " nb";
      return "";
    };
    const graphView = view === "graph";
    const arestas = graphView ? g.E : sel && !pair.length ? g.adj[sel].map((v) => [sel, v]) : destaque.slice(1).map((v, i) => [destaque[i], v]);
    G.board.render(svg, p, {
      graph: graphView,
      edges: arestas,
      edgeCls: () => (cam && cam.length > 1 ? " p" : sel && !pair.length ? " s" : ""),
      cls,
    });
    /* Números nas casas quando há um caminho revelado (a distância de cada casa). */
    if (cam && cam.length > 1) {
      const map = {};
      cam.forEach((id, k) => (map[id] = k));
      if (!graphView) J.labels(svg, p.structure, map, "dist");
    }
    const comps = componentes(g);
    $("#bcap").textContent = `${ord}×${ord} · G = (${g.V.length}, ${g.E.length})`;
    $("#pe-title").textContent = `Movimento: ${semArtigo(peca)}`;
    renderPainel(g, comps);
    $("#view").querySelectorAll("button").forEach((b) => {
      const on = b.dataset.view === view;
      b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("on", on);
    });
  }

  /* ---------- Painel: o que a peça faz com o grafo ---------- */
  function renderPainel(g, comps) {
    const graus = g.V.map((id) => grau(g, id));
    const max = Math.max(...graus),
      min = Math.min(...graus);
    const casaMax = g.V[graus.indexOf(max)],
      casaMin = g.V[graus.indexOf(min)];
    const regra = G.rules[peca];
    /* A peça aparece como rótulo curto: a frase inteira do movimento vive na nota
       abaixo, e aqui o número é o dado que interessa. */
    const curto = semArtigo(peca);
    $("#pinfo").innerHTML =
      `<div><dt>Peça</dt><dd class="peca-nome">${curto}</dd></div>` +
      `<div><dt>Casas</dt><dd class="peca-num">${g.V.length}</dd></div>` +
      `<div><dt>Maior grau</dt><dd class="ac peca-num">${max}<small class="mut"> em ${casaMax}</small></dd></div>` +
      `<div><dt>Menor grau</dt><dd class="peca-num">${min}<small class="mut"> em ${casaMin}</small></dd></div>` +
      `<div><dt>Arestas</dt><dd class="peca-num">${g.E.length}</dd></div>` +
      `<div><dt>Componentes</dt><dd class="peca-num">${comps.length}</dd></div>`;
    $("#pnota").textContent = regra.nota;
    /* Orientação por etapa: o que fazer agora. */
    const { pair } = etapas[c];
    const etapa = ETAPAS[c];
    $("#caminho-info").innerHTML = locked(c)
      ? `<b>Etapa bloqueada.</b> Conclua antes: ${Jor.missing(PH[c]).map((m) => `${m.id} · ${m.nome}`).join(", ")}.`
      : pair.length === 2
        ? (() => {
            const cam = G.graph.path(g, pair[0], pair[1]);
            const dist = cam ? cam.length - 1 : null;
            return dist === null
              ? `<b>${pair[0]}</b> e <b>${pair[1]}</b> estão em <b>componentes diferentes</b>: não existe caminho entre elas com o movimento da peça escolhida.`
              : `Caminho mais curto de <b>${pair[0]}</b> a <b>${pair[1]}</b>: <b>${dist}</b> ${dist === 1 ? "movimento" : "movimentos"} — ${cam.join(" → ")}.`;
          })()
        : pair.length === 1
          ? `Origem: <b>${pair[0]}</b> (grau ${grau(g, pair[0])}). Toque na casa de destino.`
          : "";
  }

  /* ---------- Área de tarefa ---------- */
  function renderTarefa() {
    const host = $("#ctask");
    if (!host) return;
    const etapa = ETAPAS[c],
      st = locked(c) ? "locked" : respondeu(c) ? "done" : "open";
    host.className = `ctask is-${st}`;
    /* Setas entre as etapas: depois de concluir a primeira, o estudante precisa de um
       caminho visível para a segunda — não pode depender de adivinhar. */
    const outras = ETAPAS.map((e, i) =>
      i === c
        ? ""
        : `<button type="button" class="sm${respondeu(i) ? "" : " g"}" data-etapa="${i}">${i < c ? "← " : ""}${i > c ? "" : ""}Etapa ${i + 1}: ${e.nome}${i > c ? " →" : ""}</button>`,
    ).join("");
    host.innerHTML =
      `<div class="ctask-bar"><p class="ctask-head"><span class="mono">${c + 1} / ${ETAPAS.length}</span> <b>${etapa.nome}</b>` +
      `<span class="chip is-${st === "open" ? "open" : st}">${st === "done" ? "Concluída" : st === "locked" ? "Bloqueada" : `Fase ${PH[c] || ""}`}</span></p>` +
      `<p class="ctask-todo"><b>Tarefa:</b> ${etapa.tarefa}</p></div>` +
      `<p class="ctask-obj">A mesma casa pode ter <b>graus diferentes</b> conforme a peça. O grau é o número de casas ligadas a ela pela regra de movimento.</p>` +
      (outras ? `<div class="row ctask-nav">${outras}</div>` : "");
  }

  /* ---------- Interação: toques no tabuleiro ----------
     A etapa ativa decide o que o toque faz; o estado de cada etapa é independente. */
  function tap(id) {
    const { g } = monta();
    if (!g.adj[id]) return;
    if (ETAPAS[c].id === "graus") {
      etapas[c].sel = id;
      const d = grau(g, id);
      grausVistos.add(peca);
      fb(
        "info",
        `Com <b>${como(peca)}</b>, a casa <b>${id}</b> tem grau <b>${d}</b>: ${J.plural(d, "movimento possível", "movimentos possíveis")}. ` +
          (grausVistos.size < 2
            ? `Agora troque de peça na barra do tabuleiro e toque na <b>mesma casa</b> (${id}) para comparar.`
            : `Você já comparou ${grausVistos.size} peças. Compare um canto com o centro: as peças que deslizam sentem mais a borda.`),
      );
      if (grausVistos.size >= 2) {
        conclui(0);
        fb(
          "ok",
          `Comparação feita: a casa <b>${id}</b> tem grau <b>${d}</b> com ${como(peca)}. ` +
            `O tabuleiro é o mesmo; mudou a regra. É a regra que decide quais arestas existem — e por isso o grafo de cada peça é diferente. ` +
            `Quando quiser, siga para a etapa 2 para conferir um caminho.`,
        );
      }
    } else {
      if (locked(1)) return;
      const par = etapas[c].pair;
      etapas[c].pair = par.length === 2 ? [id] : [...par, id];
      const pair = etapas[c].pair;
      if (pair.length === 2 && pair[0] === pair[1]) {
        etapas[c].pair = [id];
        return fb("info", "Escolha uma casa diferente para o destino.");
      }
      if (pair.length === 1) fb("info", `Origem: <b>${pair[0]}</b>. Agora toque na casa de destino.`);
      else {
        const cam = G.graph.path(g, pair[0], pair[1]);
        if (!cam) {
          conclui(1);
          fb(
            "info",
            `Não existe caminho entre <b>${pair[0]}</b> e <b>${pair[1]}</b> com <b>${como(peca)}</b>. ` +
              `O grafo dessa peça tem <b>${componentes(g).length} componentes</b>: alguns grupos de casas não se comunicam. ` +
              `O bispo, por exemplo, nunca sai da cor da casa em que está — por isso o grafo dele tem duas partes. ` +
              `Etapa concluída: você verificou uma separação real.`,
          );
          return draw();
        }
        conclui(1);
        const dist = cam.length - 1;
        fb(
          "ok",
          `De <b>${pair[0]}</b> a <b>${pair[1]}</b> o caminho mais curto tem <b>${dist}</b> ${dist === 1 ? "movimento" : "movimentos"}: ${cam.join(" → ")}. ` +
            `A busca em largura encontrou esse valor explorando por camadas: primeiro todas as casas a 1 movimento, depois a 2, e assim por diante. ` +
            `Compare com outra peça: com a dama a distância quase sempre cai para 1 ou 2.`,
        );
      }
    }
    draw();
  }

  /* ---------- Ações do painel ---------- */
  document.addEventListener("click", (e) => {
    /* Navegação entre as duas etapas. */
    const ir = e.target.closest("[data-etapa]");
    if (ir) return vaiPara(+ir.dataset.etapa);
    if (e.target.closest("[data-check-graus]")) {
      const { g } = monta();
      const sel = etapas[0].sel;
      if (!sel) return fb("bad", "Toque numa casa do tabuleiro primeiro.");
      const d = grau(g, sel);
      grausVistos.add(peca);
      if (grausVistos.size >= 2) {
        conclui(0);
        fb("ok", `A casa <b>${sel}</b> tem grau <b>${d}</b> com ${como(peca)}. Você já observou ${grausVistos.size} peças: a regra muda as arestas.`);
      } else
        fb("info", `A casa <b>${sel}</b> tem grau <b>${d}</b> com esta peça. Troque de peça e toque na mesma casa para comparar (faltam ${2 - grausVistos.size}).`);
      return draw();
    }
    if (e.target.closest("[data-check-caminho]")) {
      if (locked(1)) return fb("bad", "Esta etapa ainda está bloqueada.");
      if (etapas[1].pair.length < 2) return fb("bad", "Toque em duas casas do tabuleiro para formar um par.");
      return tap(etapas[1].pair[1]);
    }
  });

  $("#peca").addEventListener("click", (e) => {
    const b = e.target.closest("[data-peca]");
    if (!b) return;
    peca = b.dataset.peca;
    /* O estado da etapa vive em `etapas[c]` — o mesmo lugar que o desenho lê.
       (Antes esta limpeza escrevia em variáveis inexistentes e a troca de peça
       interrompia a atualização do painel.) */
    etapas[c] = { sel: null, pair: [] };
    syncPeca();
    renderPainel(monta().g, componentes(monta().g));
    renderTarefa();
    fb("info", `${G.rules[peca].nome}. ${G.rules[peca].descricao} Toque numa casa para ver o grau dela.`);
    draw();
  });
  function syncPeca() {
    $("#peca").querySelectorAll("button").forEach((b) => {
      const on = b.dataset.peca === peca;
      b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("on", on);
    });
  }
  function buildPecaBar() {
    $("#peca").innerHTML = G.pecas.map((k, i) => `<button type="button" data-peca="${k}" aria-pressed="${k === peca}">${G.rules[k].nome.replace("Movimento do ", "").replace("Movimento da ", "")}</button>`).join("");
    syncPeca();
  }
  $("#view").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    view = b.dataset.view;
    fb(
      "info",
      view === "graph"
        ? "O mesmo movimento, desenhado como grafo: cada casa vira um ponto e cada movimento possível vira uma linha."
        : "De volta ao tabuleiro: as casas continuam sendo os vértices e os movimentos, as arestas.",
    );
    draw();
  });
  $("#size").addEventListener("change", (e) => {
    ord = SIZES[e.target.value];
    etapas[c] = { sel: null, pair: [] };
    vp.fit();
    J.idle($("#fb"), `Tabuleiro ${e.target.value.replace("x", " × ")}. O resultado da sua ação aparece aqui.`);
    draw();
  });

  /* ---------- Início ---------- */
  const wanted = new URLSearchParams(location.search).get("etapa");
  const asked = G.fase && G.fase.focus ? PH.indexOf(G.fase.focus.id) : -1;
  c = asked >= 0 ? asked : Math.max(0, done.findIndex((d) => !d));
  if (c < 0) c = 0;
  if (locked(c)) c = Math.max(0, done.findIndex((d, i) => !d && !locked(i)));
  if (c < 0) c = 0;
  if (wanted && ETAPAS[+wanted - 1] && !locked(+wanted - 1)) c = +wanted - 1;
  const vp = G.viewport(svg, { fit: () => G.board.fit({ rows: ord, cols: ord }), tap });
  buildPecaBar();
  renderTarefa();
  J.idle($("#fb"));
  draw();
})(window.Graphos);
