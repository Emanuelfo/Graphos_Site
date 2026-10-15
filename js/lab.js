/* Graphos / lab: página do Laboratório. Mostra, em cada ferramenta, o vínculo com as fases da Trilha
   (somente leitura: abrir uma ferramenta aqui nunca concede XP). */
(function (G) {
  if (document.body.dataset.page !== "lab") return;
  const Jor = G.jornada,
    $ = G.$;
  document.querySelectorAll("[data-trail]").forEach((el) => {
    const ids = el.dataset.trail.split(",").filter((id) => Jor && Jor.phase(id));
    if (!ids.length) return;
    const done = ids.filter((id) => Jor.isDone(id)).length;
    const first = Jor.phase(ids[0]);
    el.innerHTML = `Na trilha: fase${ids.length > 1 ? "s" : ""} ${ids.join(", ")} · ${done} de ${ids.length} concluída${done === 1 ? "" : "s"}. <a href="${first.href}">Abrir como fase</a>`;
  });
  const ex = $("#open-example");
  if (ex) ex.addEventListener("click", () => G.loadExample(G.examples[0].id));
  G.icons();
})(window.Graphos);
