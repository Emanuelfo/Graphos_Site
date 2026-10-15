/* Graphos / combinatória: disposições iniciais do Xadrez de Fischer (Xadrez 960).
   Regras: oito casas da primeira fileira; as peças brancas ocupam a fileira e as pretas a espelham;
   os dois bispos ficam em casas de cores opostas e o rei fica entre as duas torres.
   Peças do mesmo tipo são indistinguíveis. A contagem é verificada por enumeração (ver testes). */
(function (G) {
  const WORD = "BBKNNQRR"; // multiconjunto de peças: 2 bispos, rei, 2 cavalos, dama, 2 torres
  /* Convenção do tabuleiro: casa a1 (índice 0) é escura; índices ímpares são claras. */
  const dark = (i) => i % 2 === 0;
  const choose = (n, k) => {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  };
  const PAIRS = []; // as C(5,2) = 10 escolhas de duas casas entre cinco livres
  for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) PAIRS.push([a, b]);

  const isValid = (pos) => {
    if (typeof pos !== "string" || pos.length !== 8) return false;
    if ([...pos].sort().join("") !== WORD) return false;
    const b = [...pos].map((c, i) => (c === "B" ? i : -1)).filter((i) => i >= 0);
    if (dark(b[0]) === dark(b[1])) return false;
    return pos.indexOf("R") < pos.indexOf("K") && pos.indexOf("K") < pos.lastIndexOf("R");
  };

  /* Gera todos os arranjos distintos do multiconjunto (8!/(2!·2!·2!) = 5040)
     e aplica as regras uma a uma: é a enumeração, a ser comparada com a contagem. */
  const enumerate = () => {
    const left = {};
    for (const c of WORD) left[c] = (left[c] || 0) + 1;
    const out = [];
    (function rec(cur) {
      if (cur.length === 8) return void out.push(cur);
      for (const c in left) {
        if (!left[c]) continue;
        left[c]--;
        rec(cur + c);
        left[c]++;
      }
    })("");
    const opposite = out.filter((pos) => {
      const b = [...pos].map((c, i) => (c === "B" ? i : -1)).filter((i) => i >= 0);
      return dark(b[0]) !== dark(b[1]);
    });
    return {
      all: out.length,
      bishopsOpposite: opposite.length,
      valid: opposite.filter(isValid),
    };
  };

  /* Os cinco passos da construção; `ways` é o número de escolhas em cada um. */
  const steps = () => {
    const light = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => !dark(i)).length;
    const drk = 8 - light;
    const rkr = new Set(["RKR", "RRK", "KRR"]);
    const rkrOk = [...rkr].filter((s) => s.indexOf("R") < s.indexOf("K") && s.indexOf("K") < s.lastIndexOf("R")).length;
    return [
      { id: "bispo-claro", nome: "Bispo em casa clara", ways: light },
      { id: "bispo-escuro", nome: "Bispo em casa escura", ways: drk },
      { id: "dama", nome: "Dama", ways: 8 - 2 },
      { id: "cavalos", nome: "Dois cavalos", ways: choose(5, 2) },
      { id: "torres-rei", nome: "Torre, rei, torre", ways: rkrOk },
    ];
  };

  /* Numeração de Scharnagl: 0–959 ↔ disposição (518 é a posição tradicional). */
  const fromNumber = (n) => {
    if (!Number.isInteger(n) || n < 0 || n > 959) return null;
    const pos = Array(8).fill(null),
      free = () => pos.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    let q = n;
    pos[1 + 2 * (q % 4)] = "B";
    q = Math.floor(q / 4);
    pos[2 * (q % 4)] = "B";
    q = Math.floor(q / 4);
    pos[free()[q % 6]] = "Q";
    q = Math.floor(q / 6);
    let f = free();
    const [a, b] = PAIRS[q];
    pos[f[a]] = "N";
    pos[f[b]] = "N";
    f = free();
    pos[f[0]] = "R";
    pos[f[1]] = "K";
    pos[f[2]] = "R";
    return pos.join("");
  };
  const toNumber = (pos) => {
    if (!isValid(pos)) return null;
    const a = [...pos],
      light = a.findIndex((c, i) => c === "B" && !dark(i)),
      drk = a.findIndex((c, i) => c === "B" && dark(i));
    let n = (light - 1) / 2 + 4 * (drk / 2);
    let free = a.map((c, i) => (c === "B" ? -1 : i)).filter((i) => i >= 0);
    n += 16 * free.indexOf(a.indexOf("Q"));
    free = free.filter((i) => a[i] !== "Q");
    const kn = free.map((i, k) => (a[i] === "N" ? k : -1)).filter((k) => k >= 0);
    n += 96 * PAIRS.findIndex(([x, y]) => x === kn[0] && y === kn[1]);
    return n;
  };

  G.fischer = {
    WORD,
    isValid,
    enumerate,
    steps,
    fromNumber,
    toNumber,
    dark,
    choose,
    countByPrinciple: () => ({
      steps: steps(),
      total: steps().reduce((p, s) => p * s.ways, 1),
    }),
  };

  /* ---------- Página ---------- */
  if (document.body.dataset.page !== "combinatoria" || (G.fase && G.fase.blocked)) return;
  const J = G.jogo,
    F = G.fischer,
    $ = G.$,
    GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞" },
    NAME = { K: "rei", Q: "dama", R: "torre", B: "bispo", N: "cavalo" };
  const pos = Array(8).fill(null),
    log = []; // histórico de colocações, para desfazer: listas de índices
  let pending = []; // primeiro cavalo já escolhido, aguardando o segundo
  const files = "abcdefgh";
  const free = () => pos.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  const stage = () =>
    !pos.includes("B")
      ? 0
      : pos.filter((c) => c === "B").length < 2
        ? 1
        : !pos.includes("Q")
          ? 2
          : pos.filter((c) => c === "N").length < 2
            ? 3
            : 4;
  const allowed = () => {
    const s = stage();
    if (s === 4) return [];
    if (s === 0) return free().filter((i) => !F.dark(i));
    if (s === 1) return free().filter((i) => F.dark(i));
    return free().filter((i) => !pending.includes(i));
  };
  const STEP_TEXT = [
    "Toque numa casa <b>clara</b> para o primeiro bispo.",
    "Toque numa casa <b>escura</b> para o segundo bispo: os dois bispos precisam de cores opostas.",
    "Toque numa casa livre para a dama.",
    "Escolha duas das casas livres para os cavalos.",
    "Sobraram três casas. Da esquerda para a direita só uma ordem respeita a regra: torre, rei, torre.",
  ];

  function draw() {
    const s = stage(),
      ok = new Set(allowed()),
      ways = F.steps();
    let h = "";
    for (let i = 0; i < 8; i++) {
      const piece = pos[i],
        mark = pending.includes(i);
      h +=
        `<g class="cell rk${ok.has(i) ? " ok" : ""}${mark ? " pend" : ""}" data-i="${i}" tabindex="0" role="button" aria-label="Casa ${files[i]}1, ${F.dark(i) ? "escura" : "clara"}${piece ? `, ${NAME[piece]}` : mark ? ", cavalo escolhido" : ", livre"}">` +
        `<rect x="${i * 80}" y="0" width="80" height="80" class="${F.dark(i) ? "dk" : "lt"}"/>` +
        `<text class="id" x="${i * 80 + 5}" y="12">${files[i]}1</text>` +
        (piece || mark
          ? `<text class="glyph" x="${i * 80 + 40}" y="60" text-anchor="middle">${GLYPH[piece || "N"]}</text>`
          : "") +
        `</g>`;
    }
    $("#rank").innerHTML = h;
    const done = s === 4 && pos.every(Boolean);
    $("#step-help").innerHTML = STEP_TEXT[s];
    $("#step-count").textContent = done
      ? "Disposição completa"
      : `Passo ${s + 1} de 5 · ${J.plural(ok.size || ways[4].ways, "escolha", "escolhas")}`;
    $("#formula").innerHTML = ways
      .map((w, k) => {
        const state = k < s || done ? "done" : k === s ? "now" : "";
        return `<span class="chip ${state}"><small>${w.nome}</small><b>${w.ways}</b></span>`;
      })
      .join('<i aria-hidden="true">×</i>');
    $("#undo").disabled = !log.length && !pending.length;
    const n = done ? F.toNumber(pos.join("")) : null;
    $("#pos-number").innerHTML = done
      ? `Esta disposição é a de número <b>${n}</b> entre as 960 (a tradicional é a 518).`
      : '<span class="mut">Complete os cinco passos, ou use o número abaixo.</span>';
    $("#num").value = done ? n : $("#num").value;
  }
  function place(i) {
    const s = stage();
    if (s === 4) return;
    if (pos[i])
      return J.say($("#fb"), "bad", `A casa ${files[i]}1 já está ocupada.`);
    if (!allowed().includes(i)) {
      const why =
        s === 0 && F.dark(i)
          ? `${files[i]}1 é escura. Este bispo precisa de uma casa clara.`
          : s === 1 && !F.dark(i)
            ? `${files[i]}1 é clara. O segundo bispo precisa de uma casa escura, para ficarem em cores opostas.`
            : "Escolha uma das casas destacadas.";
      return J.say($("#fb"), "bad", why);
    }
    if (s === 0 || s === 1) {
      pos[i] = "B";
      log.push([i]);
    } else if (s === 2) {
      pos[i] = "Q";
      log.push([i]);
    } else if (pending.length === 0) {
      pending = [i];
      return (J.say($("#fb"), "info", `Primeiro cavalo em ${files[i]}1. Falta escolher o segundo.`), draw());
    } else {
      pos[pending[0]] = pos[i] = "N";
      log.push([pending[0], i]);
      pending = [];
    }
    if (stage() === 4) {
      const f = free();
      pos[f[0]] = "R";
      pos[f[1]] = "K";
      pos[f[2]] = "R";
      log.push(f);
      J.say($("#fb"), "ok", "Uma das 960 disposições. Troque algumas escolhas e veja o número mudar.");
    } else J.say($("#fb"), "info", "Boa escolha. Continue.");
    draw();
  }
  function undo() {
    if (pending.length) pending = [];
    else if (log.length) log.pop().forEach((i) => (pos[i] = null));
    J.say($("#fb"), "info", "Escolha desfeita.");
    draw();
  }
  function restart() {
    pos.fill(null);
    log.length = 0;
    pending = [];
    J.say($("#fb"), "info", "Recomeçando. Quantas disposições diferentes você acha que existem?");
    draw();
  }
  function setNumber(n) {
    const p = F.fromNumber(n);
    if (!p)
      return J.say($("#fb"), "bad", "Use um número inteiro de 0 a 959.");
    [...p].forEach((c, i) => (pos[i] = c));
    log.length = 0;
    log.push([...Array(8).keys()]);
    pending = [];
    J.say($("#fb"), "info", `Disposição ${n}: ${p.split("").map((c) => GLYPH[c]).join(" ")}`);
    draw();
  }
  $("#rank").addEventListener("click", (e) => {
    const g = e.target.closest("[data-i]");
    if (g) place(+g.dataset.i);
  });
  $("#rank").addEventListener("keydown", (e) => {
    const g = e.target.closest("[data-i]");
    if (g && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      place(+g.dataset.i);
      setTimeout(() => $(`#rank [data-i="${g.dataset.i}"]`)?.focus());
    }
  });
  $("#undo").addEventListener("click", undo);
  $("#restart").addEventListener("click", restart);
  $("#random").addEventListener("click", () => setNumber(Math.floor(Math.random() * 960)));
  $("#show-num").addEventListener("click", () => setNumber(Number($("#num").value)));
  $("#num").addEventListener("keydown", (e) => e.key === "Enter" && setNumber(Number($("#num").value)));

  /* Contagem por princípio multiplicativo, sem listar nada. */
  const ways = F.steps();
  $("#count-chain").innerHTML =
    `<ol class="chain">` +
    [
      ["Sem regras", "8! / (2!·2!·2!)", "5 040", "Todas as formas de ordenar 2 bispos, 2 cavalos, 2 torres, dama e rei, sem distinguir peças iguais."],
      ["Bispos em cores opostas", `${ways[0].ways}×${ways[1].ways} × 6!/(2!·2!)`, "2 880", `${ways[0].ways}×${ways[1].ways} = 16 posições para os bispos; as outras seis peças (T, T, C, C, D, R) se ordenam de 6!/(2!·2!) = 180 maneiras.`],
      ["Rei entre as torres", "2 880 ÷ 3", "960", "Das 3 ordens possíveis de T, T, R (duas torres e o rei) nas casas restantes (TTR, TRT, RTT), só TRT vale: um terço sobrevive."],
    ]
      .map(([t, f, n, why]) => `<li><div><b>${t}</b><span class="mono">${f}</span></div><strong>${n}</strong><p class="mut">${why}</p></li>`)
      .join("") +
    `</ol><p class="mut">Pelo princípio multiplicativo, o caminho direto: <span class="mono">${ways.map((w) => w.ways).join(" × ")} = ${F.countByPrinciple().total}</span>.</p>`;

  $("#enum").addEventListener("click", () => {
    const t0 = performance.now(),
      e = F.enumerate(),
      ms = performance.now() - t0,
      by = F.countByPrinciple().total,
      same = e.valid.length === by;
    const sample = e.valid.slice(0, 6).map((p) => `<li><span class="mono">${p.split("").map((c) => GLYPH[c]).join(" ")}</span> <small class="mut">nº ${F.toNumber(p)}</small></li>`).join("");
    $("#enum-out").innerHTML =
      `<dl class="kv"><div><dt>Arranjos gerados</dt><dd style="font-size:23px">${e.all}</dd></div><div><dt>Bispos opostos</dt><dd style="font-size:23px">${e.bishopsOpposite}</dd></div><div><dt>Disposições válidas</dt><dd class="ac">${e.valid.length}</dd></div><div><dt>Tempo</dt><dd style="font-size:23px">${ms < 1 ? "<1" : Math.round(ms)} ms</dd></div></dl>` +
      (same
        ? `<p class="fb ok" role="status">A enumeração (${e.valid.length}) confere com a contagem (${by}). Contar exige um raciocínio; enumerar exige gerar e testar cada candidato.</p>`
        : `<p class="fb bad" role="status">A enumeração (${e.valid.length}) não confere com a contagem (${by}). Algo nas regras ou na conta precisa ser revisto.</p>`) +
      `<details><summary>Primeiras disposições da lista</summary><ol class="sample">${sample}</ol></details>`;
    if (same) J.meta("contagem");
  });

  restart();
  J.say($("#fb"), "info", "Monte uma disposição passo a passo e observe quantas escolhas existem em cada etapa.");
})(window.Graphos);
