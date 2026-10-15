/* Graphos / trilha-mapa: interface do mapa da Trilha de Aprendizagem.
   Só apresenta e navega: XP, desbloqueio, conclusão e conquistas vêm de G.jornada (js/jornada.js). */
(function (G) {
  const Jor = G.jornada,
    $ = G.$;
  if (document.body.dataset.page !== "trilha" || !Jor) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  /* Posição visual (coluna, linha) dentro de cada mundo. Fase nova sem posição entra na próxima coluna. */
  const LAYOUT = {
    "1.1": [1, 1], "1.2": [2, 1], "1.3": [3, 1], "1.4": [4, 1], "1.5": [5, 1],
    "2.1": [1, 1], "2.2": [2, 1], "2.3": [3, 1],
    "3.1": [1, 1], "3.2": [2, 1], "3.3": [3, 1], "3.4": [4, 1],
    "4.1": [1, 1], "4.2": [2, 1], "4.3": [3, 1],
    "5.1": [1, 1], "5.2": [2, 1], "5.3": [3, 1],
  };
  const NEW_MS = 90 * 1000; // destaque discreto para fases concluídas há pouco
  const query = new URLSearchParams(location.search).get("fase");
  let sel = Jor.phase(query) ? query : (Jor.next() || Jor.PHASES[Jor.PHASES.length - 1]).id;

  const stLabel = { done: "Concluída", available: "Disponível", locked: "Bloqueada" };
  const label = (p) => `Fase ${p.id} · ${p.nome}`;

  /* ---------- Chamada principal: a próxima fase e o progresso ---------- */
  function renderStatus() {
    const r = Jor.summary(),
      next = r.next;
    $("#j-go").innerHTML = next
      ? `<p class="lbl">${r.done ? "Continue de onde parou" : "Comece aqui"}</p><p class="go-name"><span class="mono">${esc(next.id)}</span> ${esc(next.nome)}</p><a class="btn p lg" href="${next.href}">${r.done ? "Continuar" : "Começar"} ${G.icon("arrow-right")}</a><p class="go-prog"><span class="mono">${r.done}/${r.total} fases · ${r.xp} XP</span></p><div class="bar" role="progressbar" aria-label="Progresso da jornada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}"><i style="width:${r.pct}%"></i></div>`
      : `<p class="lbl">Jornada concluída</p><p class="go-name">Você concluiu todas as fases disponíveis.</p><p class="go-prog"><span class="mono">${r.done}/${r.total} fases · ${r.xp} XP</span></p>`;
    $("#ach-count").textContent = `${r.ach}/${r.achTotal}`;
    $("#storage-note").textContent = Jor.persistent ? "" : "Armazenamento indisponível: o progresso dura só nesta aba.";
  }

  /* ---------- Mapa ---------- */
  function worldState(w) {
    if (Jor.worldDone(w.id)) return ["done", "Concluído"];
    const first = w.fases[0];
    if (Jor.status(first) === "locked") {
      const miss = Jor.missing(first).map((m) => m.id).join(", ");
      return ["locked", `Bloqueado · conclua ${miss}`];
    }
    return ["open", "Em andamento"];
  }
  function renderMap() {
    const rec = Jor.next(),
      now = Date.now();
    $("#jmap-worlds").innerHTML = Jor.WORLDS.map((w) => {
      const [cls, txt] = worldState(w);
      const nDone = w.fases.filter((f) => Jor.isDone(f)).length;
      const nodes = w.fases
        .map((id, i) => {
          const p = Jor.phase(id),
            st = Jor.status(id),
            [col, row] = LAYOUT[id] || [i + 1, 1];
          const isRec = rec && rec.id === id,
            isNew = st === "done" && !Jor.isLegacy(id) && now - Jor.doneAt(id) < NEW_MS;
          const state = st === "done" ? "Concluída" : st === "locked" ? `Bloqueada, requer ${Jor.missing(id).map((m) => m.id).join(", ")}` : isRec ? "Fase recomendada" : "Disponível";
          const dot = st === "done" ? G.icon("check") : st === "locked" ? G.icon("lock") : esc(id);
          return `<button type="button" class="node is-${st}${isRec ? " is-rec" : ""}${isNew ? " is-new" : ""}${sel === id ? " is-sel" : ""}" data-id="${id}" style="--col:${col};--row:${row}" aria-pressed="${sel === id}" aria-label="${esc(label(p))}. ${state}. ${p.xp} XP."><span class="node-dot" aria-hidden="true">${dot}</span><span class="node-name">${esc(p.nome)}</span>${isRec ? `<span class="node-tag">${Jor.doneCount() ? "Próxima" : "Comece aqui"}</span>` : ""}</button>`;
        })
        .join("");
      return `<section class="world is-${cls}" data-world="${w.id}" aria-labelledby="w-${w.id}"><header class="world-h"><h2 id="w-${w.id}"><span class="mono">${w.n}</span> ${esc(w.nome)}</h2><p class="world-meta"><span class="mono">${nDone}/${w.fases.length}</span>${cls === "open" ? "" : `<span class="chip is-${cls}">${esc(txt)}</span>`}</p></header><div class="world-grid">${nodes}</div></section>`;
    }).join("");
    drawEdges();
  }
  function drawEdges() {
    const box = $("#jmap"),
      svg = $("#jmap-edges");
    if (!box || !svg) return;
    const b = box.getBoundingClientRect(),
      W = Math.round(b.width),
      H = Math.round(box.scrollHeight);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    const rect = (id) => {
      const el = box.querySelector(`.node[data-id="${id}"] .node-dot`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: r.left - b.left, r: r.right - b.left, t: r.top - b.top, b: r.bottom - b.top, cx: r.left - b.left + r.width / 2, cy: r.top - b.top + r.height / 2 };
    };
    let h = "";
    Jor.PHASES.forEach((p) =>
      p.requires.forEach((rq) => {
        const A = rect(rq),
          B = rect(p.id);
        if (!A || !B) return;
        const state = Jor.isDone(rq) ? (Jor.isDone(p.id) ? "done" : "open") : "locked";
        let d;
        if (Math.abs(A.cy - B.cy) < 12) d = `M${A.cx} ${A.cy}L${B.cx} ${B.cy}`;
        else {
          const m = (A.cy + B.cy) / 2;
          d = `M${A.cx} ${A.cy}C${A.cx} ${m} ${B.cx} ${m} ${B.cx} ${B.cy}`;
        }
        h += `<path class="edge is-${state}" d="${d}"/>`;
      }),
    );
    svg.innerHTML = h;
  }

  /* ---------- Painel de detalhes da fase ---------- */
  function renderPanel() {
    const p = Jor.phase(sel),
      st = Jor.status(sel),
      w = Jor.world(p.world),
      rec = Jor.next();
    const miss = Jor.missing(sel);
    const reqs = p.requires.length
      ? `<ul class="reqs">${p.requires.map((r) => {
          const q = Jor.phase(r),
            ok = Jor.isDone(r);
          return `<li class="${ok ? "ok" : "no"}"><span class="sr-only">${ok ? "Cumprido: " : "Pendente: "}</span>${G.icon(ok ? "check" : "lock")}<button type="button" class="linkish" data-select="${r}">${esc(label(q))}</button></li>`;
        }).join("")}</ul>`
      : '<p class="mut">Nenhum: esta fase está sempre disponível.</p>';
    const nexts = p.proximas.length
      ? p.proximas.map((n) => `<button type="button" class="linkish" data-select="${n}">${esc(label(Jor.phase(n)))}</button>`).join(" · ")
      : Jor.WORLDS[Jor.WORLDS.length - 1].id === p.world ? "Esta é a última fase disponível por enquanto. Novas fases serão adicionadas ao mapa." : "—";
    const reward = `${p.xp} XP (uma vez)${w.fases[w.fases.length - 1] === p.id ? `, mais ${Jor.WORLD_BONUS} XP ao concluir o ${esc(w.nome)}` : ""}`;
    let cta = "";
    if (st === "locked")
      cta = `<p class="gate-note" role="status"><b>Bloqueada.</b> Falta concluir: ${miss.map((m) => esc(label(m))).join("; ")}.</p>${rec ? `<button type="button" class="btn p" data-select="${(miss.find((m) => Jor.status(m.id) === "available") || rec).id}">Ir para a fase que desbloqueia ${G.icon("arrow-right")}</button>` : ""}`;
    else if (st === "available") cta = `<a class="btn p" href="${p.href}">${Jor.have(p.id).length ? "Continuar a fase" : "Iniciar fase"} ${G.icon("arrow-right")}</a>`;
    else cta = `<p class="mut">Recompensa já recebida${Jor.isLegacy(p.id) ? " (reconhecida do progresso anterior)" : ""}. Revisar não concede XP novamente.</p><a class="btn" href="${p.href}">Revisar esta fase ${G.icon("arrow-counter-clockwise")}</a>`;
    const rv = Jor.reviews(p.id);
    $("#j-panel").innerHTML =
      `<p class="eyebrow">Mundo ${w.n} · ${esc(w.nome)}</p><h2><span class="mono">${esc(p.id)}</span> ${esc(p.nome)}</h2><p><span class="chip is-${st === "available" ? "open" : st}">${stLabel[st]}${rec && rec.id === p.id ? " · recomendada" : ""}</span>${rv ? ` <span class="mono mut">revisões: ${rv}</span>` : ""}</p>` +
      `<div class="pd-cta">${cta}</div>` +
      `<dl class="pd"><dt>Você vai aprender</dt><dd>${esc(p.objetivo)}</dd><dt>Para concluir</dt><dd>${esc(p.criterio)}</dd><dt>Recompensa</dt><dd>${reward}</dd></dl>` +
      `<details class="pd-more"><summary>Mais sobre esta fase</summary><dl class="pd"><dt>Situação-problema</dt><dd>${esc(p.contexto)}</dd><dt>Conceito</dt><dd>${esc(p.conceito)}</dd><dt>Atividade</dt><dd>${esc(p.atividade)}</dd><dt>Feedback</dt><dd>A atividade explica cada resultado e aceita novas tentativas, sem vidas nem punição.</dd><dt>Requisitos</dt><dd>${reqs}</dd><dt>Próximo passo</dt><dd>${nexts}</dd><dt>Objetivo do mundo</dt><dd>${esc(w.objetivo)}</dd></dl></details>` +
      `<div class="pd-links">${p.lab ? `<a class="text-link" href="${p.lab.href}">${esc(p.lab.label)} <span data-icon="arrow-up-right"></span></a>` : ""}${p.pesquisa ? `<a class="text-link" href="${p.pesquisa.href}">${esc(p.pesquisa.label)} <span data-icon="arrow-up-right"></span></a>` : ""}</div>`;
    G.icons($("#j-panel"));
  }

  /* ---------- Conquistas ---------- */
  function renderAch() {
    $("#ach-grid").innerHTML = Jor.achievements()
      .map((a) => `<li class="ach${a.got ? " got" : ""}"><span class="ach-ic" aria-hidden="true">${G.icon(a.got ? "trophy" : "lock")}</span><div><b>${esc(a.nome)}</b><span class="sr-only">${a.got ? " (obtida)" : " (bloqueada)"}</span><p>${esc(a.desc)}</p></div></li>`)
      .join("");
  }

  function renderAll() {
    renderStatus();
    renderMap();
    renderPanel();
    renderAch();
    G.icons();
  }
  function select(id, scroll) {
    if (!Jor.phase(id)) return;
    sel = id;
    renderMap();
    renderPanel();
    G.icons();
    if (scroll) {
      const panel = $("#j-panel");
      if (matchMedia("(max-width: 1000px)").matches) panel.scrollIntoView({ block: "start", behavior: G.reducedMotion.matches ? "auto" : "smooth" });
      panel.focus({ preventScroll: true });
    }
    const n = document.querySelector(`.node[data-id="${id}"]`);
    if (n && scroll === "node") n.focus();
  }
  document.addEventListener("click", (e) => {
    const n = e.target.closest(".node"),
      s = e.target.closest("[data-select]");
    if (n) select(n.dataset.id, true);
    else if (s) select(s.dataset.select, true);
  });
  $("#j-reset").addEventListener("click", () => {
    if (!confirm("Apagar XP, fases concluídas e conquistas deste navegador? Esta ação não pode ser desfeita.")) return;
    Jor.reset();
    sel = Jor.next().id;
    renderAll();
    G.toast("Progresso apagado neste navegador.");
  });
  document.addEventListener("graphos:jornada", renderAll);
  new ResizeObserver(drawEdges).observe($("#jmap"));
  window.addEventListener("resize", drawEdges);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawEdges);
  renderAll();
})(window.Graphos);
