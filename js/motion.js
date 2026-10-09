/* Motion language: reveal hierarchy, preserve spatial continuity, acknowledge input. */
(function (G) {
  const reduced = G.reducedMotion;
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
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  let context;
  function setupMotion() {
    context?.revert();
    if (reduced.matches) {
      if (!G.homeScene) return;
      Object.assign(G.homeScene.state, { layout: 2, reveal: 1, path: 1 });
      G.homeScene.paint();
      G.$("#story-state").textContent = "Um caminho mínimo · 3 movimentos";
      document
        .querySelectorAll(".story-progress i")
        .forEach((i) => i.classList.add("active"));
      return;
    }
    context = gsap.context(() => {
      const home = document.body.dataset.page === "home";
      if (home) {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".hero .eyebrow", { y: 12, opacity: 0, duration: 0.6 }, 0.05)
          .from(
            ".line-mask>span",
            { yPercent: 110, duration: 1.05, stagger: 0.12 },
            0.1,
          )
          .from(
            ".hero-intro,.hero-actions",
            { y: 18, opacity: 0, duration: 0.7, stagger: 0.1 },
            0.4,
          )
          .from(
            "#hero-graph",
            { y: 35, rotation: 2, opacity: 0, duration: 1.25 },
            0.15,
          )
          .from(
            ".demo-top,.demo-bottom,.demo-caption",
            { y: 12, opacity: 0, duration: 0.65, stagger: 0.09 },
            0.65,
          );
        if (window.ScrollTrigger) {
          const scene = G.homeScene,
            chapters = [...document.querySelectorAll(".story-chapter")];
          Object.assign(scene.state, { layout: 0, reveal: 0, path: 0 });
          scene.paint();
          const labels = [
            "A estrutura · 12 casas",
            "As conexões · 14 arestas",
            "Um caminho mínimo · 3 movimentos",
          ];
          const narrative = gsap.timeline({
            scrollTrigger: {
              trigger: ".story-layout",
              start: "top 35%",
              end: "bottom 75%",
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
            onUpdate: () => {
              scene.paint();
              const stage =
                scene.state.layout < 0.7 ? 0 : scene.state.layout < 1.5 ? 1 : 2;
              G.$("#story-state").textContent = labels[stage];
              document
                .querySelectorAll(".story-progress i")
                .forEach((bar, i) =>
                  bar.classList.toggle("active", i <= stage),
                );
            },
          });
          narrative
            .to(scene.state, {
              layout: 1,
              reveal: 1,
              duration: 1,
              ease: "none",
            })
            .to(scene.state, { layout: 2, path: 1, duration: 1, ease: "none" });
          chapters.forEach((chapter) =>
            gsap.from(chapter.children, {
              y: 26,
              opacity: 0,
              duration: 0.75,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: { trigger: chapter, start: "top 80%", once: true },
            }),
          );
          [
            ".connections-heading",
            ".section-title",
            ".mode",
            ".study-figure",
            ".example-copy",
            ".journey-intro",
            ".journey-links",
            ".research-heading",
            ".research-copy",
          ].forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) =>
              gsap.from(el, {
                y: 35,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 92%", once: true },
              }),
            );
          });
          gsap.from(".footer-char", {
            yPercent: 110,
            duration: 1.1,
            stagger: 0.045,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".footer-word",
              start: "top 90%",
              once: true,
            },
          });
          document.fonts.ready.then(() => ScrollTrigger.refresh());
        } else if (G.homeScene) {
          Object.assign(G.homeScene.state, { layout: 2, reveal: 1, path: 1 });
          G.homeScene.paint();
        }
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
            ".viz>.card,.panel,.empty",
            { opacity: 0, duration: 0.5, stagger: 0.06 },
            0.1,
          );
      }
    });
  }
  setupMotion();
  reduced.addEventListener("change", setupMotion);
  window.addEventListener("pagehide", () => {
    context?.revert();
    svgTweens.forEach((t) => t.kill());
  });
})(window.Graphos);
