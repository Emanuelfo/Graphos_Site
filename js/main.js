/* Graphos - núcleo compartilhado: projeto, cabeçalho/etapas, viewport SVG, exportação */
window.Graphos = window.Graphos || {};
(function (G) {
  const $ = (s, r = document) => r.querySelector(s);
  G.$ = $;
  G.icon = (name) => (window.GraphosIcons || {})[name] || "";
  G.icons = (root = document) =>
    root.querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = G.icon(el.dataset.icon);
    });

  G.STEPS = [
    { key: "estrutura", nome: "Estrutura", href: "estrutura.html" },
    { key: "regras", nome: "Regras", href: "regras.html" },
    { key: "grafo", nome: "Grafo", href: "grafo.html" },
    { key: "geometria", nome: "Geometria", href: "geometria.html" },
    { key: "analise", nome: "Análise", href: "analise.html" },
    { key: "solucao", nome: "Solução", href: "solucao.html" },
  ];

  /* ---------- Estrutura: casas de um tabuleiro ---------- */
  G.cellId = (r, c) => String.fromCharCode(65 + r) + (c + 1); // linhas A-T, colunas 1-20
  G.allCells = (rows, cols) => {
    const ids = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) ids.push(G.cellId(r, c));
    return ids;
  };
  /* Elementos ativos da estrutura, com coordenadas. */
  G.elements = (s) => {
    const act = new Set(s.active),
      out = [];
    for (let r = 0; r < s.rows; r++)
      for (let c = 0; c < s.cols; c++) {
        const id = G.cellId(r, c);
        if (act.has(id)) out.push({ id, r, c });
      }
    return out;
  };

  /* ---------- Projeto (persistido em localStorage entre as páginas) ---------- */
  const KEY = "graphos.projeto";
  G.newProject = (kind = "tabuleiro") => ({
    kind, // 'tabuleiro' | 'cavalos'
    structure: { rows: 4, cols: 3, active: G.allCells(4, 3) },
    rule: { type: "knight" },
    pieces: { W: [], B: [] },
    positions: null,
    layout: "grade",
    seed: 1,
    origin: null,
    dest: null,
    solution: null,
    exampleId: null,
  });
  const load = () => {
    try {
      const p = JSON.parse(localStorage.getItem(KEY));
      return p && p.structure ? p : null;
    } catch (e) {
      return null;
    }
  };
  G.project = load() || G.newProject();
  G.save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(G.project));
    } catch (e) {
      /* armazenamento indisponível */
    }
    document.dispatchEvent(new Event("graphos:save"));
  };
  /* Invalida o que depende do que foi alterado. */
  G.reset = (level) => {
    const p = G.project;
    p.solution = null;
    p.exampleId = null;
    if (level === "structure") {
      p.positions = null;
      p.origin = p.dest = null;
    }
    G.save();
  };
  G.pieceMap = (p) => {
    const m = {};
    p.pieces.W.forEach((id) => (m[id] = "W"));
    p.pieces.B.forEach((id) => (m[id] = "B"));
    return m;
  };

  /* ---------- Utilidades de interface ---------- */
  G.toast = (msg) => {
    let el = $("#msg");
    if (!el) {
      el = document.createElement("div");
      el.id = "msg";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(G.toast.t);
    G.toast.t = setTimeout(() => (el.style.display = "none"), 3800);
  };
  G.download = (name, text, type = "text/plain") => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  G.knight = (x, y, s, color) => {
    const w = color === "W";
    return `<use href="#kn" class="k" x="${x}" y="${y}" width="${s}" height="${s}" fill="${w ? "#F5EEF2" : "#16090f"}" stroke="${w ? "#16090f" : "#F5EEF2"}" stroke-width="${s / 12}" paint-order="stroke" stroke-linejoin="round"/>`;
  };
  /* Se não há estrutura, troca a área de trabalho por um aviso. */
  G.requireStructure = () => {
    if (G.project.structure.active.length) return true;
    const w = $(".work");
    if (w)
      w.innerHTML =
        '<div class="empty"><h2>Nenhuma estrutura definida</h2><p class="mut">Crie uma estrutura com ao menos um elemento para continuar a investigação.</p><p style="margin-top:16px"><a class="btn p" href="estrutura.html">Ir para Estrutura</a></p></div>';
    return false;
  };

  /* ---------- Cabeçalho e navegação ---------- */
  const KN =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="kn" viewBox="0 0 100 100"><path fill-rule="evenodd" d="M25 82C25 70 29 62 37 55C41 52 44 49 43 46C38 48 32 52 25 54C19 55 14 52 14 47C14 43 17 40 20 36C24 31 28 26 31 20L31 9L40 15C45 12 52 12 58 14C71 19 81 33 80 54C79 66 76 74 76 82Z M36 29a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0Z"/><rect x="19" y="82" width="62" height="11" rx="3.5"/></symbol></defs></svg>';

  function buildChrome() {
    const page = document.body.dataset.page,
      host = $("#chrome");
    if (!page || !host) return;
    const idx = G.STEPS.findIndex((s) => s.key === page);
    const nav =
      page === "home"
        ? [
            ["#modos", "Investigações"],
            ["#exemplos", "Exemplos"],
            ["#pesquisa", "A pesquisa"],
          ]
            .map(([h, t]) => `<a class="st" href="${h}"><span>${t}</span></a>`)
            .join("")
        : G.STEPS.map(
            (s, k) =>
              `<a class="st${k === idx ? " on" : ""}" href="${s.href}"${k === idx ? ' aria-current="step"' : ""}><span class="step-no" aria-hidden="true">${String(k + 1).padStart(2, "0")}</span><span>${s.nome}</span></a>`,
          ).join("");
    host.innerHTML = `<a class="skip-link" href="#conteudo">Pular para o conteúdo</a><header class="top"><a class="brand" href="index.html" aria-label="Graphos, início"><img src="assets/logo.png" width="40" height="40" alt=""><b>Graphos</b></a><span class="brand-note">Laboratório de grafos</span><nav class="steps" id="main-nav" aria-label="${page === "home" ? "Seções" : "Etapas da investigação"}">${nav}</nav><div class="acts"><button type="button" class="icon-button" id="theme-toggle" aria-label="Alternar tema"></button><button type="button" class="sm" id="load-example">Carregar exemplo ${G.icon("arrow-up-right")}</button><button type="button" class="icon-button menu-toggle" id="menu-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="main-nav">${G.icon("list")}</button></div></header>`;
    document.body.insertAdjacentHTML("afterbegin", KN);
    $("#load-example").addEventListener("click", () =>
      G.loadExample(G.examples[0].id),
    );
    const toggle = $("#theme-toggle");
    const syncTheme = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      toggle.innerHTML = G.icon(dark ? "sun" : "moon");
      toggle.setAttribute(
        "aria-label",
        dark ? "Ativar tema claro" : "Ativar tema escuro",
      );
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#17171b" : "#f6f5f7");
    };
    toggle.addEventListener("click", () => {
      const theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("graphos.theme", theme);
      } catch {
        /* private browsing */
      }
      syncTheme();
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      (event) => {
        let saved;
        try {
          saved = localStorage.getItem("graphos.theme");
        } catch {
          /* private browsing */
        }
        if (!saved) {
          document.documentElement.dataset.theme = event.matches
            ? "dark"
            : "light";
          syncTheme();
        }
      },
    );
    syncTheme();
    const menu = $("#menu-toggle");
    const closeMenu = () => {
      host.classList.remove("menu-open");
      menu.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-label", "Abrir menu");
      menu.innerHTML = G.icon("list");
    };
    menu.addEventListener("click", () => {
      const open = menu.getAttribute("aria-expanded") !== "true";
      host.classList.toggle("menu-open", open);
      menu.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      menu.innerHTML = G.icon(open ? "x" : "list");
    });
    $("#main-nav").addEventListener("click", closeMenu);
    matchMedia("(min-width: 768px)").addEventListener("change", closeMenu);
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (
        !a ||
        a.classList.contains("skip-link") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const target = document.getElementById(a.hash.slice(1));
      if (!target) return;
      e.preventDefault();
      history.pushState(null, "", a.hash);
      target.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && host.classList.contains("menu-open")) {
        closeMenu();
        menu.focus();
      }
    });
    if (idx >= 0) {
      host.classList.add("lab-chrome");
      $("#main-nav").insertAdjacentHTML(
        "afterbegin",
        '<span class="rail-label">Sua investigação</span>',
      );
      const panels = {
        estrutura: "Desenhe o problema",
        regras: "Entenda o movimento",
        grafo: "Explore as conexões",
        geometria: "Mude o ponto de vista",
        analise: "Encontre relações",
        solucao: "Do problema à solução",
      };
      $(".panel")?.insertAdjacentHTML(
        "afterbegin",
        `<div class="panel-heading"><span>${panels[page]}</span>${G.icon(page === "estrutura" ? "squares-four" : page === "solucao" ? "play" : "graph")}</div>`,
      );
      $(".shead").insertAdjacentHTML(
        "beforeend",
        `<div class="project-meta"><span class="inv"></span><span class="save-label">Salvo neste navegador</span></div>`,
      );
      $(".shead h1").insertAdjacentHTML(
        "beforebegin",
        `<p class="eyebrow">Investigação <span class="mono">${String(idx + 1).padStart(2, "0")} / 06</span></p>`,
      );
      const syncProject = () => {
        const p = G.project;
        $(".inv").textContent =
          `${p.kind === "cavalos" ? "Problema dos Cavalos" : "Tabuleiro"} ${p.structure.rows} × ${p.structure.cols}`;
      };
      document.addEventListener("graphos:save", syncProject);
      syncProject();
    }

    const pager = $("#pager");
    if (pager && idx >= 0) {
      const prev = G.STEPS[idx - 1],
        next = G.STEPS[idx + 1];
      pager.innerHTML =
        `<a class="btn g" href="${prev ? prev.href : "index.html"}">${G.icon("arrow-left")} ${prev ? prev.nome : "Início"}</a><span class="pager-note">${idx + 1} de 6 etapas</span>` +
        (next
          ? `<a class="btn p" href="${next.href}">${next.nome} ${G.icon("arrow-right")}</a>`
          : `<a class="btn p" href="index.html#modos">Nova investigação ${G.icon("arrow-up-right")}</a>`);
    }
    document.querySelectorAll("[data-zoom]").forEach((b) => {
      b.innerHTML = G.icon(
        { in: "plus", out: "minus", fit: "corners-out" }[b.dataset.zoom],
      );
    });
    G.icons();
  }

  /* ---------- Viewport SVG: zoom, pan, toque, arraste de itens ---------- */
  /* opções: fit() → viewBox; tap(id); drag(id,x,y) e dragEnd() para mover itens. */
  G.viewport = (svg, o) => {
    let vb = o.fit(),
      pan = null,
      moved = 0,
      pinch = 0,
      downId = null,
      dragging = false;
    const ptr = new Map();
    const apply = () =>
      svg.setAttribute("viewBox", vb.map((n) => +n.toFixed(2)).join(" "));
    const toSvg = (x, y) => {
      const p = svg.createSVGPoint();
      p.x = x;
      p.y = y;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    const zoom = (f, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2) => {
      vb = [cx - (cx - vb[0]) * f, cy - (cy - vb[1]) * f, vb[2] * f, vb[3] * f];
      apply();
    };
    const fit = () => {
      vb = o.fit();
      apply();
    };
    const idOf = (e) => {
      const g = e.target.closest("[data-id]");
      return g ? g.dataset.id : null;
    };

    svg.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const q = toSvg(e.clientX, e.clientY);
        zoom(e.deltaY > 0 ? 1.12 : 0.89, q.x, q.y);
      },
      { passive: false },
    );
    svg.addEventListener("pointerdown", (e) => {
      svg.setPointerCapture(e.pointerId);
      ptr.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptr.size === 1) {
        downId = idOf(e);
        pan = { x: e.clientX, y: e.clientY, vb: [...vb] };
        moved = 0;
        dragging = false;
      } else {
        pan = null;
        pinch = 0;
        moved = 99;
        downId = null;
      }
    });
    svg.addEventListener("pointermove", (e) => {
      if (!ptr.has(e.pointerId)) return;
      ptr.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptr.size === 2) {
        const [a, b] = [...ptr.values()],
          d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) {
          const q = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
          zoom(pinch / d, q.x, q.y);
        }
        pinch = d;
        return;
      }
      if (!pan) return;
      const dx = e.clientX - pan.x,
        dy = e.clientY - pan.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      if (moved <= 6) return;
      if (downId && o.drag) {
        const q = toSvg(e.clientX, e.clientY);
        dragging = true;
        o.drag(downId, q.x, q.y);
        return;
      }
      const k =
        1 / Math.min(svg.clientWidth / pan.vb[2], svg.clientHeight / pan.vb[3]);
      vb = [pan.vb[0] - dx * k, pan.vb[1] - dy * k, pan.vb[2], pan.vb[3]];
      apply();
    });
    const finish = (e, cancelled) => {
      ptr.delete(e.pointerId);
      if (ptr.size) return;
      const id = downId,
        tap = !cancelled && moved <= 6 && id;
      pinch = 0;
      pan = null;
      downId = null;
      if (dragging) {
        dragging = false;
        if (o.dragEnd) o.dragEnd();
      } else if (tap && o.tap) o.tap(id);
    };
    svg.addEventListener("pointerup", (e) => finish(e, false));
    svg.addEventListener("pointercancel", (e) => finish(e, true));
    svg.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const id = idOf(e);
      if (!id) return;
      e.preventDefault();
      if (o.tap) o.tap(id);
      setTimeout(() => {
        const n = svg.querySelector(`[data-id="${id}"]`);
        if (n) n.focus();
      });
    });
    const box = svg.closest(".cv");
    if (box)
      box.querySelectorAll("[data-zoom]").forEach((b) =>
        b.addEventListener("click", () => {
          const a = b.dataset.zoom;
          if (a === "fit") fit();
          else zoom(a === "in" ? 0.8 : 1.25);
        }),
      );
    apply();
    return { fit, zoom };
  };

  /* Destaca o mesmo elemento nas duas visualizações (checkbox #corr, se existir). */
  G.correspondence = () => {
    const mark = (e, on) => {
      const g = e.target.closest && e.target.closest("[data-id]"),
        c = $("#corr");
      if (!g || (c && !c.checked)) return;
      document
        .querySelectorAll(`.viz [data-id="${g.dataset.id}"]`)
        .forEach((x) => x.classList.toggle("hov", on));
    };
    document.addEventListener("pointerover", (e) => mark(e, true));
    document.addEventListener("pointerout", (e) => mark(e, false));
  };

  /* ---------- Exportação SVG / PNG da visualização atual ---------- */
  const STYLE_PROPS = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "stroke-dasharray",
    "opacity",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
  ];
  function standaloneSvg(svg) {
    const copy = svg.cloneNode(true),
      src = [svg, ...svg.querySelectorAll("*")],
      dst = [copy, ...copy.querySelectorAll("*")];
    src.forEach((el, i) => {
      const cs = getComputedStyle(el);
      STYLE_PROPS.forEach((p) =>
        dst[i].style.setProperty(p, cs.getPropertyValue(p)),
      );
    });
    const vb = svg.viewBox.baseVal,
      bg = getComputedStyle(svg).backgroundColor;
    copy.removeAttribute("class");
    copy.removeAttribute("style");
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", vb.width);
    copy.setAttribute("height", vb.height);
    copy.insertAdjacentHTML(
      "afterbegin",
      `<defs>${$("#kn").outerHTML}</defs><rect x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" fill="${bg}"/>`,
    );
    return { text: copy.outerHTML, vb };
  }
  G.exportSvg = (id, type) => {
    const svg = document.getElementById(id),
      { text, vb } = standaloneSvg(svg);
    if (type === "svg")
      return G.download(`graphos-${id}.svg`, text, "image/svg+xml");
    const W = 2400,
      H = Math.round((W * vb.height) / vb.width),
      img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      c.getContext("2d").drawImage(img, 0, 0, W, H);
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `graphos-${id}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-export]");
    if (b) {
      const [id, type] = b.dataset.export.split(":");
      G.exportSvg(id, type);
    }
  });

  buildChrome();
})(window.Graphos);
