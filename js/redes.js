/* Graphos / redes: aplicações reais da teoria dos grafos (mundo 5).
   Três situações concretas, cada uma com a mesma estrutura: uma situação,
   os vértices e arestas que a representam, uma pergunta e a conferência feita
   com o cálculo real — busca em largura, componentes conexas e pesos.

   Reutiliza o que já existe: a estrutura do explorar (js/jogo.js para tabuleiros),
   o motor de grafos (js/grafo.js), o desenho (G.board em js/estrutura.js) e o
   feedback (J.say). Nenhum cálculo é imitado: todos vêm do motor compartilhado. */
(function (G) {
  const J = G.jogo;
  if (!J) return;
  const $ = G.$;
  const svg = $("#bsvg");
  const C = 50; // lado de uma casa no SVG, igual a G.board

  /* ---------- Definição das três redes ----------
     As arestas são DECLARADAS explicitamente, com nome de origem e destino: assim o
     mapa pode ter traçados retos e diagonais, como um mapa de metrô de verdade, sem
     que a posição no desenho passe a significar ligação. A grade serve só para
     posicionar os vértices na figura.
     Convenção: dois vértices nunca ficam a menos de duas casas de distância
     (distância de Chebyshev ≥ 2), para que a grade não sugira arestas que não existem.
     qa/redes-check.mjs confere isso e confere cada resposta anunciada. */
  const REDES = [
    {
      id: "transporte",
      nome: "Rede de transporte",
      evidencia: "redes:transporte",
      fase: "5.1",
      titulo: "Linhas de metrô",
      legenda: "Cada estação é um vértice · cada trecho direto é uma aresta",
      grade: [4, 5],
      nos: {
        "0,0": "Terminal Norte",
        "0,2": "Parque",
        "0,4": "Aeroporto",
        "1,1": "Mercado",
        "1,3": "Museu",
        "2,0": "Bairro",
        "2,2": "Praça",
        "2,4": "Colina",
        "3,1": "Pátio",
        "3,3": "Centro",
      },
      /* Duas linhas que se cruzam na Praça e no Mercado. As estações ficam sempre a
         duas casas de distância no desenho, então nenhuma proximidade sugere ligação:
         as arestas são exatamente as listadas aqui. */
      arestas: [
        ["Terminal Norte", "Parque"],
        ["Parque", "Aeroporto"],
        ["Aeroporto", "Colina"],
        ["Colina", "Centro"],
        ["Terminal Norte", "Mercado"],
        ["Mercado", "Bairro"],
        ["Bairro", "Pátio"],
        ["Pátio", "Centro"],
        ["Parque", "Praça"],
        ["Mercado", "Praça"],
        ["Praça", "Museu"],
        ["Museu", "Colina"],
      ],
      origem: "Aeroporto",
      destino: "Pátio",
      conceito:
        "Numa <b>rede de transporte</b>, cada estação é um <b>vértice</b> e cada trecho direto entre duas estações é uma <b>aresta</b>. Trocar de trem no meio do caminho não é uma aresta: é apenas a passagem por outro vértice.",
      pergunta:
        "Quantas <b>arestas</b> tem o trajeto com menos trechos entre <b>Aeroporto</b> e <b>Pátio</b>?",
      unidade: "Número de arestas do trajeto mais curto",
      explicar: (r) =>
        `O trajeto mais curto tem <b>${r.dist}</b> ${r.dist === 1 ? "aresta" : "arestas"}: ${r.caminho.join(" → ")}. ` +
        `Nenhum trajeto chega ao Centro com menos trechos: a busca em largura já alcançou todas as estações que estão a ${r.dist - 1} aresta(s) ou menos, e o Centro não estava entre elas. ` +
        `Repare que “menos trechos” não é o mesmo que “menor distância no mapa”: a Matemática conta arestas.`,
    },
    {
      id: "computadores",
      nome: "Rede de computadores",
      evidencia: "redes:computadores",
      fase: "5.2",
      titulo: "Dispositivos conectados",
      legenda: "Toque num dispositivo para simular que ele falhou",
      grade: [3, 3],
      nos: {
        "0,0": "Notebook",
        "0,2": "Roteador A",
        "1,1": "Impressora",
        "1,2": "Roteador da ponte",
        "2,0": "TV",
        "2,2": "Roteador B",
      },
      /* Uma corrente de dispositivos: o Roteador da ponte é a única passagem entre o
         grupo de cima e o de baixo. Retirá-lo separa a rede em duas partes. */
      arestas: [
        ["Notebook", "Impressora"],
        ["Roteador A", "Impressora"],
        ["Impressora", "Roteador da ponte"],
        ["Roteador da ponte", "Roteador B"],
        ["Roteador B", "TV"],
      ],
      conceito:
        "Numa <b>rede de computadores</b>, cada dispositivo é um <b>vértice</b> e cada cabo ou ligação sem fio direta é uma <b>aresta</b>. " +
        "Quando um dispositivo é a única passagem entre dois grupos, retirá-lo divide a rede em partes que não se falam mais.",
      pergunta:
        "Clique num dispositivo e veja quantas partes a rede passa a ter. Encontre um dispositivo cuja falha <b>separa a rede em duas partes</b>.",
      explicar: (r) =>
        `O <b>${r.nome}</b> é um <b>ponto de articulação</b>. Com ele, a rede tem 1 parte (todos alcançam todos). ` +
        `Sem ele, passa a ter <b>${r.comps} partes</b>: ${r.grupos.map((g) => g.join(", ")).join("  |  ")}. ` +
        `Esses dispositivos são as vulnerabilidades da rede: um único ponto cuja remoção desconecta o sistema. ` +
        `A Matemática detecta isso contando as componentes conexas antes e depois da remoção.`,
    },
    {
      id: "sociais",
      nome: "Rede social",
      evidencia: "redes:sociais",
      fase: "5.3",
      titulo: "Quem conhece quem",
      legenda: "O número na ligação indica a frequência de contato",
      grade: [3, 3],
      nos: {
        "0,0": "Ana",
        "0,2": "Bia",
        "1,1": "Caio",
        "2,0": "Dudu",
        "2,2": "Eva",
      },
      origem: "Ana",
      destino: "Dudu",
      /* Pesos calculados em qa/redes-check.mjs: nenhum valor aqui é decorado. */
      arestas: [
        ["Ana", "Bia", 2],
        ["Ana", "Caio", 5],
        ["Bia", "Caio", 2],
        ["Bia", "Eva", 1],
        ["Caio", "Eva", 4],
        ["Caio", "Dudu", 3],
      ],
      conceito:
        "Numa <b>rede social</b>, cada pessoa é um <b>vértice</b> e cada relação é uma <b>aresta</b>. " +
        "Quando as ligações têm <b>peso</b> (a frequência de contato, por exemplo), existem critérios diferentes para escolher um caminho.",
      pergunta:
        "Entre <b>Ana</b> e <b>Dudu</b>, qual caminho tem a <b>menor soma</b> dos números? Monte o trajeto tocando nas pessoas e confira.",
      explicar: (r) =>
        `Menor soma: <b>${r.minSoma.caminho.join(" → ")}</b>, somando <b>${r.minSoma.soma}</b>. ` +
        `Esse é o critério de <b>caminho mais barato</b>: minimiza a soma dos pesos. ` +
        `Já o critério de <b>ligação mais forte</b> maximiza a <i>menor</i> ligação do trajeto, e o melhor é ` +
        `<b>${r.maxMin.caminho.join(" → ")}</b>, cuja ligação mais fraca vale <b>${r.maxMin.gargalo}</b>. ` +
        `Compare: ${r.minSoma.caminho.join("–")} tem soma ${r.minSoma.soma} e ligação mais fraca ${r.minSoma.min}; ` +
        `${r.maxMin.caminho.join("–")} tem soma ${r.maxMin.soma} e ligação mais fraca ${r.maxMin.gargalo}. ` +
        `Os dois critérios dão trajetos diferentes porque “melhor caminho” só faz sentido depois de escolher o que se quer otimizar.`,
    },
  ];
  /* Exposto para conferência fora do navegador (qa/redes-check.mjs): são os MESMOS
     objetos que a tela usa, então o gabarito das lições não pode divergir do desenho. */
  G.redesData = REDES;
  /* Fora do navegador (conferência de dados) só os dados importam: sem SVG e sem
     página certa, não há o que inicializar. */
  if (!svg || document.body.dataset.page !== "redes" || (G.fase && G.fase.blocked)) return;

  /* ---------- Construção do grafo a partir da grade ----------
     A grade dá a POSIÇÃO de cada vértice; as arestas vêm da lista declarada
     ("arestas"). Assim o desenho pode ter traçados em diagonal — como um mapa de
     metrô — sem que proximidade no desenho vire ligação por acidente. */
  function buildRede(rede, remover) {
    const [rows, cols] = rede.grade;
    const structure = { rows, cols, active: [] };
    const nomePorId = {};
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const nome = rede.nos[`${r},${c}`];
        if (!nome || nome === remover) continue;
        const id = G.cellId(r, c);
        structure.active.push(id);
        nomePorId[id] = nome;
      }
    const idPorNome = {};
    structure.active.forEach((id) => (idPorNome[nomePorId[id]] = id));
    const E = [];
    const adj = {};
    structure.active.forEach((id) => (adj[id] = []));
    (rede.arestas || []).forEach(([a, b]) => {
      const ia = idPorNome[a], ib = idPorNome[b];
      if (!ia || !ib || ia === ib) return; // uma ponta removida tira a aresta junto
      E.push([ia, ib]);
      adj[ia].push(ib);
      adj[ib].push(ia);
    });
    return { structure, V: structure.active, E, adj, nomePorId };
  }
  /* Nome legível de um vértice: a casa do desenho volta a ser a estação ou a pessoa. */
  function nomeDe(g, id) {
    return (g.nomePorId && g.nomePorId[id]) || id;
  }
  function idDe(g, nome) {
    return g.V.find((id) => nomeDe(g, id) === nome) || null;
  }

  /* Busca em largura sobre { V, adj } — mesma ideia de G.graph.bfs, aplicada aqui
     porque estas redes não passam pela regra do cavalo. */
  function bfs(adj, s) {
    const d = { [s]: 0 }, pr = { [s]: null }, q = [s];
    for (let h = 0; h < q.length; h++)
      for (const u of adj[q[h]]) if (!(u in d)) { d[u] = d[q[h]] + 1; pr[u] = q[h]; q.push(u); }
    return { d, pr };
  }
  function caminhoMin(adj, a, b) {
    const { d, pr } = bfs(adj, a);
    if (!(b in d)) return null;
    const out = [];
    for (let v = b; v; v = pr[v]) out.unshift(v);
    return out;
  }
  function componentes(adj, V) {
    const visto = new Set(), comps = [];
    for (const v of V)
      if (!visto.has(v)) {
        const c = Object.keys(bfs(adj, v).d);
        c.forEach((x) => visto.add(x));
        comps.push(c);
      }
    return comps;
  }
  /* Menor soma de pesos (Dijkstra simplificado; as redes são pequenas). */
  function menorSoma(arestasPeso, a, b) {
    const adj = {};
    const push = (x, y, w) => ((adj[x] = adj[x] || []).push([y, w]));
    arestasPeso.forEach(([x, y, w]) => { push(x, y, w); push(y, x, w); });
    const dist = { [a]: 0 }, pr = { [a]: null }, feito = new Set();
    for (;;) {
      let u = null;
      for (const k of Object.keys(dist)) if (!feito.has(k) && (u === null || dist[k] < dist[u])) u = k;
      if (u === null) break;
      feito.add(u);
      for (const [v, w] of adj[u] || [])
        if (!feito.has(v) && (dist[v] === undefined || dist[u] + w < dist[v])) { dist[v] = dist[u] + w; pr[v] = u; }
    }
    if (dist[b] === undefined) return null;
    const out = [];
    for (let v = b; v; v = pr[v]) out.unshift(v);
    return { caminho: out, soma: dist[b] };
  }
  /* Melhor ligação mais forte: maximiza a menor aresta do caminho (busca em largura
     sobre os limiares de peso, do maior para o menor). */
  function maiorGargalo(arestasPeso, a, b) {
    const pesos = [...new Set(arestasPeso.map(([, , w]) => w))].sort((x, y) => y - x);
    for (const limiar of pesos) {
      const adj = {};
      const push = (x, y) => ((adj[x] = adj[x] || []).push(y));
      arestasPeso.filter(([, , w]) => w >= limiar).forEach(([x, y]) => { push(x, y); push(y, x); });
      if (!adj[a]) continue;
      const c = caminhoMin(adj, a, b);
      if (c) return { caminho: c, gargalo: limiar };
    }
    return null;
  }

  /* ---------- Estado ---------- */
  const Jor = G.jornada,
    free = !Jor || Jor.isFree(),
    PH = Jor ? Jor.PAGES.redes || [] : [];
  const done = REDES.map((_, i) => !free && Jor.isDone(PH[i]));
  const locked = (i) => !free && Jor.status(PH[i]) === "locked";
  const enviadas = new Set();
  let c = 0,
    view = "rede",
    estado = {};

  const respondeu = (i) => done[i] || (estado[i] && estado[i].ok);
  function conclui(i) {
    const primeira = !done[i];
    done[i] = true;
    estado[i] = { ...(estado[i] || {}), ok: true };
    if (!free && !enviadas.has(i)) {
      enviadas.add(i);
      Jor.evidence(REDES[i].evidencia);
    }
    if (primeira) renderPainel();
  }

  const fb = (kind, html) => J.say($("#fb"), kind, html);

  /* ---------- Desenho ---------- */
  function nomeEm(g, id) {
    return nomeDe(g, id);
  }
  function draw() {
    const rede = REDES[c],
      g = buildRede(rede, estado[c] && estado[c].remover);
    estado[c] = estado[c] || {};
    const st = estado[c];
    st.g = g;
    const [rows, cols] = rede.grade;
    const cls = (id) => {
      if (st.remover && nomeEm(g, id) === st.remover) return " sel";
      if (st.fim && (id === st.fim || st.caminho.includes(id))) return " pth";
      if (st.origemId && id === st.origemId) return " sel";
      if (st.destinoId && id === st.destinoId) return " sel";
      if (st.arestasSel && st.arestasSel.has(id)) return " nb";
      return "";
    };
    /* Arestas destacadas: o trajeto montado pelo estudante ou o trajeto revelado. */
    const destaque = new Set();
    const par = (a, b) => [a, b].sort().join("|");
    if (st.caminho && st.caminho.length > 1)
      st.caminho.slice(1).forEach((v, i) => destaque.add(par(st.caminho[i], v)));
    if (st.revelado && st.revelado.caminho)
      st.revelado.caminho.slice(1).forEach((v, i) => destaque.add(par(st.revelado.caminho[i], v)));
    if (st.remover) {
      /* Arestas que existiam antes da remoção, para mostrar o que se perdeu. */
      const antes = buildRede(rede, null);
      const perdeu = new Set();
      antes.E.forEach(([a, b]) => {
        const na = nomeEm(antes, a), nb = nomeEm(antes, b);
        if (na === st.remover || nb === st.remover) perdeu.add(par(a, b));
      });
      st.perdeu = perdeu;
    }
    G.board.render(svg, { structure: g.structure }, {
      graph: true,
      edges: g.E,
      edgeCls: (a, b) => (destaque.has(par(a, b)) ? " p" : ""),
      cls,
    });
    /* Rótulos das estações e dos pesos, por cima do desenho. Nome completo em
       telas largas; nas estreitas o número da casa mantém a figura legível. */
    let extra = "";
    const estreito = svg.clientWidth > 0 && svg.clientWidth < 560;
    for (const e of G.elements(g.structure)) {
      const [x, y] = G.board.center(e.r, e.c);
      const nome = nomeEm(g, e.id);
      if (!estreito)
        extra += `<text class="rede-nome" x="${x}" y="${y + 30}" text-anchor="middle" pointer-events="none">${nome}</text>`;
    }
    /* Pesos das ligações: só a rede social tem peso em cada aresta. Cobrir as
       demais redes é essencial — sem peso não há rótulo para desenhar. */
    const temPesos = !!rede.arestas && rede.arestas.some(([, , w]) => Number.isFinite(w));
    if (temPesos) {
      const porNome = {};
      g.structure.active.forEach((id) => (porNome[nomeEm(g, id)] = id));
      rede.arestas.forEach(([x, y, w]) => {
        if (!Number.isFinite(w)) return;
        const a = porNome[x], b = porNome[y];
        if (!a || !b) return;
        const [ax, ay] = G.board.center(...J.rc(a)), [bx, by] = G.board.center(...J.rc(b));
        const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
        const on = destaque.has(par(a, b)) ? " on" : "";
        extra += `<g class="rede-peso${on}" data-peso="${a}|${b}" tabindex="0" role="button" aria-label="Ligação de ${x} com ${y}, peso ${w}"><circle cx="${mx}" cy="${my}" r="13"/><text x="${mx}" y="${my + 4}" text-anchor="middle" pointer-events="none">${w}</text></g>`;
      });
    }
    svg.insertAdjacentHTML("beforeend", extra);
    $("#bcap").textContent =
      `${g.V.length} vértices · ${g.E.length} arestas` + (st.remover ? ` · sem ${st.remover}` : "");
    $("#rede-title").textContent = rede.titulo;
    $("#legenda").textContent = rede.legenda;
  }

  /* ---------- Área de tarefa (objetivo + pergunta), junto da figura ---------- */
  function renderTarefa() {
    const host = $("#ctask");
    if (!host) return;
    const rede = REDES[c],
      st = locked(c) ? "locked" : respondeu(c) ? "done" : "open";
    host.className = `ctask is-${st}`;
    host.innerHTML =
      `<div class="ctask-bar"><p class="ctask-head"><span class="mono">${c + 1} / ${REDES.length}</span> <b>${rede.nome}</b>` +
      `<span class="chip is-${st === "open" ? "open" : st}">${st === "done" ? "Resolvida" : st === "locked" ? "Bloqueada" : `Fase ${PH[c] || ""}`}</span></p>` +
      `<p class="ctask-todo"><b>Tarefa:</b> ${rede.pergunta}</p></div>` +
      `<p class="ctask-obj">${rede.conceito}</p>` +
      `<div class="row" id="ctask-acoes"></div>`;
    renderAcoes();
  }
  function renderAcoes() {
    const host = $("#ctask-acoes");
    if (!host) return;
    const rede = REDES[c],
      st = estado[c] || {};
    let html = "";
    if (rede.unidade) {
      html +=
        `<label class="ask">${rede.unidade}` +
        `<span class="ask-row"><input id="guess" type="number" min="0" inputmode="numeric" autocomplete="off">` +
        `<button type="button" class="sm p" data-conferir>Conferir</button></span></label>`;
    } else if (rede.id === "computadores") {
      html += `<p class="mut" id="sim-info">${st.remover ? `Simulando a falha de <b>${st.remover}</b>.` : "Toque num dispositivo para simular a falha."}</p>`;
      if (st.remover) html += `<button type="button" class="sm" data-restaurar>Restaurar a rede</button>`;
      if (st.ok && st.remover) html += `<button type="button" class="sm p" data-conferir>Explicar por que separa</button>`;
    } else if ((rede.arestas || []).some(([, , w]) => Number.isFinite(w))) {
      html += `<div class="row rede-acoes">` +
        `<button type="button" class="sm" data-criterio="soma">Somar pesos</button>` +
        `<button type="button" class="sm" data-criterio="gargalo">Ligação mais forte</button>` +
        `<button type="button" class="sm g" data-limpar>Limpar trajeto</button></div>`;
    }
    host.innerHTML = html;
    if (estado[c] && estado[c].guess && $("#guess")) $("#guess").value = estado[c].guess;
  }

  /* ---------- Painel: as três aplicações como etapas ---------- */
  function renderPainel() {
    $("#concepts").innerHTML = REDES.map((r, i) => {
      const on = i === c;
      const ok = respondeu(i);
      return (
        `<li class="concept${on ? " on" : ""}${done[i] ? " done" : ""}${locked(i) ? " locked" : ""}">` +
        `<button type="button" class="c-head" data-c="${i}" aria-expanded="${on}"${locked(i) ? ' aria-disabled="true"' : ""}><span class="c-no" aria-hidden="true">${done[i] ? G.icon("check") : locked(i) ? G.icon("lock") : i + 1}</span><b>${r.nome}</b><span class="c-ph mono">fase ${PH[i] || ""}</span>${done[i] ? '<span class="sr-only"> (concluída)</span>' : ""}${locked(i) ? '<span class="sr-only"> (bloqueada)</span>' : ""}</button>` +
        (on && !ok ? `<div class="c-body"><p class="mut">Toque em <b>${r.nome.replace("Rede de ", "")}</b> no mapa acima para ver o desenho e responder.</p></div>` : "") +
        `</li>`
      );
    }).join("");
  }

  /* ---------- Interação ---------- */
  function tocaVertice(id) {
    const rede = REDES[c],
      st = estado[c];
    if (!st.g || !id) return;
    const nome = nomeEm(st.g, id);
    if (rede.id === "computadores") {
      const antes = componentes(st.g.adj, st.g.V).length;
      const g2 = buildRede(rede, nome);
      const depois = componentes(g2.adj, g2.V).length;
      st.remover = nome;
      st.comps = depois;
      st.grupos = componentes(g2.adj, g2.V).map((comp) => comp.map((x) => nomeDe(g2, x)));
      const ok = depois > antes;
      st.ok = ok;
      if (ok) {
        conclui(c);
        fb("ok", rede.explicar({ nome, comps: depois, grupos: st.grupos }));
      } else {
        const sozinho = g2.V.length < st.g.V.length && g2.V.some((x) => g2.adj[x].length === 0);
        fb(
          "info",
          `<b>${nome}</b> saiu da rede. Ela continua com <b>${depois}</b> ${depois === 1 ? "parte" : "partes"}: todos ainda se alcançam. ` +
            `Esse dispositivo não é ponto de articulação${sozinho ? ", porque o que ficou isolado foi apenas ele mesmo" : ""}. ` +
            `Procure um dispositivo que sirva de <b>única passagem</b> entre dois grupos: no desenho, um que ligue uma parte de cima a uma parte de baixo.`,
        );
      }
      draw();
      renderTarefa();
      return;
    }
    if ((rede.arestas || []).some(([, , w]) => Number.isFinite(w))) {
      /* Rede social: monta o trajeto tocando nas pessoas. */
      if (!st.caminho) st.caminho = [];
      const pesoTem = (a, b) => !!pesoDe(rede, st.g, a, b);
      if (!st.caminho.length) st.caminho = [id];
      else {
        const ultimo = st.caminho.at(-1);
        if (id === ultimo) return;
        if (pesoTem(ultimo, id)) st.caminho.push(id);
        else return fb("bad", `Não existe ligação direta entre <b>${nomeEm(st.g, ultimo)}</b> e <b>${nome}</b>. Num grafo, um caminho só usa arestas que existem; toque numa pessoa ligada à última do trajeto.`);
      }
      draw();
      renderTarefa();
      return;
    }
    /* Transporte: escolhe origem/destino e mostra a distância real ao responder. */
    draw();
  }
  function pesoDe(rede, g, a, b) {
    const na = nomeDe(g, a),
      nb = nomeDe(g, b);
    const e = (rede.arestas || []).find(([x, y]) => (x === na && y === nb) || (x === nb && y === na));
    return e ? e[2] : null;
  }

  function conferir() {
    const rede = REDES[c],
      st = estado[c];
    if ((rede.arestas || []).some(([, , w]) => Number.isFinite(w))) return conferirSoma();
    const input = $("#guess");
    if (!input) return;
    const v = Number(input.value);
    if (input.value.trim() === "" || !Number.isInteger(v) || v < 0)
      return fb("bad", "Digite um número inteiro, 0 ou maior.");
    st.guess = v;
    if (rede.id === "transporte") {
      const a = idDe(st.g, rede.origem),
        b = idDe(st.g, rede.destino);
      const cam = caminhoMin(st.g.adj, a, b);
      if (!cam) return fb("bad", "Não há caminho entre essas estações nesta configuração.");
      const dist = cam.length - 1;
      st.revelado = { caminho: cam };
      const nomes = cam.map((x) => nomeEm(st.g, x));
      if (v === dist) {
        conclui(c);
        fb("ok", rede.explicar({ dist, caminho: nomes }));
      } else {
        fb(
          "bad",
          `O trajeto mais curto tem <b>${dist}</b> ${dist === 1 ? "aresta" : "arestas"}, não ${v}. ` +
            `Veja o trajeto destacado no mapa: ${nomes.join(" → ")}. ` +
            `Conte os trechos entre estações vizinhas — cada trecho é uma aresta. Tente de novo com calma.`,
        );
      }
      draw();
      renderTarefa();
    }
  }

  function conferirSoma() {
    const rede = REDES[c],
      st = estado[c];
    const nomes = (st.caminho || []).map((id) => nomeDe(st.g, id));
    if (nomes.length < 2)
      return fb("bad", `Monte um trajeto tocando nas pessoas, começando em <b>${rede.origem}</b> e terminando em <b>${rede.destino}</b>.`);
    if (nomes[0] !== rede.origem || nomes.at(-1) !== rede.destino)
      return fb("bad", `O trajeto precisa começar em <b>${rede.origem}</b> e terminar em <b>${rede.destino}</b>. O seu começa em ${nomes[0]} e termina em ${nomes.at(-1)}.`);
    const pesos = [];
    for (let i = 1; i < st.caminho.length; i++) pesos.push(pesoDe(rede, st.g, st.caminho[i - 1], st.caminho[i]));
    const soma = pesos.reduce((x, y) => x + y, 0);
    const min = Math.min(...pesos);
    st.revelado = { caminho: st.caminho };
    const r = resultadoSociais(rede);
    const melhorSoma = soma === r.minSoma.soma;
    const melhorGargalo = min === r.maxMin.gargalo && nomes.length === r.maxMin.caminho.length;
    if (melhorSoma || melhorGargalo) {
      conclui(c);
      fb(
        "ok",
        `Seu trajeto: <b>${nomes.join(" → ")}</b>, soma <b>${soma}</b> e ligação mais fraca <b>${min}</b>. ` +
          (melhorSoma ? "É o de menor soma. " : "") +
          (melhorGargalo ? "É também o de ligação mais forte. " : "") +
          rede.explicar(r),
      );
    } else {
      fb(
        "bad",
        `Seu trajeto: <b>${nomes.join(" → ")}</b>, soma <b>${soma}</b>, ligação mais fraca <b>${min}</b>. ` +
          `O melhor tem soma <b>${r.minSoma.soma}</b> (${r.minSoma.caminho.join(" → ")}) e a ligação mais forte do melhor trajeto vale <b>${r.maxMin.gargalo}</b> (${r.maxMin.caminho.join(" → ")}). ` +
          `Compare os números das ligações que você usou: há um caminho com ligações mais fortes e outro com soma menor.`,
      );
    }
    draw();
    renderTarefa();
  }
  /* Resultados exatos da rede social, calculados de fato. */
  function resultadoSociais(rede) {
    const g = buildRede(rede, null);
    const porNome = {};
    g.structure.active.forEach((id) => (porNome[nomeDe(g, id)] = id));
    const arestasPeso = rede.arestas.map(([x, y, w]) => [porNome[x], porNome[y], w]);
    const a = porNome[rede.origem],
      b = porNome[rede.destino];
    const ms = menorSoma(arestasPeso, a, b),
      mg = maiorGargalo(arestasPeso, a, b);
    const nome = (cam) => cam.map((id) => nomeDe(g, id));
    /* Soma e menor ligação de cada trajeto, para a explicação comparar os dois critérios. */
    const pesoDe = (x, y) => (arestasPeso.find(([p, q]) => (p === x && q === y) || (q === x && p === y)) || [])[2];
    const medir = (cam) => {
      let s = 0,
        m = Infinity;
      for (let i = 1; i < cam.length; i++) {
        const w = pesoDe(cam[i - 1], cam[i]);
        s += w;
        m = Math.min(m, w);
      }
      return { soma: s, min: m };
    };
    const mms = medir(ms.caminho),
      mmg = medir(mg.caminho);
    return {
      minSoma: { caminho: nome(ms.caminho), soma: ms.soma, min: mms.min },
      maxMin: { caminho: nome(mg.caminho), gargalo: mg.gargalo, soma: mmg.soma },
    };
  }

  /* ---------- Eventos ---------- */
  const vp = G.viewport(svg, { fit: () => G.board.fit({ rows: REDES[c].grade[0], cols: REDES[c].grade[1] }), tap: tocaVertice });

  document.addEventListener("click", (e) => {
    const head = e.target.closest("[data-c]");
    if (head) {
      const to = +head.dataset.c;
      if (locked(to)) {
        const miss = Jor.missing(PH[to]).map((m) => `${m.id} · ${m.nome}`).join(", ");
        return fb("bad", `Esta aplicação pertence à fase ${PH[to]}, ainda bloqueada. Conclua antes: ${miss}.`);
      }
      c = to;
      estado[c] = estado[c] || {};
      fb("info", REDES[c].pergunta);
      vp.fit();
      renderPainel();
      renderTarefa();
      draw();
      return;
    }
    if (e.target.closest("[data-conferir]")) return conferir();
    if (e.target.closest("[data-restaurar]")) {
      estado[c].remover = null;
      estado[c].ok = false;
      fb("info", REDES[c].pergunta);
      draw();
      renderTarefa();
      return;
    }
    if (e.target.closest("[data-limpar]")) {
      estado[c].caminho = [];
      estado[c].revelado = null;
      fb("info", REDES[c].pergunta);
      draw();
      renderTarefa();
      return;
    }
    const crit = e.target.closest("[data-criterio]");
    if (crit) {
      const r = resultadoSociais(REDES[c]);
      if (crit.dataset.criterio === "soma")
        fb("info", `Pelo critério de <b>menor soma</b>, o melhor trajeto é <b>${r.minSoma.caminho.join(" → ")}</b>, somando ${r.minSoma.soma}. Esse critério é o do caminho mais barato.`);
      else
        fb("info", `Pelo critério de <b>ligação mais forte</b>, o melhor trajeto é <b>${r.maxMin.caminho.join(" → ")}</b>: a ligação mais fraca desse trajeto vale ${r.maxMin.gargalo}, e nenhum outro trajeto entre Ana e Dudu consegue uma ligação mais fraca maior que isso.`);
      return;
    }
    const peso = e.target.closest("[data-peso]");
    if (peso && REDES[c].arestas && REDES[c].arestas.some(([, , w]) => Number.isFinite(w))) {
      const [a, b] = peso.dataset.peso.split("|");
      const st = estado[c];
      if (!st.caminho || st.caminho.length < 2) return;
      /* Tocar num peso não monta o trajeto (a ordem importa): apenas explica o valor. */
      const w = pesoDe(REDES[c], st.g, a, b);
      fb("info", `A ligação entre <b>${nomeEm(st.g, a)}</b> e <b>${nomeEm(st.g, b)}</b> tem peso <b>${w}</b>.`);
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "guess" && estado[c]) estado[c].guess = e.target.value;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "guess") {
      e.preventDefault();
      conferir();
    }
  });
  $("#limpar").addEventListener("click", () => {
    estado[c].caminho = [];
    estado[c].revelado = null;
    if (estado[c].remover) estado[c].remover = null;
    fb("info", REDES[c].pergunta);
    draw();
    renderTarefa();
  });

  /* ---------- Início ---------- */
  const asked = G.fase && G.fase.focus ? PH.indexOf(G.fase.focus.id) : -1;
  c = asked >= 0 ? asked : Math.max(0, done.findIndex((d) => !d));
  if (c < 0) c = 0;
  if (locked(c)) c = Math.max(0, done.findIndex((d, i) => !d && !locked(i)));
  estado[c] = estado[c] || {};
  REDES.forEach((_, i) => (estado[i] = estado[i] || {}));
  renderPainel();
  renderTarefa();
  fb("info", REDES[c].pergunta);
  draw();
})(window.Graphos);
