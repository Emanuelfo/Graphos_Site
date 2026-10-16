/* Graphos / progresso: mostra o que o motor da jornada já registra — XP, fases
   concluídas, conquistas e histórico. Nenhum cálculo de progresso acontece aqui:
   tudo vem de G.jornada (js/jornada.js). Esta página não altera regras, apenas lê. */
(function (G) {
  const Jor = G.jornada,
    $ = G.$;
  if (document.body.dataset.page !== "progresso" || !Jor) return;
  const esc = (t) =>
    String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const label = (p) => `Fase ${p.id} · ${p.nome}`;

  /* Data curta e legível; entradas reconhecidas do progresso antigo não têm data. */
  const when = (at) =>
    at
      ? new Date(at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      : "reconhecida do progresso anterior";

  /* ---------- Resumo: o essencial e a próxima ação ---------- */
  function renderSummary() {
    const r = Jor.summary(),
      nx = r.next;
    $("#p-lead").textContent = r.done
      ? `Você concluiu ${r.done} de ${r.total} fases.`
      : "Sua jornada começa na primeira fase da Vila dos Grafos.";
    $("#p-summary").innerHTML =
      `<div class="p-stat"><span class="p-stat-n">${r.xp}</span><span class="p-stat-l">XP de ${r.xpMax}</span></div>` +
      `<div class="p-stat"><span class="p-stat-n">${r.done}<small>/${r.total}</small></span><span class="p-stat-l">fases concluídas</span></div>` +
      `<div class="p-stat"><span class="p-stat-n">${r.worldsDone}<small>/${Jor.WORLDS.length}</small></span><span class="p-stat-l">mundos concluídos</span></div>` +
      `<div class="p-stat"><span class="p-stat-n">${r.ach}<small>/${r.achTotal}</small></span><span class="p-stat-l">conquistas</span></div>` +
      `<div class="p-next">${
        nx
          ? `<p class="p-next-lbl">Continue de onde parou</p><p class="p-next-name"><span class="mono">${esc(nx.id)}</span> ${esc(nx.nome)}</p><a class="btn p lg" href="${nx.href}">${r.done ? "Continuar" : "Começar"} ${G.icon("arrow-right")}</a>`
          : `<p class="p-next-lbl">Jornada concluída</p><p class="p-next-name">Você concluiu todas as fases disponíveis.</p><a class="btn lg" href="lab.html">Explorar no Laboratório ${G.icon("arrow-right")}</a>`
      }<div class="bar" role="progressbar" aria-label="Progresso da jornada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}"><i style="width:${r.pct}%"></i></div></div>`;
  }

  /* ---------- Conquistas: mesma apresentação do mapa, agora em página própria ---------- */
  function renderAch() {
    const list = Jor.achievements();
    $("#ach-count").textContent = `${list.filter((a) => a.got).length}/${list.length}`;
    $("#ach-grid").innerHTML = list
      .map(
        (a) =>
          `<li class="ach${a.got ? " got" : ""}"><span class="ach-ic" aria-hidden="true">${G.icon(a.got ? "trophy" : "lock")}</span><div><b>${esc(a.nome)}</b><span class="sr-only">${a.got ? " (obtida)" : " (bloqueada)"}</span><p>${esc(a.desc)}</p></div></li>`,
      )
      .join("");
  }

  /* ---------- Histórico: as fases concluídas, da mais recente para a mais antiga ---------- */
  function renderHistory() {
    const done = Jor.PHASES.filter((p) => Jor.isDone(p.id)).sort((a, b) => Jor.doneAt(b.id) - Jor.doneAt(a.id));
    $("#p-hist-count").textContent = done.length ? `${done.length} de ${Jor.PHASES.length}` : "";
    if (!done.length) {
      $("#p-history").innerHTML =
        '<p class="mut">Nenhuma fase concluída ainda. O histórico aparece aqui conforme você avança.</p>';
      return;
    }
    $("#p-history").innerHTML = `<ul class="p-list">${done
      .map((p) => {
        const w = Jor.world(p.world),
          rv = Jor.reviews(p.id);
        return `<li class="p-item"><a class="p-item-main" href="${p.href}"><span class="p-item-id mono">${esc(p.id)}</span><span class="p-item-name">${esc(p.nome)}</span></a><span class="p-item-meta">${G.icon("check")}<span class="mono">${p.xp} XP</span><span class="p-item-when">${esc(w.curto)} · ${when(Jor.doneAt(p.id))}${rv ? ` · ${rv} ${rv === 1 ? "revisão" : "revisões"}` : ""}</span></span></li>`;
      })
      .join("")}</ul>`;
  }

  /* ---------- Ações ---------- */
  $("#p-reset").addEventListener("click", () => {
    if (!confirm("Apagar XP, fases concluídas e conquistas deste navegador? Esta ação não pode ser desfeita.")) return;
    Jor.reset();
    renderAll();
    G.toast("Progresso apagado neste navegador.");
  });
  document.addEventListener("graphos:jornada", renderAll);

  function renderAll() {
    renderSummary();
    renderAch();
    renderHistory();
    $("#storage-note").textContent = Jor.persistent ? "" : "Armazenamento indisponível: o progresso dura só nesta aba.";
    G.icons();
  }
  renderAll();
})(window.Graphos);
