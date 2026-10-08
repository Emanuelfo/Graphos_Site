/* Motion language: reveal hierarchy, preserve spatial continuity, acknowledge input. */
(function (G) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const svgTweens = new Map();
  G.morphSvg = (svg, render) => {
    const old = new Map(
      [...svg.querySelectorAll(".n[data-id]")].map((n) => {
        const c = n.querySelector("circle");
        return [n.dataset.id, [+c.getAttribute("cx"), +c.getAttribute("cy")]];
      }),
    );
    const oldEdges = [...svg.querySelectorAll(".e")].map((e) =>
      Object.fromEntries(
        ["x1", "y1", "x2", "y2"].map((k) => [k, e.getAttribute(k)]),
      ),
    );
    svgTweens.get(svg)?.kill();
    render();
    if (!window.gsap || reduced.matches) return;
    const tl = gsap.timeline({
      defaults: { duration: 0.85, ease: "power3.inOut" },
    });
    svg.querySelectorAll(".n[data-id]").forEach((n) => {
      const p = old.get(n.dataset.id),
        c = n.querySelector("circle");
      if (p)
        tl.fromTo(
          n,
          { x: p[0] - c.getAttribute("cx"), y: p[1] - c.getAttribute("cy") },
          { x: 0, y: 0 },
          0,
        );
    });
    svg.querySelectorAll(".e").forEach((e, i) => {
      if (!oldEdges[i]) return;
      const end = Object.fromEntries(
        ["x1", "y1", "x2", "y2"].map((k) => [k, e.getAttribute(k)]),
      );
      tl.fromTo(e, { attr: oldEdges[i] }, { attr: end }, 0);
    });
    svgTweens.set(svg, tl);
  };
  reduced.addEventListener("change", () => {
    if (reduced.matches) svgTweens.forEach((t) => t.progress(1).kill());
  });
  if (!window.gsap) return;
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const home = document.body.dataset.page === "home";
    if (home) {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".hero .eyebrow", { y: 12, opacity: 0, duration: 0.6 }, 0.05)
        .from(
          ".line-mask>span",
          { yPercent: 110, duration: 0.8, stagger: 0.08 },
          0.1,
        )
        .from(
          ".hero-intro,.hero-actions",
          { y: 18, opacity: 0, duration: 0.7, stagger: 0.1 },
          0.4,
        )
        .from(".hero-lab", { opacity: 0, duration: 0.8 }, 0.15)
        .from(
          ".journey-links a",
          { y: 12, opacity: 0, stagger: 0.065, duration: 0.6 },
          0.5,
        );
    } else {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".shead>div", {
          y: 12,
          opacity: 0,
          duration: 0.45,
          stagger: 0.08,
        })
        .from(
          ".viz>.card,.panel",
          { opacity: 0, duration: 0.5, stagger: 0.06 },
          0.1,
        );
    }
  });
  window.addEventListener("pagehide", () => {
    mm.revert();
    svgTweens.forEach((t) => t.kill());
  });
})(window.Graphos);
