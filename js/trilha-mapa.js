/* Graphos / trilha-mapa: interface do mapa da Trilha de Aprendizagem (página Aprender).
   Só apresenta e navega: XP, desbloqueio, conclusão e conquistas vêm de G.jornada (js/jornada.js).

   Composição: uma trilha contínua, um nó por fase, ligado aos seus pré-requisitos.
   Cada nó recebe (x, linha) de TRAIL; a posição vertical é derivada da linha, então o
   desenho não depende de medir a lista inteira — só as duas pontas de cada aresta.
   O nó é 64px (56px no celular) e o nome fica ao lado, no espaço mais largo da linha,
   para o texto não competir com o caminho.

   Estados (nunca só por cor): concluída = ✓; bloqueada = cadeado + contorno tracejado;
   disponível = número da fase com anel; recomendada = rótulo "Próxima" + anel. */
(function (G) {
  const Jor = G.jornada,
    $ = G.$;
  if (document.body.dataset.page !== "trilha" || !Jor) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  /* Posição na trilha: x em fração da largura (o miolo útil vai de 0,20 a 0,80, para
     que o nó e o rótulo nunca saiam do quadro) e a linha (1..6). O mapa zigue-zagueia
     para o lado oposto ao do mundo anterior, então o percurso tem direção visível sem
     precisar de setas. */
  const TRAIL = {
    "1.1": [0.2, 1], "1.2": [0.38, 2], "1.3": [0.68, 3], "1.4": [0.8, 4], "1.5": [0.58, 5],
    "2.1": [0.26, 1], "2.2": [0.5, 2], "2.3": [0.74, 3],
    "3.1": [0.8, 1], "3.2": [0.62, 2], "3.3": [0.38, 3], "3.4": [0.2, 4],
    "4.1": [0.3, 1], "4.2": [0.56, 2], "4.3": [0.78, 3],
    "5.1": [0.74, 1], "5.2": [0.46, 2], "5.3": [0.22, 3],
  };
  /* Alinhamento do rótulo: nas pontas o texto é encostado para dentro, senão o nome
     de uma fase comprida passaria da borda do quadro. */
  const alignOf = (x) => (x < 0.3 ? "align-l" : x > 0.7 ? "align-r" : "align-c");
  /* Linha do primeiro nó (1 = topo do contêiner) e o recuo do contêiner para o
     primeiro trecho subir: mantém o respiro do rótulo "Próxima", que fica acima do nó. */
  const FIRST_ROW = 1;
  const NEW_MS = 90 * 1000; // destaque discreto para fases concluídas há pouco
  const query = new URLSearchParams(location.search).get("fase");
  let sel = Jor.phase(query) ? query : (Jor.next() || Jor.PHASES[Jor.PHASES.length - 1]).id;

  const stLabel = { done: "Concluída", available: "Disponível", locked: "Bloqueada" };
  const label = (p) => `Fase ${p.id} · ${p.nome}`;

  /* ---------- Chamada principal: a próxima fase e o progresso ----------
     Única faixa com ação da página. O progresso aparece aqui uma vez; o resto
     (conquistas, histórico) vive na página Progresso. */
  function renderStatus() {
    const r = Jor.summary(),
      next = r.next;
    $("#j-go").innerHTML = next
      ? `<p class="lbl">${r.done ? "Continue de onde parou" : "Comece aqui"}</p><p class="go-name"><span class="mono">${esc(next.id)}</span> ${esc(next.nome)}</p><a class="btn p lg" href="${next.href}">${r.done ? "Continuar" : "Começar"} ${G.icon("arrow-right")}</a><div class="go-prog-wrap"><p class="go-prog"><span class="mono">${r.done}/${r.total} fases · ${r.xp} XP</span></p><div class="bar" role="progressbar" aria-label="Progresso da jornada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}"><i style="width:${r.pct}%"></i></div></div>`
      : `<p class="lbl">Jornada concluída</p><p class="go-name">Você concluiu todas as fases disponíveis.</p><a class="btn lg" href="lab.html">Explorar no Laboratório ${G.icon("arrow-right")}</a><div class="go-prog-wrap"><p class="go-prog"><span class="mono">${r.done}/${r.total} fases · ${r.xp} XP</span></p></div>`;
    $("#storage-note").textContent = Jor.persistent ? "" : "Armazenamento indisponível: o progresso dura só nesta aba.";
  }

  /* ---------- Mapa: trilha contínua ----------
     Linhas globais (1..N): o cabeçalho do mundo ocupa a primeira linha do seu trecho,
     as fases as seguintes. A altura do contêiner é `--rows` × `--trail-h`, então o
     desenho não depende de medir a lista inteira — só as duas pontas de cada aresta. */
  const stateChip = (w) => {
    if (Jor.worldDone(w.id)) return ["done", "Concluído"];
    if (Jor.status(w.fases[0]) === "locked") return ["locked", `Bloqueado · conclua ${Jor.missing(w.fases[0]).map((m) => m.id).join(", ")}`];
    return ["open", "Em andamento"];
  };
  function renderMap() {
    const rec = Jor.next(),
      now = Date.now();
    let row = FIRST_ROW - 1; // o primeiro cabeçalho entra na linha FIRST_ROW
    const parts = [];
    Jor.WORLDS.forEach((w) => {
      const [cls, txt] = stateChip(w),
        nDone = w.fases.filter((f) => Jor.isDone(f)).length;
      row += 1; // linha 1 do trecho: cabeçalho do mundo
      parts.push(
        `<header class="w-head is-${cls}" data-world="${w.id}" style="--row:${row}"><h2 id="w-${w.id}"><span class="w-no mono">${w.n}</span><span class="w-name">${esc(w.nome)}</span></h2><p class="w-meta"><span class="mono">${nDone}/${w.fases.length}</span><span class="chip is-${cls}">${esc(txt)}</span></p></header>`,
      );
      w.fases.forEach((id, i) => {
        row += 1;
        const p = Jor.phase(id),
          st = Jor.status(id),
          [x] = TRAIL[id] || [0.5, 1];
        const isRec = rec && rec.id === id,
          isNew = st === "done" && !Jor.isLegacy(id) && now - Jor.doneAt(id) < NEW_MS;
        const state = st === "done" ? "Concluída" : st === "locked" ? `Bloqueada, requer ${Jor.missing(id).map((m) => m.id).join(", ")}` : isRec ? "Fase recomendada" : "Disponível";
        const inner = st === "done" ? G.icon("check") : st === "locked" ? G.icon("lock") : esc(id);
        /* Nome abaixo do nó: o caminho tem o campo livre e a leitura fica sempre no
           mesmo lugar, sem cruzar a linha do traçado. */
        parts.push(
          `<button type="button" class="node is-${st}${isRec ? " is-rec" : ""}${isNew ? " is-new" : ""}${sel === id ? " is-sel" : ""} ${alignOf(x)}" data-id="${id}" style="--x:${(x * 100).toFixed(1)}%;--row:${row}" aria-pressed="${sel === id}" aria-label="${esc(label(p))}. ${state}. ${p.xp} XP.">` +
            (isRec ? `<span class="node-tag">${Jor.doneCount() ? "Próxima" : "Comece aqui"}</span>` : "") +
            `<span class="node-dot" aria-hidden="true">${inner}</span>` +
            `<span class="node-side"><span class="node-name">${esc(p.nome)}</span></span>` +
            `</button>`,
        );
      });
    });
    const map = $("#jmap-worlds");
    map.style.setProperty("--rows", row + 1); // uma linha de respiro no fim
    map.style.setProperty("--pull", "calc(var(--trail-h) * -0.35)");
    map.innerHTML = parts.join("");
    drawEdges();
  }
  function drawEdges() {
    const box = $("#jmap"),
      svg = $("#jmap-edges");
    if (!box || !svg) return;
    const b = box.getBoundingClientRect(),
      W = Math.round(b.width),
      H = Math.round(box.scrollHeight);
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    const rect = (id) => {
      const el = box.querySelector(`.node[data-id="${id}"] .node-dot`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { cx: r.left - b.left + r.width / 2, cy: r.top - b.top + r.height / 2 };
    };
    let h = "";
    Jor.PHASES.forEach((p) =>
      p.requires.forEach((rq) => {
        const A = rect(rq),
          B = rect(p.id);
        if (!A || !B) return;
        const state = Jor.isDone(rq) ? (Jor.isDone(p.id) ? "done" : "open") : "locked";
        /* Curva vertical entre os dois nós: o traçado continua legível no zigue-zague. */
        const m = (A.cy + B.cy) / 2;
        h += `<path class="edge is-${state}" d="M${A.cx} ${A.cy}C${A.cx} ${m} ${B.cx} ${m} ${B.cx} ${B.cy}"/>`;
      }),
    );
    svg.innerHTML = h;
  }

  /* ---------- Painel de detalhes da fase ----------
     No desktop é uma coluna ao lado do mapa; no celular vira folha presa ao rodapé,
     com o essencial (objetivo e ação) e o resto sob demanda. */
  function renderPanel() {
    const p = Jor.phase(sel),
      st = Jor.status(sel),
      w = Jor.world(p.world),
      rec = Jor.next();
    const miss = Jor.missing(sel);
    const reqs = p.requires.length
      ? `<ul class="reqs">${p.requires
          .map((r) => {
            const q = Jor.phase(r),
              ok = Jor.isDone(r);
            return `<li class="${ok ? "ok" : "no"}"><span class="sr-only">${ok ? "Cumprido: " : "Pendente: "}</span>${G.icon(ok ? "check" : "lock")}<button type="button" class="linkish" data-select="${r}">${esc(label(q))}</button></li>`;
          })
          .join("")}</ul>`
      : '<p class="mut">Nenhum: esta fase está sempre disponível.</p>';
    const nexts = p.proximas.length
      ? p.proximas.map((n) => `<button type="button" class="linkish" data-select="${n}">${esc(label(Jor.phase(n)))}</button>`).join(" · ")
      : Jor.WORLDS[Jor.WORLDS.length - 1].id === p.world
        ? "Esta é a última fase disponível por enquanto. Novas fases serão adicionadas ao mapa."
        : "—";
    const reward = `${p.xp} XP (uma vez)${w.fases[w.fases.length - 1] === p.id ? `, mais ${Jor.WORLD_BONUS} XP ao concluir ${esc(w.nome)}` : ""}`;
    let cta = "";
    if (st === "locked")
      cta = `<p class="gate-note" role="status"><b>Bloqueada.</b> Falta concluir: ${miss.map((m) => esc(label(m))).join("; ")}.</p>${rec ? `<button type="button" class="btn p" data-select="${(miss.find((m) => Jor.status(m.id) === "available") || rec).id}">Ir para a fase que desbloqueia ${G.icon("arrow-right")}</button>` : ""}`;
    else if (st === "available") cta = `<a class="btn p" href="${p.href}">${Jor.have(p.id).length ? "Continuar a fase" : "Iniciar fase"} ${G.icon("arrow-right")}</a>`;
    else cta = `<p class="mut">Recompensa já recebida${Jor.isLegacy(p.id) ? " (reconhecida do progresso anterior)" : ""}. Revisar não concede XP novamente.</p><a class="btn" href="${p.href}">Revisar esta fase ${G.icon("arrow-counter-clockwise")}</a>`;
    const rv = Jor.reviews(p.id);
    $("#j-panel").innerHTML =
      `<button type="button" class="pd-close" id="pd-close" aria-label="Fechar detalhes da fase">${G.icon("x")}</button>` +
      `<p class="eyebrow">Mundo ${w.n} · ${esc(w.nome)}</p><h2 class="pd-title"><span class="mono">${esc(p.id)}</span> ${esc(p.nome)}</h2>` +
      `<p class="pd-state"><span class="chip is-${st === "available" ? "open" : st}">${G.icon(st === "done" ? "check" : st === "locked" ? "lock" : "flag")}${stLabel[st]}${rec && rec.id === p.id ? " · recomendada" : ""}</span>${rv ? ` <span class="mono mut">${rv} ${rv === 1 ? "revisão" : "revisões"}</span>` : ""}</p>` +
      `<div class="pd-cta">${cta}</div>` +
      `<dl class="pd"><dt>Você vai aprender</dt><dd>${esc(p.objetivo)}</dd><dt>Para concluir</dt><dd>${esc(p.criterio)}</dd><dt>Recompensa</dt><dd>${reward}</dd></dl>` +
      `<details class="pd-more"><summary>Mais sobre esta fase</summary><dl class="pd"><dt>Situação-problema</dt><dd>${esc(p.contexto)}</dd><dt>Conceito</dt><dd>${esc(p.conceito)}</dd><dt>Atividade</dt><dd>${esc(p.atividade)}</dd><dt>Requisitos</dt><dd>${reqs}</dd><dt>Próximo passo</dt><dd>${nexts}</dd><dt>Objetivo do mundo</dt><dd>${esc(w.objetivo)}</dd></dl></details>` +
      `<div class="pd-links">${p.lab ? `<a class="text-link" href="${p.lab.href}">${esc(p.lab.label)} <span data-icon="arrow-up-right"></span></a>` : ""}${p.pesquisa ? `<a class="text-link" href="${p.pesquisa.href}">${esc(p.pesquisa.label)} <span data-icon="arrow-up-right"></span></a>` : ""}</div>`;
    G.icons($("#j-panel"));
  }

  function renderAll() {
    renderStatus();
    renderMap();
    renderPanel();
  }
  function select(id, scroll) {
    if (!Jor.phase(id)) return;
    sel = id;
    renderMap();
    renderPanel();
    if (scroll) {
      const panel = $("#j-panel");
      if (matchMedia("(max-width: 1100px)").matches) {
        document.body.classList.add("pd-open");
        panel.scrollIntoView({ block: "nearest", behavior: G.reducedMotion.matches ? "auto" : "smooth" });
      }
      panel.focus({ preventScroll: true });
    }
    const n = document.querySelector(`.node[data-id="${id}"]`);
    if (n && scroll === "node") n.focus();
  }
  function closePanel() {
    document.body.classList.remove("pd-open");
    const n = document.querySelector(`.node[data-id="${sel}"]`);
    if (n) n.focus({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("#pd-close")) return closePanel();
    const n = e.target.closest(".node"),
      s = e.target.closest("[data-select]");
    if (s) {
      document.body.classList.remove("pd-open");
      return select(s.dataset.select, true);
    }
    if (n) {
      if (n.dataset.id === sel && document.body.classList.contains("pd-open")) return closePanel();
      return select(n.dataset.id, true);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("pd-open")) {
      e.preventDefault();
      closePanel();
    }
  });
  /* Os detalhes fecham junto da rolagem para o mapa, para não sobrar folha aberta
     ao voltar ao topo da página. */
  document.addEventListener("graphos:jornada", renderAll);
  new ResizeObserver(drawEdges).observe($("#jmap"));
  window.addEventListener("resize", drawEdges);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawEdges);
  renderAll();
})(window.Graphos);
