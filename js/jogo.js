/* Graphos / jogo: lógica e utilidades compartilhadas pela trilha de aprendizagem.
   A trilha usa tabuleiros próprios e nunca altera G.project (o laboratório de seis etapas). */
(function (G) {
  const J = (G.jogo = {});

  /* ---------- Tabuleiros e casas ---------- */
  /* "Projeto" mínimo aceito por G.graph e G.board: só estrutura e regra. */
  J.board = (rows, cols, active) => ({
    kind: "cavalos",
    rule: { type: "knight" },
    structure: {
      rows,
      cols,
      active: active ? [...active] : G.allCells(rows, cols),
    },
  });
  J.rc = (id) => [id.charCodeAt(0) - 65, parseInt(id.slice(1), 10) - 1];
  /* Mesma convenção do desenho do tabuleiro: (linha + coluna) par = clara. */
  J.shade = (id) => {
    const [r, c] = J.rc(id);
    return (r + c) % 2;
  };
  J.shadeName = (id) => (J.shade(id) ? "escura" : "clara");
  J.plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  J.list = (ids) => (ids.length ? ids.join(", ") : "nenhuma");

  /* Por que um salto não vale? Mensagem específica para cada causa. */
  J.explainIllegal = (structure, from, to, occupied = {}) => {
    if (!structure.active.includes(to))
      return `A casa ${to} não existe neste tabuleiro.`;
    const [r1, c1] = J.rc(from),
      [r2, c2] = J.rc(to),
      dr = Math.abs(r1 - r2),
      dc = Math.abs(c1 - c2);
    if (dr * dc !== 2)
      return `De ${from} para ${to} o deslocamento é (${dr}, ${dc}). O cavalo só salta em L: (1, 2) ou (2, 1).`;
    if (occupied[to])
      return `A casa ${to} está ocupada. Cavalos não capturam: o destino precisa estar livre.`;
    return "Esse movimento não é permitido.";
  };

  /* ---------- Custo da busca exata ---------- */
  /* Posições possíveis de w cavalos brancos e b pretos em n casas: C(n,w)·C(n−w,b). */
  const choose = (n, k) => {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  };
  J.stateSpace = (n, w, b) => (n < w + b ? 0 : choose(n, w) * choose(n - w, b));
  J.CAP = 150000; // limite de estados da busca nas páginas da trilha (a etapa Solução usa 400 mil)
  J.HINT_LIMIT = 80000; // acima disso as dicas exatas são desativadas para não travar a página

  /* ---------- Um cavalo: camadas da busca em largura ---------- */
  /* Camadas L0, L1, ...: casas à mesma distância de `src` (ordem estável do tabuleiro). */
  J.layers = (g, src) => {
    const { d } = G.graph.bfs(g, src),
      layers = [];
    g.V.forEach((v) => {
      if (v in d) (layers[d[v]] = layers[d[v]] || []).push(v);
    });
    return layers;
  };

  /* ---------- Troca: limite inferior, paridade e interferência ---------- */
  /* Menor soma de distâncias individuais ao ligar cada casa de `from` a uma casa
     diferente de `to` (problema de atribuição, resolvido por enumeração; n ≤ 7). */
  J.matching = (g, from, to) => {
    const n = from.length;
    if (n !== to.length || n > 7) return null;
    const D = from.map((f) => {
      const d = G.graph.bfs(g, f).d;
      return to.map((t) => (t in d ? d[t] : Infinity));
    });
    let best = { cost: Infinity, perm: null };
    const used = Array(n).fill(false),
      cur = [];
    (function rec(i, cost) {
      if (cost >= best.cost) return;
      if (i === n) {
        best = { cost, perm: cur.slice() };
        return;
      }
      for (let j = 0; j < n; j++) {
        if (used[j]) continue;
        used[j] = true;
        cur[i] = j;
        rec(i + 1, cost + D[i][j]);
        used[j] = false;
      }
    })(0, 0);
    return {
      cost: best.cost,
      pairs: best.perm
        ? from.map((f, i) => ({
            from: f,
            to: to[best.perm[i]],
            d: D[i][best.perm[i]],
          }))
        : [],
    };
  };

  /* Análise matemática da troca: limite inferior pela soma dos caminhos individuais
     (NÃO é a solução), impossibilidade por conectividade e paridade. */
  J.swapAnalysis = (g, W, B) => {
    const mw = J.matching(g, W, B),
      mb = J.matching(g, B, W);
    if (!mw || !mb) return { skipped: true };
    const impossible = !isFinite(mw.cost) || !isFinite(mb.cost);
    const starts = [...W, ...B],
      ends = [...B, ...W];
    const sum = (ids) => ids.reduce((s, id) => s + J.shade(id), 0);
    /* Cada salto troca a cor da casa do cavalo que se move. */
    const parity = (sum(starts) + sum(ends)) % 2;
    const forced = (mine, theirs) =>
      mine.map((s) => {
        const set = new Set(theirs.map((t) => (J.shade(s) + J.shade(t)) % 2));
        return { id: s, parity: set.size === 1 ? [...set][0] : null };
      });
    const pairs = [...mw.pairs, ...mb.pairs];
    const paths = impossible
      ? []
      : pairs.map((p) => ({ ...p, path: G.graph.path(g, p.from, p.to) }));
    /* Interferência: casa de passagem de algum caminho que também é usada por outro.
       A origem de um cavalo ser o destino de outro é da natureza da troca, não conta. */
    const use = {},
      mid = new Set();
    paths.forEach((p) => {
      p.path.forEach((v) => (use[v] = (use[v] || 0) + 1));
      p.path.slice(1, -1).forEach((v) => mid.add(v));
    });
    return {
      skipped: false,
      impossible,
      lb: impossible ? null : mw.cost + mb.cost,
      pairs,
      paths,
      shared: Object.keys(use).filter((v) => use[v] > 1 && mid.has(v)),
      parity, // 0 = número total de movimentos necessariamente par
      forcedW: forced(W, B),
      forcedB: forced(B, W),
    };
  };

  /* Efeito de remover cada casa sobre a conectividade (e, havendo origem e destino,
     sobre a distância). Calculado de fato: uma busca por casa removida. */
  J.impact = (p, origin, dest) => {
    const base = G.graph.build(p),
      baseComps = G.graph.components(base).length,
      dist0 = origin && dest ? G.graph.path(base, origin, dest) : null,
      out = {};
    for (const v of base.V) {
      const q = J.board(
        p.structure.rows,
        p.structure.cols,
        p.structure.active.filter((x) => x !== v),
      );
      const g2 = G.graph.build(q);
      const comps = G.graph.components(g2).length;
      let kind = "none",
        after = null;
      if (origin && dest && v !== origin && v !== dest && dist0) {
        const path = G.graph.path(g2, origin, dest);
        after = path ? path.length - 1 : null;
        if (!path) kind = "cut";
        else if (path.length > dist0.length) kind = "longer";
      }
      /* Mais componentes depois da retirada: a casa era um ponto de articulação. */
      if (kind === "none" && comps > baseComps) kind = "split";
      out[v] = {
        kind,
        before: dist0 ? dist0.length - 1 : null,
        after,
        comps,
      };
    }
    return out;
  };

  /* ---------- Resumo de um tabuleiro ---------- */
  J.metrics = (p, origin, dest) => {
    const g = G.graph.build(p);
    if (!g.V.length) return null;
    const A = G.analyze(g),
      path = origin && dest ? G.graph.path(g, origin, dest) : null;
    return {
      vertices: A.n,
      edges: A.m,
      comps: A.comps.length,
      diam: A.conn ? A.diam : null,
      dmin: A.dmin,
      dmax: A.dmax,
      dist: path ? path.length - 1 : null,
    };
  };

  /* ---------- Progresso (localStorage, chave própria) ---------- */
  const KEY = "graphos.trilha";
  J.store = {
    read() {
      try {
        return JSON.parse(localStorage.getItem(KEY)) || {};
      } catch (e) {
        return {};
      }
    },
    write(o) {
      try {
        localStorage.setItem(KEY, JSON.stringify(o));
      } catch (e) {
        /* armazenamento indisponível */
      }
    },
    get(k, d) {
      const o = J.store.read();
      return k in o ? o[k] : d;
    },
    set(k, v) {
      const o = J.store.read();
      o[k] = v;
      J.store.write(o);
    },
  };
  /* Metas valorizam estratégia e justificativa, nunca velocidade. */
  J.METAS = [
    ["conceitos", "Percorreu os cinco conceitos de grafos"],
    ["minimo", "Encontrou um caminho de comprimento mínimo"],
    ["sem-caminho", "Investigou um destino inalcançável"],
    ["troca", "Resolveu a troca de cavalos"],
    ["troca-minimo", "Igualou o mínimo da troca"],
    ["analise", "Comparou o limite inferior com o mínimo exato"],
    ["irregular", "Investigou um tabuleiro irregular"],
    ["hipotese", "Testou uma hipótese no laboratório"],
    ["acerto", "Acertou uma previsão antes de testar"],
    ["contagem", "Conferiu uma contagem por enumeração"],
  ];
  J.metaCount = () => {
    const m = J.store.get("metas", {});
    return J.METAS.filter(([id]) => m[id]).length;
  };
  /* Registra uma meta; devolve true só na primeira vez. A evidência correspondente vai ao motor
     da jornada (G.jornada), que decide XP, conclusão e desbloqueio. No modo livre nada é registrado. */
  J.meta = (id) => {
    const found = J.METAS.find(([k]) => k === id);
    if (!found) return false;
    if (G.jornada) {
      if (G.jornada.isFree()) return false;
      G.jornada.evidence(`meta:${id}`);
    }
    const m = J.store.get("metas", {});
    if (m[id]) return false;
    m[id] = true;
    J.store.set("metas", m);
    document.dispatchEvent(new Event("graphos:meta"));
    return true;
  };

  /* ---------- Interface compartilhada ---------- */
  /* Linha de retorno com papel de status: leitores de tela anunciam a mudança. */
  J.say = (el, kind, html) => {
    if (!el) return;
    el.className = `fb ${kind}`;
    el.innerHTML = html;
  };
  /* Números (ou textos curtos) no centro das casas, por cima do tabuleiro já desenhado. */
  J.labels = (svg, structure, map, cls = "") => {
    let h = "";
    G.elements(structure).forEach((e) => {
      if (!(e.id in map)) return;
      const [x, y] = G.board.center(e.r, e.c);
      h += `<text class="lbl ${cls}" x="${x}" y="${y + 6}" text-anchor="middle" pointer-events="none">${map[e.id]}</text>`;
    });
    svg.insertAdjacentHTML("beforeend", h);
  };
  /* Marcadores de casas-alvo no canto inferior direito de cada casa. */
  J.marks = (svg, structure, list) => {
    let h = "";
    list.forEach(({ id, kind, hit }) => {
      const [r, c] = J.rc(id),
        x = c * 50 + 40,
        y = r * 50 + 40;
      h += `<circle class="goal ${kind}${hit ? " hit" : ""}" cx="${x}" cy="${y}" r="5" pointer-events="none"/>`;
    });
    svg.insertAdjacentHTML("beforeend", h);
  };
  /* Resumo do progresso na barra de cabeçalho das atividades. */
  const fillMeta = () => {
    const el = document.getElementById("meta-count");
    if (!el || !G.jornada) return;
    if (G.jornada.isFree()) {
      el.textContent = "Modo livre · sem XP · não altera a trilha";
      return;
    }
    const r = G.jornada.summary();
    el.textContent = `XP ${r.xp} · ${r.done} de ${r.total} fases · salvo neste navegador`;
  };
  document.addEventListener("graphos:jornada", fillMeta);
  document.addEventListener("DOMContentLoaded", fillMeta);
  fillMeta();
})(window.Graphos);
