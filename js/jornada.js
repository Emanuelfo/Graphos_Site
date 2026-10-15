/* Graphos / jornada: motor único da Trilha de Aprendizagem gamificada.
   Concentra dados (mundos, fases, conquistas), regras (XP, desbloqueio, conclusão) e persistência.
   Nenhum outro arquivo decide XP, conclusão ou bloqueio: as páginas apenas informam EVIDÊNCIAS
   (eventos reais de aprendizagem) por G.jornada.evidence(id) e leem o resultado.

   REGRAS (documentadas aqui, aplicadas em create()):
   1. Uma fase só aceita evidências enquanto está DESBLOQUEADA e NÃO concluída. Evidências de fases
      bloqueadas são descartadas: nada "adianta" progresso.
   2. Uma fase é concluída quando TODAS as evidências de `needs` foram registradas (evidências são
      eventos verificados pela atividade: resposta conferida, caminho mínimo, análise calculada...).
   3. XP: cada fase concede `xp` UMA vez (primeira conclusão). Cada mundo concluído concede
      WORLD_BONUS UMA vez. Revisões (evidência numa fase já concluída) só incrementam o contador
      de revisões: nunca concedem XP. XP é sempre recalculado a partir das fases concluídas,
      nunca confiado ao valor salvo. XP registra o percurso; não mede capacidade matemática.
   4. Fase desbloqueada = todas as fases de `requires` concluídas.
   5. Conquistas são avaliadas automaticamente após cada mudança e não concedem XP.
   6. Modo livre (?livre=1 nas ferramentas): nenhuma evidência é registrada.
   Persistência: localStorage, chave graphos.jornada (neste navegador e neste dispositivo). */
(function (root) {
  const KEY = "graphos.jornada",
    LEGACY_KEY = "graphos.trilha",
    VERSION = 1,
    WORLD_BONUS = 50;

  /* ---------- Mundos ---------- */
  const WORLDS = [
    {
      id: "vila",
      n: 1,
      nome: "A Vila dos Grafos",
      curto: "Vila",
      objetivo:
        "Compreender os elementos básicos de um grafo e usá-los para representar relações.",
      resumo: "Vértices, arestas, adjacência e caminhos no tabuleiro do cavalo.",
    },
    {
      id: "labirinto",
      n: 2,
      nome: "O Labirinto dos Caminhos",
      curto: "Labirinto",
      objetivo:
        "Compreender como encontrar e analisar caminhos em um grafo: distância, caminho mínimo e ausência de caminho.",
      resumo: "Distâncias, busca em largura e destinos inalcançáveis.",
    },
    {
      id: "reino",
      n: 3,
      nome: "O Reino do Cavalo",
      curto: "Reino",
      objetivo:
        "Aplicar a teoria dos grafos ao problema de troca de cavalos, inclusive em tabuleiros irregulares.",
      resumo: "A troca de cavalos, o mínimo exato, limite inferior, paridade e casas removidas.",
    },
    {
      id: "possibilidades",
      n: 4,
      nome: "O Laboratório de Possibilidades",
      curto: "Possibilidades",
      objetivo:
        "Formular hipóteses sobre tabuleiros alterados e contar configurações por dedução e por enumeração.",
      resumo: "Hipóteses sobre tabuleiros e a contagem das disposições do Xadrez de Fischer.",
    },
    {
      id: "redes",
      n: 5,
      nome: "As Redes do Mundo",
      curto: "Redes",
      objetivo:
        "Reconhecer os mesmos vértices, arestas e caminhos em problemas reais de ciência e tecnologia.",
      resumo: "Transporte, redes de computadores e redes sociais como grafos.",
    },
  ];

  /* ---------- Fases ----------
     needs   : evidências exigidas (todas). Formatos: "explorar:i" (conceito i concluído em
               explorar.html), "meta:id" (meta da trilha), "caminhos:min2" (caminho mínimo num
               trajeto de distância ≥ 2).
     requires: fases que precisam estar concluídas para desbloquear.
     lab/pesquisa: conexões contextuais com as outras áreas. */
  const P = (o) => ({ ...o, href: `${o.page}.html?fase=${o.id}` });
  const PHASES = [
    P({
      id: "1.1", world: "vila", page: "explorar", nome: "Cada casa, um vértice", xp: 40, requires: [],
      needs: ["explorar:0"],
      objetivo: "Reconhecer as casas como vértices e perceber que o grau (número de arestas) varia de vértice para vértice.",
      contexto: "Um tabuleiro de xadrez parece um conjunto de quadrados. Para um cavalo, porém, cada casa é um ponto de partida com um número diferente de destinos.",
      conceito: "Vértice é um ponto do grafo. Grau é o número de arestas que saem dele.",
      atividade: "Toque num canto e numa casa do centro do tabuleiro e compare quantos saltos saem de cada uma.",
      criterio: "Observar vértices de pelo menos dois graus diferentes.",
      lab: { href: "grafo.html", label: "Ver o grafo do cavalo no Laboratório" },
    }),
    P({
      id: "1.2", world: "vila", page: "explorar", nome: "Saltos viram arestas", xp: 40, requires: ["1.1"],
      needs: ["explorar:1"],
      objetivo: "Identificar arestas como ligações entre duas casas e contá-las num vértice.",
      contexto: "Cada salto em L que termina dentro do tabuleiro liga duas casas. Essa ligação é a aresta.",
      conceito: "Aresta é uma ligação entre dois vértices. Num canto sobram poucos saltos que cabem no tabuleiro.",
      atividade: "Explore as arestas de B3 e responda: quantas arestas saem do canto A1?",
      criterio: "Responder corretamente o número de arestas do canto A1.",
      lab: { href: "grafo.html", label: "Ver as arestas no Laboratório" },
    }),
    P({
      id: "1.3", world: "vila", page: "explorar", nome: "Quem é vizinho de quem?", xp: 40, requires: ["1.2"],
      needs: ["explorar:2"],
      objetivo: "Decidir se duas casas são adjacentes a partir do deslocamento em L.",
      contexto: "Duas casas estão ligadas quando um único salto do cavalo leva de uma à outra.",
      conceito: "Dois vértices são adjacentes quando há uma aresta entre eles.",
      atividade: "Teste pares de casas até encontrar ao menos um par adjacente e um par que não é.",
      criterio: "Testar um par adjacente e um par não adjacente.",
      lab: { href: "grafo.html", label: "Consultar adjacências no Laboratório" },
    }),
    P({
      id: "1.4", world: "vila", page: "explorar", nome: "Trace um caminho", xp: 50, requires: ["1.3"],
      needs: ["explorar:3"],
      objetivo: "Construir um caminho: uma sequência de casas em que cada uma é adjacente à seguinte.",
      contexto: "Para ir de uma casa a outra, o cavalo encadeia saltos. Cada salto precisa ser uma aresta.",
      conceito: "Um caminho é uma sequência de vértices consecutivos adjacentes. Seu comprimento é o número de arestas.",
      atividade: "Parta de uma casa e continue pelos saltos do cavalo até formar um caminho de pelo menos 3 arestas.",
      criterio: "Formar um caminho válido com pelo menos 3 arestas.",
      lab: { href: "analise.html", label: "Investigar caminhos no Laboratório" },
    }),
    P({
      id: "1.5", world: "vila", page: "pecas", nome: "Cada peça, um grafo", xp: 60, requires: ["1.4"],
      needs: ["pecas:graus", "pecas:caminho"],
      objetivo: "Comparar os grafos gerados pelos movimentos de peças diferentes e perceber que a regra, não o tabuleiro, decide as arestas.",
      contexto: "O mesmo tabuleiro pode virar redes muito diferentes. Depende de qual peça está em jogo: a torre anda em linha reta, o bispo só na diagonal, o rei uma casa por vez.",
      conceito: "Cada peça define uma regra de movimento. A regra decide quais arestas existem e, portanto, o grau de cada casa, as distâncias e quantas componentes conexas o grafo tem. O bispo, por exemplo, nunca muda a cor da casa: o grafo dele fica dividido em duas partes.",
      atividade: "Escolha uma peça, toque numa casa de canto e conte os movimentos dela. Troque de peça e toque na mesma casa. Depois confira um caminho entre duas casas.",
      criterio: "Observar o grau da mesma casa em duas peças e conferir um caminho (ou a ausência dele).",
      lab: { href: "pecas.html?livre=1", label: "Comparar peças no Laboratório" },
    }),
    P({
      id: "2.1", world: "labirinto", page: "explorar", nome: "Medindo distâncias", xp: 50, requires: ["1.5"],
      needs: ["explorar:4"],
      objetivo: "Estimar e conferir a distância entre duas casas, usando as camadas da busca em largura.",
      contexto: "Há muitos caminhos entre duas casas. A pergunta útil é: qual o menor número de saltos?",
      conceito: "Distância é o menor número de arestas de um caminho entre dois vértices. A busca em largura a calcula por camadas.",
      atividade: "Escolha duas casas, aposte a distância e confira. A evidência vale quando você acerta num par cuja distância ainda não tinha sido revelada.",
      criterio: "Acertar a distância de um par antes de vê-la revelada.",
      lab: { href: "analise.html", label: "Medir distâncias no Laboratório" },
      pesquisa: { href: "pesquisa.html#fundamentacao", label: "Caminhos mínimos na fundamentação" },
    }),
    P({
      id: "2.2", world: "labirinto", page: "caminhos", nome: "O menor caminho", xp: 70, requires: ["2.1"],
      needs: ["caminhos:min2"],
      objetivo: "Encontrar um caminho de comprimento mínimo movendo o cavalo e comparar com o mínimo calculado.",
      contexto: "Chegar ao destino é uma coisa; chegar com o menor número de saltos é outra.",
      conceito: "Um caminho mínimo tem comprimento igual à distância. Pode haver vários caminhos mínimos.",
      atividade: "Leve o cavalo da origem ao destino em um nível cuja distância seja de pelo menos 2 saltos, usando o menor número possível.",
      criterio: "Chegar ao destino com exatamente o número mínimo de saltos, num trajeto de distância ≥ 2.",
      lab: { href: "analise.html", label: "Comparar caminhos no Laboratório" },
      pesquisa: { href: "pesquisa.html#fundamentacao", label: "Caminhos mínimos na fundamentação" },
    }),
    P({
      id: "2.3", world: "labirinto", page: "caminhos", nome: "Sem saída", xp: 60, requires: ["2.2"],
      needs: ["meta:sem-caminho"],
      objetivo: "Reconhecer que alguns destinos são inalcançáveis e justificar isso pelas casas alcançáveis.",
      contexto: "Nem todo destino pode ser atingido: em certos tabuleiros o grafo se divide em partes desconectadas.",
      conceito: "Se não existe caminho entre dois vértices, eles estão em componentes conexas diferentes.",
      atividade: "No nível “Existe caminho?” (ou num tabuleiro seu), use Casas alcançáveis e verifique que o destino não aparece.",
      criterio: "Verificar, pelas casas alcançáveis, que um destino não pode ser atingido.",
      lab: { href: "analise.html", label: "Ver componentes conexas no Laboratório" },
      pesquisa: { href: "pesquisa.html#fundamentacao", label: "Conectividade na fundamentação" },
    }),
    P({
      id: "3.1", world: "reino", page: "troca", nome: "A troca de cavalos", xp: 80, requires: ["2.2"],
      needs: ["meta:troca"],
      objetivo: "Resolver o problema de troca: brancos nas casas iniciais dos pretos e vice-versa, sem capturas.",
      contexto: "É o problema original da pesquisa: dois cavalos brancos e dois pretos num tabuleiro 4 × 3 precisam trocar de lugar.",
      conceito: "Cada posição do conjunto de cavalos é um estado; cada movimento legal liga dois estados.",
      atividade: "Mova os cavalos até que cada cor ocupe as casas iniciais da outra.",
      criterio: "Concluir a troca respeitando as regras (qualquer número de movimentos).",
      lab: { href: "solucao.html", label: "Ver a solução animada no Laboratório" },
      pesquisa: { href: "pesquisa.html#problema", label: "O problema na Pesquisa" },
    }),
    P({
      id: "3.2", world: "reino", page: "troca", nome: "O mínimo da troca", xp: 100, requires: ["3.1"],
      needs: ["meta:troca-minimo"],
      objetivo: "Distinguir resolver de resolver da melhor forma: igualar o número mínimo de movimentos.",
      contexto: "Resolver a troca não prova que não existia solução menor. O mínimo exato vem da busca no espaço de posições.",
      conceito: "O mínimo é calculado por busca em largura sobre as posições; comparar com ele mostra o que foi desvio.",
      atividade: "Refaça a troca comparando estratégias, até igualar o mínimo calculado.",
      criterio: "Concluir a troca com exatamente o mínimo de movimentos calculado.",
      lab: { href: "solucao.html", label: "Ver a sequência mínima no Laboratório" },
      pesquisa: { href: "pesquisa.html#metodologia", label: "Metodologia da busca" },
    }),
    P({
      id: "3.3", world: "reino", page: "troca", nome: "Limite inferior e paridade", xp: 90, requires: ["3.2"],
      needs: ["meta:analise"],
      objetivo: "Comparar o limite inferior (soma das distâncias individuais) com o mínimo exato e entender a paridade.",
      contexto: "Cada cavalo, sozinho, tem um caminho mais curto até seu destino. A soma desses caminhos limita o total por baixo, mas os cavalos se atrapalham.",
      conceito: "Limite inferior: nenhum plano usa menos movimentos que ele. Paridade: cada salto troca a cor da casa do cavalo.",
      atividade: "Na etapa Matemática, calcule o mínimo e compare o limite inferior com o resultado exato.",
      criterio: "Calcular a análise (limite inferior, paridade e mínimo exato) de uma troca possível.",
      lab: { href: "analise.html", label: "Analisar o grafo no Laboratório" },
      pesquisa: { href: "pesquisa.html#argumentos", label: "Argumentos de limite e paridade" },
    }),
    P({
      id: "3.4", world: "reino", page: "troca", nome: "Tabuleiros irregulares", xp: 90, requires: ["3.3"],
      needs: ["meta:irregular"],
      objetivo: "Investigar como retirar casas altera caminhos, o mínimo e a possibilidade da troca.",
      contexto: "A pesquisa estende o problema a tabuleiros com casas removidas.",
      conceito: "Casas ausentes não bloqueiam o salto, apenas deixam de ser destinos. O grafo muda; os cálculos precisam ser refeitos.",
      atividade: "Na etapa Tabuleiros irregulares, escolha ou edite um tabuleiro com casas removidas e calcule a análise.",
      criterio: "Calcular a análise de um tabuleiro com casas removidas.",
      lab: { href: "estrutura.html?modo=tabuleiro", label: "Criar um tabuleiro irregular no Laboratório" },
      pesquisa: { href: "pesquisa.html#desenvolvimento", label: "Tabuleiros irregulares na Pesquisa" },
    }),
    P({
      id: "4.1", world: "possibilidades", page: "laboratorio", nome: "Formule uma hipótese", xp: 80, requires: ["3.4"],
      needs: ["meta:hipotese"],
      objetivo: "Prever o efeito de alterar o tabuleiro e testar a previsão com o cálculo real.",
      contexto: "Antes de calcular, um matemático conjectura. Depois confronta a conjectura com os fatos.",
      conceito: "Hipótese é uma previsão que pode ser refutada; o cálculo do grafo decide.",
      atividade: "Altere o tabuleiro, registre sua previsão e teste.",
      criterio: "Registrar uma previsão e testá-la com o cálculo.",
      lab: { href: "estrutura.html?modo=tabuleiro", label: "Alterar tabuleiros no Laboratório" },
      pesquisa: { href: "pesquisa.html#metodologia", label: "Como a investigação testa conjecturas" },
    }),
    P({
      id: "4.2", world: "possibilidades", page: "laboratorio", nome: "Preveja antes de testar", xp: 90, requires: ["4.1"],
      needs: ["meta:acerto"],
      objetivo: "Desenvolver intuição sobre propriedades dos tabuleiros acertando previsões antes do teste.",
      contexto: "Quando previsões acertam por razões, e não por sorte, a estrutura do problema está sendo compreendida.",
      conceito: "Padrões observados orientam novas hipóteses; uma previsão certa não substitui uma demonstração.",
      atividade: "Teste novas hipóteses até acertar uma previsão antes de ver o resultado.",
      criterio: "Acertar uma previsão registrada antes do teste.",
      lab: { href: "estrutura.html?modo=tabuleiro", label: "Testar outros tabuleiros no Laboratório" },
    }),
    P({
      id: "4.3", world: "possibilidades", page: "combinatoria", nome: "Contando disposições", xp: 100, requires: ["4.1"],
      needs: ["meta:contagem"],
      objetivo: "Contar as disposições iniciais do Xadrez de Fischer por dedução e conferir por enumeração.",
      contexto: "No Xadrez 960 a primeira fileira é sorteada, com restrições. Quantas disposições existem?",
      conceito: "Princípio multiplicativo e correção de contagens por casos; enumeração como verificação.",
      atividade: "Monte a contagem passo a passo e confira com a enumeração das 960 disposições.",
      criterio: "Conferir que a contagem coincide com a enumeração.",
      lab: { href: "combinatoria.html?livre=1", label: "Explorar as 960 disposições (modo livre)" },
    }),
    /* Mundo 5: as mesmas ferramentas da Teoria dos Grafos aplicadas a redes reais.
       Uma fase por exemplo; a página redes.html abriga as três. */
    P({
      id: "5.1", world: "redes", page: "redes", nome: "Redes de transporte", xp: 70, requires: ["4.3"],
      needs: ["redes:transporte"],
      objetivo: "Ler um mapa de metrô como grafo: identificar o que são vértices e arestas e comparar trajetos entre duas estações.",
      contexto: "Um mapa de linhas parece um desenho específico de transporte. Para a matemática, é um grafo com nome de lugar.",
      conceito: "Em uma rede de transporte, cada estação é um vértice e cada trecho direto entre duas estações é uma aresta. O trajeto com menos estações é um caminho mínimo.",
      atividade: "Compare dois trajetos entre as estações destacadas, responda quantas arestas tem o menor e confira com a busca em largura.",
      criterio: "Indicar corretamente o número de arestas do trajeto mais curto.",
      lab: { href: "analise.html?livre=1", label: "Medir caminhos no Laboratório" },
    }),
    P({
      id: "5.2", world: "redes", page: "redes", nome: "Redes de computadores", xp: 70, requires: ["5.1"],
      needs: ["redes:computadores"],
      objetivo: "Descobrir quais pontos de uma rede, se caírem, deixam outros dispositivos sem comunicação.",
      contexto: "Numa rede de computadores, alguns roteadores concentram a comunicação. Tirar um deles pode isolar um grupo inteiro.",
      conceito: "Um vértice cuja remoção aumenta o número de componentes conexas é um ponto de articulação. Ele é uma vulnerabilidade da rede.",
      atividade: "Clique nos roteadores para simular falhas e encontre um ponto de articulação: um único que, removido, separa a rede.",
      criterio: "Identificar um vértice cuja remoção desconecta a rede e explicar por quê.",
      lab: { href: "estrutura.html?livre=1", label: "Remover casas no Laboratório" },
    }),
    P({
      id: "5.3", world: "redes", page: "redes", nome: "Redes sociais", xp: 80, requires: ["5.2"],
      needs: ["redes:sociais"],
      objetivo: "Comparar qualidades de caminho quando as arestas não são todas iguais.",
      contexto: "Entre duas pessoas pode haver vários caminhos de amizade. O mais curto nem sempre é o mais confiável.",
      conceito: "Quando cada aresta tem um peso, é preciso escolher o critério: o caminho mais curto minimiza a soma dos pesos; o mais forte maximiza a menor ligação do trajeto.",
      atividade: "Ligue duas pessoas por um caminho e compare com o trajeto de menor soma e com o de ligação mais forte. Explique qual escolheria.",
      criterio: "Construir um caminho válido entre as duas pessoas e compará-lo com os dois critérios.",
      lab: { href: "analise.html?livre=1", label: "Investigar caminhos no Laboratório" },
      pesquisa: { href: "pesquisa.html#fundamentacao", label: "Caminhos mínimos na fundamentação" },
    }),
  ];

  /* Páginas de atividades e as fases que cada uma abriga. */
  const PAGES = {};
  PHASES.forEach((p) => (PAGES[p.page] = [...(PAGES[p.page] || []), p.id]));

  const BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p]));
  const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w]));
  WORLDS.forEach((w) => (w.fases = PHASES.filter((p) => p.world === w.id).map((p) => p.id)));
  PHASES.forEach((p) => (p.proximas = PHASES.filter((q) => q.requires.includes(p.id)).map((q) => q.id)));
  const XP_MAX = PHASES.reduce((s, p) => s + p.xp, 0) + WORLD_BONUS * WORLDS.length;

  /* ---------- Conquistas (sem XP) ---------- */
  const worldAch = (w, nome) => ({
    id: `mundo-${w}`,
    nome,
    desc: `Conclua todas as fases de ${WORLD_BY_ID[w].nome}.`,
    test: (a) => a.worldDone(w),
  });
  const ACHIEVEMENTS = [
    { id: "primeiro-passo", nome: "Primeiro passo", desc: "Conclua sua primeira fase.", test: (a) => a.doneCount() >= 1 },
    worldAch("vila", "Cidadão da Vila"),
    worldAch("labirinto", "Saiu do labirinto"),
    worldAch("reino", "Cavaleiro do Reino"),
    worldAch("possibilidades", "Cientista de possibilidades"),
    { id: "sem-saida", nome: "Reconhecer o impossível", desc: "Mostre que um destino é inalcançável (fase 2.3).", test: (a) => a.isDone("2.3") },
    { id: "minimo-comprovado", nome: "Mínimo comprovado", desc: "Resolva a troca de cavalos com o número mínimo de movimentos (fase 3.2).", test: (a) => a.isDone("3.2") },
    { id: "previsao-certeira", nome: "Previsão certeira", desc: "Acerte uma previsão antes de testá-la (fase 4.2).", test: (a) => a.isDone("4.2") },
    { id: "quatro-mundos", nome: "Quatro mundos visitados", desc: "Conclua ao menos uma fase em cada um dos quatro mundos.", test: (a) => WORLDS.every((w) => w.fases.some((f) => a.isDone(f))) },
    { id: "jornada-completa", nome: "Jornada completa", desc: "Conclua todas as fases disponíveis.", test: (a) => a.doneCount() === PHASES.length },
  ];

  /* ---------- Estado: validação ---------- */
  const blank = () => ({ v: VERSION, prog: {}, done: {}, bonus: {}, ach: {}, reviews: {}, legacy: false });
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  /* Aceita só o que é coerente com o registro de fases; descarta o resto (dados antigos, inválidos ou adulterados). */
  function sanitize(raw) {
    const s = blank();
    if (!isObj(raw) || raw.v !== VERSION) return s;
    const rd = isObj(raw.done) ? raw.done : {};
    for (const p of PHASES) {
      const d = rd[p.id];
      if (isObj(d) && p.requires.every((r) => s.done[r]))
        s.done[p.id] = { at: Number.isFinite(d.at) ? d.at : 0, legacy: !!d.legacy };
    }
    const rp = isObj(raw.prog) ? raw.prog : {};
    for (const p of PHASES) {
      if (s.done[p.id] || !p.requires.every((r) => s.done[r]) || !Array.isArray(rp[p.id])) continue;
      const have = rp[p.id].filter((e) => p.needs.includes(e));
      if (have.length) s.prog[p.id] = [...new Set(have)];
    }
    const rb = isObj(raw.bonus) ? raw.bonus : {};
    WORLDS.forEach((w) => {
      if (rb[w.id] === true && w.fases.every((f) => s.done[f])) s.bonus[w.id] = true;
    });
    const rr = isObj(raw.reviews) ? raw.reviews : {};
    for (const id of Object.keys(s.done)) {
      const n = rr[id];
      if (Number.isInteger(n) && n > 0) s.reviews[id] = Math.min(n, 9999);
    }
    const ra = isObj(raw.ach) ? raw.ach : {};
    ACHIEVEMENTS.forEach((a) => {
      if (Number.isFinite(ra[a.id])) s.ach[a.id] = ra[a.id];
    });
    s.legacy = raw.legacy === true;
    return s;
  }

  /* ---------- Motor ---------- */
  /* io: { read(key) -> string|null, write(key, text) -> boolean, emit(detail), free: boolean, now() } */
  function create(io) {
    let s = blank(),
      persistent = true;
    const now = () => (io.now ? io.now() : Date.now());
    const emit = (events) => io.emit && events.length && io.emit({ events });

    const api = {
      WORLDS, PHASES, ACHIEVEMENTS, PAGES, WORLD_BONUS, XP_MAX, KEY,
      phase: (id) => BY_ID[id] || null,
      world: (id) => WORLD_BY_ID[id] || null,
      isFree: () => !!io.free,
      get persistent() { return persistent; },
      isDone: (id) => !!s.done[id],
      doneCount: () => Object.keys(s.done).length,
      worldDone: (w) => WORLD_BY_ID[w].fases.every((f) => s.done[f]),
      isUnlocked: (id) => !!BY_ID[id] && BY_ID[id].requires.every((r) => s.done[r]),
      status(id) {
        if (!BY_ID[id]) return null;
        return s.done[id] ? "done" : api.isUnlocked(id) ? "available" : "locked";
      },
      /* Fases ainda não concluídas que impedem o desbloqueio. */
      missing: (id) => (BY_ID[id] ? BY_ID[id].requires.filter((r) => !s.done[r]).map((r) => BY_ID[r]) : []),
      /* Fase recomendada: a primeira disponível na ordem da jornada. */
      next: () => PHASES.find((p) => api.status(p.id) === "available") || null,
      /* Quais evidências da fase já foram registradas. */
      have: (id) => (s.done[id] ? [...BY_ID[id].needs] : s.prog[id] || []),
      reviews: (id) => s.reviews[id] || 0,
      doneAt: (id) => (s.done[id] ? s.done[id].at : 0),
      isLegacy: (id) => !!(s.done[id] && s.done[id].legacy),
      xp: () =>
        PHASES.reduce((t, p) => t + (s.done[p.id] ? p.xp : 0), 0) +
        WORLDS.reduce((t, w) => t + (s.bonus[w.id] ? WORLD_BONUS : 0), 0),
      achievements: () => ACHIEVEMENTS.map((a) => ({ ...a, got: !!s.ach[a.id], at: s.ach[a.id] || 0 })),
      summary() {
        const nx = api.next();
        return {
          xp: api.xp(), xpMax: XP_MAX, done: api.doneCount(), total: PHASES.length,
          pct: Math.round((api.doneCount() / PHASES.length) * 100),
          worldsDone: WORLDS.filter((w) => api.worldDone(w.id)).length,
          next: nx, world: nx ? WORLD_BY_ID[nx.world] : null,
          ach: ACHIEVEMENTS.filter((a) => s.ach[a.id]).length,
          achTotal: ACHIEVEMENTS.length,
        };
      },
      /* Fases abrigadas por uma página, na ordem. */
      pagePhases: (page) => (PAGES[page] || []).map((id) => BY_ID[id]),

      /* Registra uma evidência. Devolve a lista de eventos gerados. */
      evidence(id) {
        if (io.free) return [];
        const events = [];
        let changed = false;
        for (const p of PHASES) {
          if (!p.needs.includes(id)) continue;
          if (s.done[p.id]) {
            s.reviews[p.id] = (s.reviews[p.id] || 0) + 1;
            events.push({ type: "revisao", phase: p.id, xp: 0 });
            changed = true;
          } else if (api.isUnlocked(p.id)) {
            const have = new Set(s.prog[p.id] || []);
            if (!have.has(id)) {
              have.add(id);
              s.prog[p.id] = [...have];
              changed = true;
            }
            if (p.needs.every((n) => have.has(n))) {
              events.push(...complete(p));
            }
          }
          /* fase bloqueada: evidência descartada de propósito */
        }
        if (changed) {
          events.push(...awardAchievements());
          save();
          emit(events);
        }
        return events;
      },
      reset() {
        s = blank();
        try { io.write(KEY, null); } catch (e) { /* ignore */ }
        emit([{ type: "reset" }]);
      },
      reload() {
        load();
        emit([{ type: "reload" }]);
      },
      /* Para testes e depuração. */
      _state: () => s,
    };

    function complete(p, silent) {
      const out = [];
      delete s.prog[p.id];
      s.done[p.id] = { at: now(), legacy: !!silent };
      out.push({ type: "fase", phase: p.id, xp: p.xp, silent: !!silent });
      const w = WORLD_BY_ID[p.world];
      if (api.worldDone(w.id) && !s.bonus[w.id]) {
        s.bonus[w.id] = true;
        out.push({ type: "mundo", world: w.id, xp: WORLD_BONUS, silent: !!silent });
      }
      return out;
    }
    function awardAchievements(silent) {
      const out = [];
      for (const a of ACHIEVEMENTS)
        if (!s.ach[a.id] && a.test(api)) {
          s.ach[a.id] = now();
          out.push({ type: "conquista", id: a.id, nome: a.nome, silent: !!silent });
        }
      return out;
    }
    function save() {
      try {
        persistent = !!io.write(KEY, JSON.stringify(s));
      } catch (e) {
        persistent = false;
      }
    }
    /* Progresso da versão anterior (graphos.trilha): reconhece só o que corresponde a evidências atuais. */
    function migrateLegacy() {
      let old;
      try { old = JSON.parse(io.read(LEGACY_KEY)); } catch (e) { return; }
      if (!isObj(old)) return;
      const have = new Set();
      if (isObj(old.metas)) Object.keys(old.metas).forEach((k) => old.metas[k] === true && have.add(`meta:${k}`));
      const ed = isObj(old.explorar) && Array.isArray(old.explorar.done) ? old.explorar.done : [];
      ed.forEach((d, i) => d === true && have.add(`explorar:${i}`));
      let any = false;
      for (const p of PHASES)
        if (api.isUnlocked(p.id) && p.needs.every((n) => have.has(n))) {
          complete(p, true);
          any = true;
        }
      if (any) {
        s.legacy = true;
        awardAchievements(true);
        save();
      }
    }
    function load() {
      let raw = null;
      try {
        const t = io.read(KEY);
        raw = t ? JSON.parse(t) : null;
      } catch (e) {
        raw = null;
      }
      const had = raw !== null;
      s = sanitize(raw);
      if (!had) migrateLegacy();
      else {
        /* Conquistas sempre coerentes com as fases concluídas (sem anúncios). */
        const before = Object.keys(s.ach).length;
        awardAchievements(true);
        if (Object.keys(s.ach).length !== before) save();
      }
    }
    load();
    return api;
  }

  /* ---------- Integração com o navegador ---------- */
  const out = { WORLDS, PHASES, ACHIEVEMENTS, PAGES, create, sanitize, WORLD_BONUS, XP_MAX };
  root.GraphosJornada = out;
  const G = root.Graphos;
  if (G && typeof localStorage !== "undefined") {
    let free = false;
    try {
      free = new URLSearchParams(root.location ? root.location.search : "").get("livre") === "1";
    } catch (e) { /* ignore */ }
    const doc = root.document;
    G.jornada = create({
      free,
      read: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
      write: (k, v) => {
        try {
          if (v === null) localStorage.removeItem(k);
          else localStorage.setItem(k, v);
          return true;
        } catch (e) { return false; }
      },
      emit(detail) {
        if (!doc || !doc.dispatchEvent) return;
        const ev = new Event("graphos:jornada");
        ev.detail = detail;
        doc.dispatchEvent(ev);
      },
    });
    /* Mensagem curta para cada evento de recompensa. */
    G.jornada.say = (events) =>
      events
        .filter((e) => !e.silent)
        .map((e) => {
          if (e.type === "fase") return `Fase concluída: ${BY_ID[e.phase].nome} · +${e.xp} XP`;
          if (e.type === "mundo") return `Mundo concluído: ${WORLD_BY_ID[e.world].nome} · +${e.xp} XP`;
          if (e.type === "conquista") return `Conquista: ${e.nome}`;
          if (e.type === "revisao") return "Revisão registrada. Fases já concluídas não geram XP novamente.";
          return "";
        })
        .filter(Boolean);
    if (doc && doc.addEventListener)
      doc.addEventListener("graphos:jornada", (e) => {
        const ev = (e.detail && e.detail.events) || [];
        const fresh = ev.filter((x) => x.type === "fase" || x.type === "mundo" || x.type === "conquista");
        const msg = G.jornada.say(fresh.length ? fresh : []);
        if (msg.length && G.toast) G.toast(msg.join(" · "));
      });
    if (root.addEventListener)
      root.addEventListener("storage", (e) => {
        if (e.key === KEY || e.key === null) G.jornada.reload();
      });
  }
})(typeof window !== "undefined" ? window : globalThis);
