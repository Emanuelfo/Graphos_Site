/* Graphos / fase: integração das páginas de atividade com a jornada.
   - Trilha (padrão): mostra a fase em foco (objetivo, critério, recompensa, próximo passo) e
     BLOQUEIA a atividade quando a fase ainda não foi desbloqueada.
   - Modo livre (?livre=1): ferramenta do Laboratório; nada conta XP nem altera o progresso.
   Deve carregar depois de main.js/jornada.js e ANTES do script da atividade, que verifica G.fase.blocked. */
(function (G) {
  const Jor = G.jornada,
    page = document.body.dataset.page,
    $ = G.$;
  G.fase = { blocked: false, free: false, focus: null, phases: [] };
  if (!Jor || !Jor.PAGES[page]) return;
  const phases = Jor.pagePhases(page),
    free = Jor.isFree();
  const param = new URLSearchParams(location.search).get("fase");
  const asked = Jor.phase(param) && Jor.phase(param).page === page ? Jor.phase(param) : null;
  /* Fase em foco: a pedida; senão a primeira em andamento desta página; senão a primeira. */
  const pick = () =>
    asked || phases.find((p) => Jor.status(p.id) === "available") || phases[phases.length - 1];
  let focus = pick();
  G.fase.free = free;
  G.fase.asked = !!asked;
  G.fase.phases = phases;
  G.fase.focus = focus;
  G.fase.index = () => Math.max(0, phases.indexOf(focus));
  G.fase.statusOf = (id) => Jor.status(id);

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const label = (p) => `Fase ${p.id} · ${p.nome}`;
  const stLabel = { done: "Concluída", available: "Em andamento", locked: "Bloqueada" };
  const link = (p, text) => `<a href="${p.href}">${esc(text || label(p))}</a>`;

  /* ---------- Bloqueio ---------- */
  const target = asked || phases[0];
  if (!free && Jor.status(target.id) === "locked") {
    G.fase.blocked = true;
    const miss = Jor.missing(target.id),
      nx = Jor.next();
    const work = $(".work");
    if (work)
      work.innerHTML = `<section class="gate" role="status"><p class="eyebrow">Fase bloqueada</p><h2>${esc(label(target))}</h2><p>Esta atividade só conta para a trilha depois de concluir ${miss.length === 1 ? "a fase" : "as fases"}:</p><ul>${miss.map((m) => `<li>${link(m)}${Jor.status(m.id) === "locked" ? ' <span class="mut">(também bloqueada)</span>' : ""}</li>`).join("")}</ul><p class="mut">O bloqueio é aplicado pelo progresso salvo, não apenas pelo cadeado do mapa. A ferramenta continua disponível no Laboratório, sem XP.</p><div class="row"><a class="btn p" href="index.html">Ver o mapa da trilha</a>${nx && nx.id !== target.id ? `<a class="btn" href="${nx.href}">Ir para a fase recomendada ${esc(nx.id)}</a>` : ""}<a class="btn g" href="${G.href(page + ".html") + (free ? "" : "?livre=1")}">Usar no Laboratório (sem XP)</a></div></section>`;
  }

  /* ---------- Faixa da missão ----------
     Um único lugar com a identidade da fase: nome, estado e objetivo. O critério fica
     logo abaixo, em uma linha. Situação-problema, conceito, outras fases e links saem
     da primeira dobra (bloco recolhido e rodapé), para o cartão da atividade ser a
     única outra superfície da tela. */
  const chip = (st, text) =>
    `<span class="chip is-${st === "available" ? "open" : st}">${G.icon(st === "done" ? "check" : st === "locked" ? "lock" : "flag")}${text}</span>`;
  function nextHtml(p) {
    const ready = p.proximas.map(Jor.phase).filter((q) => Jor.status(q.id) === "available");
    if (ready.length) return `Próximo passo: ${ready.map((q) => link(q)).join(" ou ")}.`;
    const nx = Jor.next();
    if (nx) return `Próximo passo recomendado: ${link(nx)}.`;
    return "Você concluiu todas as fases disponíveis. Novas fases entram no mapa conforme forem desenvolvidas.";
  }
  function render() {
    const host = $("#fase-banner");
    if (!host) return;
    if (free) {
      const p = focus;
      const st = Jor.status(p.id);
      host.className = "fase livre";
      host.innerHTML = `<div class="fase-main"><p class="eyebrow">Modo livre</p><p class="fase-obj"><b>Ferramenta do Laboratório.</b> Nada aqui concede XP ou altera sua trilha. Explore sem sequência obrigatória.</p></div><div class="fase-side">${
        st === "locked"
          ? `<a class="btn sm" href="index.html">Ver na trilha</a>`
          : `<a class="btn sm p" href="${p.href}">${st === "done" ? "Revisar na trilha" : "Fazer como fase da trilha"}: ${esc(p.id)} ${G.icon("arrow-right")}</a>`
      }</div>`;
      G.icons(host);
      renderNotes();
      return;
    }
    const p = focus,
      st = Jor.status(p.id),
      w = Jor.world(p.world),
      rev = Jor.reviews(p.id);
    const have = Jor.have(p.id);
    /* Progresso da fase só existe quando a fase pede mais de uma evidência. */
    const prog = p.needs.length > 1 ? ` <span class="mono">${have.length}/${p.needs.length}</span>` : "";
    const reward =
      st === "done"
        ? `<p class="fase-reward" role="status"><b>Concluída.</b> ${p.xp} XP já recebidos${Jor.worldDone(p.world) ? ` · ${esc(w.nome)} completo` : ""}${rev ? ` · ${rev} ${rev === 1 ? "revisão" : "revisões"}` : ""}. ${nextHtml(p)}</p>`
        : "";
    host.className = `fase is-${st}`;
    host.innerHTML =
      `<p class="eyebrow">Mundo ${w.n} · ${esc(w.nome)}</p>` +
      `<div class="fase-head"><h2 class="fase-title"><span class="mono">${esc(p.id)}</span> ${esc(p.nome)}</h2>${chip(st, stLabel[st] || "Em andamento")}</div>` +
      `<p class="fase-obj">${esc(p.objetivo)}</p>` +
      (st === "done" ? "" : `<p class="fase-crit"><b>Para concluir:</b> ${esc(p.criterio)}${prog}</p>`) +
      reward;
    renderNotes();
    G.icons(host);
  }

  /* ---------- Bloco recolhido e rodapé da faixa ---------- */
  function renderNotes() {
    const slot = $("#fase-notes"),
      pills = $("#fase-pills");
    if (!slot) return;
    const p = focus,
      w = Jor.world(p.world),
      st = Jor.status(p.id);
    if (free) {
      slot.innerHTML = "";
      if (pills) pills.innerHTML = "";
      return;
    }
    const list =
      phases.length > 1
        ? `<ol class="fase-list" aria-label="Fases desta atividade">${phases
            .map((q) => {
              const s2 = Jor.status(q.id);
              return `<li>${s2 === "locked" ? `<span class="fl is-locked" title="Bloqueada: conclua ${Jor.missing(q.id).map((m) => m.id).join(", ")}"><span>${esc(q.id)}</span><span class="fl-name"> · ${esc(q.nome)}</span></span>` : `<a class="fl is-${s2}${q === focus ? " on" : ""}" href="${q.href}" title="${esc(label(q))}"${q === focus ? ' aria-current="true"' : ""}><span>${esc(q.id)}</span><span class="fl-name"> · ${esc(q.nome)}</span></a>`}</li>`;
            })
            .join("")}</ol>`
        : "";
    const ctx = [
      p.lab && `<a class="text-link" href="${p.lab.href}">${esc(p.lab.label)} <span data-icon="arrow-up-right"></span></a>`,
      p.pesquisa && `<a class="text-link" href="${p.pesquisa.href}">${esc(p.pesquisa.label)} <span data-icon="arrow-up-right"></span></a>`,
    ]
      .filter(Boolean)
      .join("");
    slot.innerHTML =
      `<details class="fase-more"><summary>Situação-problema e conceito</summary><dl class="fase-dl">${st === "done" ? `<dt>Para concluir</dt><dd>${esc(p.criterio)}</dd>` : ""}<dt>Situação-problema</dt><dd>${esc(p.contexto)}</dd><dt>Conceito</dt><dd>${esc(p.conceito)}</dd><dt>Objetivo do mundo</dt><dd>${esc(w.objetivo)}</dd><dt>Recompensa</dt><dd>${p.xp} XP, uma vez${st === "done" ? " (já recebida; revisar não concede XP de novo)" : ""}</dd></dl></details>` +
      (ctx ? `<div class="fase-links">${ctx}</div>` : "");
    if (pills) pills.innerHTML = list;
    G.icons(slot);
    const ol = slot.querySelector(".fase-list"),
      on = ol && ol.querySelector(".fl.on");
    if (ol && on && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = on.offsetLeft - (ol.clientWidth - on.offsetWidth) / 2;
  }
  const work = $(".work");
  if (work && !G.fase.blocked) {
    const shead = $(".shead");
    (shead || work).insertAdjacentHTML(shead ? "afterend" : "beforebegin", '<aside class="fase" id="fase-banner" aria-label="Fase da trilha"></aside><div class="fase-pills" id="fase-pills"></div>');
    /* O conteúdo complementar vem depois da atividade: antes dela só ficam a faixa, as fases e a tarefa. */
    if (work) work.insertAdjacentHTML("afterend", '<div class="fase-notes" id="fase-notes"></div>');
    /* Marca a página para o CSS: onde existe faixa de fase, o título genérico da
       atividade é redundante e pode sair do caminho em telas pequenas. */
    document.body.classList.add("has-phase");
    render();
    document.addEventListener("graphos:jornada", render);
  }
})(window.Graphos);
