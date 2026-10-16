# Graphos — Etapa 1: análise, diagnóstico e plano de redesign

Documento de trabalho da reformulação profunda da interface e da experiência.
Nenhum arquivo de interface foi alterado nesta etapa: apenas leitura do projeto,
medições no navegador e este plano.

**Como as medições foram feitas.** Servidor estático local (`node scripts/serve.mjs`,
porta de teste 4180), Chrome headless via CDP, viewports de 390 × 844 (celular),
1440 × 844 (desktop) e 780 × 1688 para inspeção visual. Scripts descartáveis em
`qa/measure.mjs` e `qa/shots.mjs`; capturas em `shots/analysis/`. Verificação
existente executada: `node scripts/check.mjs` (OK) e os três arquivos de teste
(12 + 16 + 22 = 50 testes, todos passando; `node --test` roda com erro de sandbox
neste ambiente, então cada arquivo foi executado direto).

---

## 1. O que o projeto é hoje

### 1.1 Arquitetura real

Site estático, HTML + CSS + JavaScript nativos, sem backend, sem build. Servido por
`scripts/serve.mjs`. Fontes (Manrope), ícones (Phosphor, 31 glifos já embutidos em
`js/icons.js`) e GSAP estão vendorizados em `assets/` — não há dependência de CDN
para funcionar. O `package.json` só usa os scripts de manutenção.

- **18 páginas HTML** + 1 redirecionamento (`trilha.html`).
- **3 áreas** declaradas em `G.AREAS` (`js/main.js:32`): Trilha (`index.html`),
  Laboratório (`lab.html`), Pesquisa (`pesquisa.html`).
- **`sobre.html`** é a antiga home de apresentação (`data-page="home"`), fora da
  navegação principal.
- **7 páginas de atividade da trilha** (`explorar`, `pecas`, `caminhos`, `troca`,
  `laboratorio`, `combinatoria`, `redes`) — carregam `js/jornada.js` + `js/fase.js` +
  o script da atividade.
- **6 páginas de bancada** (`estrutura` → `solucao`) — as etapas da investigação,
  sem jornada, abrigadas pelo hub `lab.html`.
- **`js/main.js`** injeta todo o cabeçalho, a subnavegação e o rodapé de navegação
  (`.pager`) em todas as páginas via `<div id="chrome">`.

### 1.2 Recursos e regras que precisam ser preservados

| Sistema | Onde vive | O que faz |
| --- | --- | --- |
| Motor de progressão | `js/jornada.js` | Único lugar com dados (5 mundos, 18 fases, 10 conquistas) e regras: XP uma vez por fase (40–100) + 50 por mundo, desbloqueio por pré-requisitos, conclusão por evidências, conquistas sem XP, revisão sem XP |
| Evidências | atividades → `G.jornada.evidence()` | `explorar:0..4`, `pecas:graus`, `pecas:caminho`, `caminhos:min2`, `meta:*` (troca, minimo, sem-caminho, analise, irregular, hipotese, acerto, contagem), `redes:*` |
| Persistência | `localStorage` | `graphos.jornada` (progresso), `graphos.projeto` (investigação), `graphos.trilha` (legado, apenas lido), `graphos.theme`, `graphos.motion` |
| Motor de grafos | `js/grafo.js`, `js/regras.js`, `js/analise.js` | Cinco regras de peça (cavalo, torre, bispo, dama, rei); BFS, componentes, caminhos, graus, diâmetro |
| Solver exato | `js/solucao.js`, `js/jogo.js` | Troca mínima por BFS no espaço de posições (limite de 150 mil estados na trilha, 400 mil na etapa Solução), limite inferior por atribuição, paridade |
| Bloqueio | `js/fase.js` | Fase bloqueada mostra página de bloqueio também por link direto; modo livre (`?livre=1`) nunca grava |
| Visualização | `js/estrutura.js` (`G.board`), `js/player.js` | Tabuleiro/grafo em SVG com zoom, pan, pinça, toque e teclado; player sincronizado da solução |
| Aplicações reais | `js/redes.js`, mundo 5 | Três redes com arestas **declaradas** e gabaritos conferidos por enumeração |
| Verificação | `scripts/check.mjs`, `tests/*`, `qa/*` | Sintaxe, referências locais, IDs duplicados, 50 testes, `layout-check`, `flow-check`, `pecas-check`, `redes-check` |

Nada disso precisa ser reconstruído. O redesign é de **apresentação, hierarquia e
navegação**; o motor matemático e o motor de progressão ficam como estão.

### 1.3 Formatos de atividade existentes

Já existe variedade real, mas ela não está distribuída onde o estudante percebe:

- **Explorar** — 5 conceitos, todos com o mesmo par tabuleiro + campo numérico
  ("Conferir"). É a página mais repetitiva.
- **Peças como grafos** — troca de peça (5 botões) + 2 etapas; painel com 6 números.
- **Caminhos** — 6 níveis em 3 graus, mover o cavalo, 3 dicas graduais, camadas da
  BFS, campo de justificativa por escrito.
- **Troca de cavalos** — 4 etapas (regras / investigar / matemática / irregulares),
  presets de tabuleiro, registro de tentativas, replay da solução mínima.
- **Hipóteses** — prever antes de testar, caderno de hipóteses, comparação antes/depois.
- **Combinatória** — contagem passo a passo conferida por enumeração das 960.
- **Aplicações** — três redes reais (transporte, computadores, social).

---

## 2. Diagnóstico: onde a experiência trava

Os três comentários dos estudantes se confirmam nas medições. A causa comum é a
**mesma informação ocupando três lugares** antes de o estudante chegar ao tabuleiro.

### 2.1 "O objetivo precisa ser mais intuitivo e a barra de resposta fica longe do tabuleiro"

Medição de `explorar.html` a 390 × 844 (altura útil = 844 px):

| Bloco | Topo (px) | Altura (px) | Observação |
| --- | ---: | ---: | --- |
| Cabeçalho (`#chrome`) | 0 | 152 | 18 % da tela: marca + menu de 3 áreas + subnavegação + linha de XP |
| `.shead` ("Explorar") | 152 | 21 | sem conteúdo próprio: título escondido, sobra a linha de XP |
| `#fase-banner` | 173 | 266 | mundo, "Fase 1.1", nome, objetivo, critério, bloco recolhido, chip, link |
| `#ctask` | 449 | 145 | repete "1/5 · Vértice · Fase 1.1" e a tarefa, e ainda define o conceito |
| `svg.v` (tabuleiro) | 654 | 360 | conteúdo real do tabuleiro: 295 × 295 px |
| `.tools` | 1015 | 101 | zoom, alternador, seletor "Tamanho 5 × 5" em duas linhas |
| `#fb` (retorno) | 1124 | 67 | — |
| `#concepts` | 1270 | 326 | painel de conceitos |
| `.pager` (barra fixa) | 775 | 69 | fixa no rodapé, com setas ↑ ↓ |

Consequências concretas:

1. **O objetivo aparece três vezes** (banner da fase, cartão de tarefa, retorno
   inicial `#fb`), com o mesmo texto em versões diferentes. O estudante lê 266 px de
   prosa antes de ver a primeira casa do tabuleiro.
2. **O tabuleiro começa a 654 px** de uma tela de 844 px. Ele cabe, mas não sobra
   espaço para o controle de resposta: quando o estudante responde em 1.2 ou 2.1, o
   campo numérico está **dentro do `#ctask` (topo 449)** enquanto o tabuleiro termina
   em 1014 — a cerca de **500 px de distância**. É exatamente o relato do estudante.
3. **O retorno (`#fb`) fica 110 px abaixo do tabuleiro** e empurra os controles ainda
   mais para longe a cada resposta.
4. **O "Tamanho 5 × 5"** ocupa uma linha inteira logo abaixo do tabuleiro e não é
   necessário em nenhuma fase da trilha.

No desktop o mesmo problema aparece em outra forma: o tabuleiro começa a 769 px e o
rodapé de navegação em 1292 px, numa página de 1391 px — a dobra inicial é consumida
por título de 48 px, contador de atividade, linha de XP e o banner da fase.

### 2.2 "A experiência no celular"

- **Cabeçalho de 152 px** (18 % da tela) com três faixas: marca + dois botões de
  ícone (animações, tema), menu de áreas, e a subnavegação com seta de voltar e um
  `<select>` "01 · Explorar".
- **Navegação duplicada no rodapé**: `.pager` já é fixo no rodapé em telas pequenas
  (`css/responsive.css:526`), mostrando "Mapa / Peças como grafos" — a mesma função
  do `<select>` acima. Pior: usa `caret-left`/`caret-right` rotacionados 90° para
  apontar para cima e para baixo (`css/jornada.css:97`), então as setas da barra
  inferior apontam **na vertical** em um controle horizontal.
- **Altura do tabuleiro fixa em 360 px** (`css/responsive.css:495`), com 20 px de
  padding: o conteúdo do tabuleiro 5 × 5 fica com 295 px e os outros 65 px são moldura.
  Ao mesmo tempo o cabeçalho e os três blocos de texto consomem 494 px acima dele.
- **Trilha no celular** (`index.html` a 390 × 844): `hero` de 256 px + cartão "Comece
  aqui" de 109 px antes do mapa; o primeiro nó só aparece em **477 px**. O cabeçalho
  do mundo mostra "0/5" e um chip "Bloqueado · conclua 1.5"; os nomes das fases ficam
  escondidos (`display: none` em `css/jornada.css:1469`), sobrando círculos com
  cadeado. Dos 24 controles da página, **13 estão abaixo da dobra**.
- **Nó do mapa com 46 px** de diâmetro desenhado, alvo ampliado por um `::after`
  invisível — funciona, mas o nome não cabe.
- **Laboratório** (`lab.html`): página de **4561 px** no celular, 5 grupos e 10
  cartões iguais, cada um com um bloco recolhido "Como usar" e um bloco "Na trilha:
  fases …". O estudante precisa rolar por uma lista de ferramentas que não diz qual
  usar primeiro.

### 2.3 Poluição visual: a mesma informação em vários lugares

Contagem por página (só o que aparece na primeira dobra do celular):

- **`explorar.html`**: identidade da fase em 4 lugares — `shead` (título + linha XP),
  `#fase-banner` ("Mundo 1 · A Vila dos Grafos", "Fase 1.1", nome), `#ctask`
  ("1 / 5 · Vértice", chip "Fase 1.1") e `#fb` ("Tarefa: …"). O objetivo em 3
  (banner `objetivo`, cartão `texto`, cartão `tarefa`). Estados com chip em 3.
- **`index.html`**: "comece aqui" em 3 — eyebrow + cartão `#j-go` ("COMECE AQUI",
  "1.1 Cada casa, um vértice", "0/18 fases · 0 XP") + etiqueta "Comece aqui" sobre o
  nó. Progresso em 3 — "0/18 fases · 0 XP" no cartão, "0/5" no cabeçalho do mundo,
  barra de progresso. Navegação secundária em 3 — "Trilha/Laboratório/Pesquisa",
  conquistas recolhidas, links "Sobre · Pesquisa".
- **`lab.html`**: cada cartão tem título + descrição + "Como usar" + "Na trilha" +
  botão; 10 cartões em 5 grupos, com subtítulos de grupo explicando o óbvio.

Problemas estruturais adicionais encontrados:

- `explorar.js:345` e `pecas.js:330` leem `CONCEPTS[c].tarefa` / `ETAPAS[c].tarefa`
  **sem o bloco `<b>Tarefa:</b>`**, então a mesma frase aparece em formato diferente
  no cartão e no retorno.
- `pecas.js:296-297` (`$("#peca")` clique) atribui a `sel` e `pair`, que **não existem
  nesse escopo** (o estado vive em `etapas[]`). Trocar de peça lança `ReferenceError`
  e interrompe a atualização do painel. É um bug real de interação, não de estilo.
- `css/style.css` define `.icon-button` duas vezes (linhas 202 e 248).
- `css/style.css` define `--radius: 8px` mas a maioria dos componentes usa
  `border-radius: 0` (cantos retos) — a linguagem de "formas amigáveis" não está
  aplicada de forma consistente.
- `svg.v` tem altura fixa por breakpoint (360/390/430–620 px) e `min-height` por
  média de viewport, então o tabuleiro nunca aproveita o espaço que sobra nem se
  adapta a telas curtas de verdade.
- `#chrome` é `position: sticky` e a tarefa (`ctask-bar`) fica presa em `top: 104px`
  no celular — a instrução fica presa a 104 px do topo *dentro* de um cabeçalho que
  tem 152 px de altura: a primeira linha da instrução fica sob a área de rolagem
  errada quando a barra do navegador recolhe.
- O Laboratório e a Pesquisa não têm nenhuma indicação de qual é a próxima ação; o
  único caminho de volta para "aprender" é um link no fim da página de 4561 px.

### 2.4 Alvos de toque abaixo do confortável (medido)

`node qa/layout-check.mjs` confirma que **não há transbordamento horizontal** em 18
páginas × 6 larguras (a base está saudável). O mesmo instrumento aponta os alvos
pequenos a 320 px, que a Etapa 2 precisa corrigir:

| Alvo | Tamanho medido | Páginas |
| --- | --- | --- |
| `a.brand` (logo + "Graphos") | 120 × 24 | todas |
| botões de zoom (`.zb button`) | 34 × 34 | atividades e bancada |
| botões de ferramenta (`button.g.sm`) | 35 × 30 | atividades e bancada |
| `button.linkish` ("Mais ferramentas", fases) | 167 × 20 e semelhantes | trilha e atividades |
| links de texto (`.text-link`) | 242 × 20 / 63 × 17 | trilha e atividades |
| `input[type=checkbox]` (`#corr`, `#showE`) | 15 × 15 | geometria |
| `button#j-reset` (apagar progresso) | 227 × 38 | trilha |
| nós do mapa | 46 × 46 desenhado, alvo ampliado por `::after` | trilha |

Em `@media (pointer: coarse)` o CSS já eleva `button`, `.btn`, `input` e `select` para
44 px de altura mínima, mas **não** cobre `.zb button` (34 px), `.linkish`,
`.text-link` nem o `.brand`. O mapa mobile também tem `46px` no nó.

### 2.5 Progressão representada de forma fraca

- O avanço é mostrado por **contagem** ("0/18 fases · 0 XP", "0/5", barra de 4 px) e
  por cor (`.node.is-done`, `.node.is-rec`, `.node.is-locked` diferem por cor **e**
  por estilo de borda — a única pista não cromática é o ícone dentro do nó).
- Os 18 nós são distribuídos por 20 fases em 5 mundos, mas cada mundo reinicia a
  grade e não há relação visual entre o fim de um mundo e o começo do próximo além de
  uma aresta tracejada que atravessa a tela.
- Não existe **nível** (o pedido cita XP e níveis): só XP acumulado e fases concluídas.
- Não existe histórico: a data de conclusão é gravada (`s.done[id].at`) mas nunca
  mostrada.

---

## 3. Direção proposta

### 3.1 Arquitetura de navegação (4 destinos reais, sem páginas fictícias)

Hoje há 3 áreas + 7 atividades + 6 etapas + 1 hub + 1 página de conquistas recolhida no
rodapé. Proposta: **quatro destinos**, todos com função real e já existente:

| Destino | Rota | Estado atual | Ação principal |
| --- | --- | --- | --- |
| **Aprender** | `index.html` | já existe (trilha) | continuar a próxima fase |
| **Laboratório** | `lab.html` | já existe (hub) | abrir uma ferramenta |
| **Progresso** | `progresso.html` | **nova, com dados já existentes** | ver conquistas, XP, histórico |
| **Pesquisa** | `pesquisa.html` | já existe | ler a fundamentação |

- **Progresso** não é destino fictício: funde as **conquistas** (hoje recolhidas no
  rodapé da trilha) com estatísticas e histórico que já estão em `js/jornada.js`
  (`xp`, `doneCount`, `achievements()`, `doneAt()`, `reviews()`). Tira do mapa tudo
  que não ajuda a decidir o próximo passo. Nenhuma nova fonte de dados.
- **"Como funciona"** e o reset de progresso saem da home e passam a viver em
  Progresso, junto dos dados que explicam.
- **`sobre.html`** e a linha de XP deixam a navegação principal e ficam no rodapé
  institucional + no menu "Mais" (celular).
- **Atividades da trilha** continuam sendo páginas internas alcançadas pelo nó do
  mapa (rota `?fase=`, já existente) — não viram abas. O `<select>` de atividade
  continua existindo para trocar de atividade dentro da trilha, mas perde a função
  de navegação global.

### 3.2 Menu inferior fixo no celular (3 ou 4 itens)

Barra fixa inferior, altura 56 px + `env(safe-area-inset-bottom)`:

- Itens: **Aprender** (`squares-four`/`map-trifold`), **Laboratório** (`flask`),
  **Progresso** (`trophy`), **Pesquisa** (`book-open`). Ícones já disponíveis, sem
  novas dependências.
- Cada item: ícone 24 px + rótulo curto 11 px. Alvo de 56 × 56 px.
- Estado ativo por **três sinais**: cor, indicador de barra superior **e**
  `aria-current="page"` (a barra superior é um sinal não cromático).
- Rótulos curtos em vez de só ícone: os estudantes do teste não conheciam o produto,
  e três dos quatro ícones são abstratos.
- Navegação por teclado (links `<a>` reais, ordem de tabulação natural), foco visível,
  e animação desligada em `data-motion="reduce"`.
- **Convivência com a ação da fase**: a barra da fase (`ctask-bar`) fica presa no
  topo; a ação primária do exercício ("Conferir", "Testar", "Continuar") vive **acima**
  da barra inferior, e o conteúdo ganha `padding-bottom: calc(56px + safe-area + 12px)`
  em todas as páginas. O `.pager` deixa de ser fixo no rodapé e vira navegação
  anterior/próximo dentro do fluxo — a barra fixa passa a ser uma só.
- **Desktop e tablet**: mantêm o cabeçalho atual (que já funciona bem, com as áreas
  centralizadas). A barra inferior aparece só até 900 px; entre 900 e 1100 px, a
  mesma semântica fica no cabeçalho. Sem menu hambúrguer escondido.

### 3.3 Página Aprender: a trilha como protagonista

- **Remover**: título "Sua jornada pelos grafos" (80 px no desktop / 27 px no celular),
  subtítulo, `eyebrow`, o cartão `#j-go` completo, a contagem "0/18 fases", a barra de
  4 px como terceiro indicador, as conquistas recolhidas e "Como funciona".
- **Manter, em uma faixa de 1 linha** no topo: onde estou (mundo · fase), o nome da
  fase recomendada e o botão "Continuar". É a única ação primária da página.
- **Mapa**: um único caminho contínuo em vez de 5 grades independentes. Cada mundo é
  um trecho com um cabeçalho discreto (número, nome curto, "2/5") e uma régua de
  progresso de 2 px que **não** compete com a próxima fase.
- **Nós**: diâmetro 64 px no celular (nome visível no nó recomendado, no selecionado e
  no concluído; números nos demais), estado por ícone **e** estilo: ✓ concluída,
  cadeado bloqueada, número + anel destacado disponível, rótulo "Próxima" apenas na
  recomendada. Zigue-zague sobre uma linha de base contínua, sem `nth-child(even)`.
- **Painel de detalhes**: no desktop continua ao lado (mas só depois de um clique);
  no celular vira **folha inferior** com o essencial — objetivo (1 linha), "Para
  concluir", botão de ação — e o resto ("situação-problema", "conceito", requisitos,
  próximo passo) sob demanda.
- **Primeira visita**: sem hero, sem cartão; um único convite curto no lugar do nó 1.1
  ("Comece por aqui · 1.1 Cada casa, um vértice"). Primeiro nó a **~150 px** do topo
  (hoje: 477 px).

### 3.4 Exercícios: menos camadas, controles junto do tabuleiro

Hierarquia única por tela, de cima para baixo:

1. **Faixa da missão** (1 linha): `1.1 · Cada casa, um vértice` + chip de estado
   (texto, não só cor) + progresso da fase (`2/2` quando houver mais de uma evidência).
2. **Objetivo em 1 frase** (o `objetivo` da fase, já escrito em `js/jornada.js`).
3. **Tabuleiro/grafo** — altura derivada do espaço disponível
   (`clamp(220px, calc(100svh - 320px), 520px)`), com `aspect-ratio` reservado para
   não empurrar o layout, mantendo zoom/pan/pinça que já existem.
4. **Controles de resposta imediatamente abaixo do tabuleiro**, dentro da mesma
   superfície: campo numérico + "Conferir", escolha múltipla, botões de etapa.
5. **Retorno (`#fb`)** como faixa estável logo abaixo (altura mínima reservada para
   não empurrar o tabuleiro a cada resposta).
6. **"Entenda o conceito" / "Como fazer"** recolhido — o texto de `conceito`,
   `contexto` e `atividade` de cada fase. Nada de prosa antes da tarefa.
7. **Navegação entre etapas** ao pé, no fluxo (não fixa), + ação de continuar.

Onde a informação repetida sai:

- O `shead` (título grande + subtítulo) só aparece quando **não** há faixa de fase.
- O `#ctask` deixa de repetir número da etapa, chip de estado e nome da fase: passa a
  ser só objetivo + tarefa + controles.
- `js/fase.js` para de renderizar o chip e o link "Ver … no Laboratório" na mesma
  dobra do objetivo; esses itens descem para o bloco recolhido.

### 3.5 Variedade didática com finalidade (sem inflar telas)

O problema não é falta de formatos, é **qual formato aparece onde**. Proposta por
conceito, sempre preservando as evidências e a validação atual:

| Onde | Hoje | Proposto | Por quê |
| --- | --- | --- | --- |
| `explorar` 1.1 vértice | tocar 2 casas | **igual** (já é o formato certo) | descoberta por exploração |
| `explorar` 1.2 aresta | campo numérico | **escolha múltipla de números** (2/3/4/8) | mede a mesma coisa, elimina digitação no celular |
| `explorar` 1.3 adjacência | testar 2 pares | **igual** + botão "é adjacente / não é" no par ativo | resposta explícita em vez de implícita |
| `explorar` 1.4 caminho | encadear toques | **igual** | já é construção real |
| `explorar` 1.5/2.1 distância | campo numérico | **escolha múltipla + "não existe caminho"** | o valor `null` (componentes diferentes) hoje não tem como ser respondido |
| `pecas` | 2 etapas | **manter**; mover os 6 números do painel para o bloco "ver dados" | densidade alta em painel que fica abaixo do tabuleiro no celular |
| `caminhos` | níveis + mover + dicas | **manter**; usar o par origem/destino existente | é a atividade mais rica do projeto |
| `troca` | 4 etapas | **manter**; etapas viram um seletor de 4 no topo da coluna | hoje as 4 etapas estão no painel lateral longo |
| `laboratorio` | prever e testar | **manter**; separar "prever" de "calcular" visualmente | já é o formato mais autoral |
| `combinatoria` | contagem passo a passo | **manter** | formato único e adequado |
| `redes` | 3 redes | **manter**; legenda e objetivo na mesma faixa | é a resposta ao 3º comentário |

Regra: **nenhum formato novo entra sem uma evidência associada**. Onde a escolha
múltipla substituir o campo numérico, a validação passa a comparar o índice escolhido
com o valor calculado pelo mesmo motor (nenhuma regra matemática muda).

### 3.6 Aplicações reais (respondendo ao 3º comentário)

O mundo 5 já existe com três redes calculadas de verdade: transporte (caminho mínimo),
computadores (ponto de articulação) e redes sociais (peso vs. gargalo). O que falta é
torná-las **visíveis na jornada** e não apenas no fim:

- Faixa "Onde isso aparece" de **uma linha** em 1.1, 1.4, 2.1 e 2.2, com um exemplo
  concreto e um link para a fase correspondente do mundo 5:
  - 1.1 (vértice/grau): aeroporto com muitas rotas tem grau alto.
  - 1.4 (caminho): trajeto de metrô é um caminho em um grafo.
  - 2.1/2.2 (distância/mínimo): rota mais curta entre duas estações.
  - 2.3 (componentes): duas ilhas sem cabo não se comunicam.
- No Laboratório, um grupo "Aplicações" (já existe) com o mesmo tratamento, e no
  Progresso um bloco "Aplicações exploradas" (derivado de `redes:*`, sem novo dado).
- Nada de texto enciclopédico: cada faixa tem no máximo 2 linhas e 1 link.

### 3.7 Identidade visual

Mantendo a **identidade escura existente** (grafite/preto com rosa e lilás) como ponto
de partida, com ajustes de sistema:

- **Cores** (`css/style.css`, tokens já existentes): manter `--bg #0d080f`,
  `--surface #170e15`, `--ac #e847ab`, `--pur #a794e0`. Ajustes propostos:
  - separar **cor de estado** de **cor de dado**: o gráfico usa lilás (`--pur`); os
    estados usam rosa (`--ac`) para disponível/recomendada, verde (`--ok`) para
    concluída e cinza tracejado para bloqueada — como já ocorre, mas com o lilás
    deixando de aparecer em botões;
  - garantir 4,5:1 nos textos secundários (hoje `--mut #a495a0` sobre `#0d080f` passa;
    sobre `--surface #170e15` fica no limite — será medido e ajustado);
  - cor nunca sozinha: todo estado ganha ícone ou texto.
- **Tipografia**: uma escala só (3 tamanhos de título, 2 de corpo, 1 de dado mono).
  Hoje há 27/48/80 px de título, 12/13,5/14 px de corpo e mono de 9 a 10 px; a mono de
  9 px será elevada a 11 px (legibilidade) e reservada para coordenadas, XP e IDs.
- **Formas**: escala de raios (8 / 12 / 20 / pilha) substituindo os `border-radius: 0`.
  As **casas do tabuleiro continuam quadradas** — a malha é matemática, não decoração.
- **Superfícies**: sombra apenas na barra inferior e na folha de detalhes (elevação
  real). Sem gradientes decorativos. Ícones já existem; nenhum ícone novo de CDN.
- **Microinterações** (todas sob `data-motion="reduce"`): nó do mapa com anel de
  progresso preenchendo, barra de progresso animando ao concluir, feedback com
  aparição curta, e o nó recomendado pulsando **uma vez** (hoje `node-pop` já faz isso).

---

## 4. Plano de execução por etapas

Cada etapa termina com verificação real: `node scripts/check.mjs`, os três arquivos de
teste, medição de layout sem transbordamento horizontal em 6 larguras × 18 páginas
(`qa/layout-check.mjs`) e inspeção visual das páginas tocadas. Ao fim de cada etapa eu
apresento o resumo, os arquivos alterados e as verificações — e aguardo autorização.

### Etapa 2 — Sistema visual e navegação
- Tokens: escala tipográfica, raios, cores de estado, espaçamentos, foco; remover as
  duplicações em `css/style.css` (`.icon-button` repetido).
- Componentes compartilhados: faixa de missão (`.missao`), faixa de retorno (`.fb`
  revisado), folha inferior, chip de estado com ícone, botão primário/secundário.
- **Barra inferior mobile** em `js/main.js` + CSS novo: 4 itens, `aria-current`,
  indicador não cromático, safe area, `padding-bottom` de conteúdo, regra de altura
  de tabuleiro, remoção do `.pager` fixo e das setas verticais.
- Arquivos: `css/style.css`, `css/jornada.css`, `css/responsive.css`, `css/trilha.css`,
  `js/main.js`, `js/icons.js` (só se faltar um glifo), `index.html`, `lab.html`,
  `progresso.html` (novo, estrutura), todas as 18 páginas (uma linha: `id="chrome"` +
  `class` de corpo, se necessário).
- Verificação: barra não cobre conteúdo em 390/414/360 px nas páginas com rolagem
  longa; foco visível; navegação por teclado; `layout-check` sem transbordamento.

### Etapa 3 — Página Aprender e trilha
- Nova composição de `index.html` e reescrita de `js/trilha-mapa.js` (dados vêm de
  `G.jornada`, sem tocar no motor): caminho contínuo, mundo como trecho, nó com estado
  por ícone, painel/folha, faixa única "continuar".
- `progresso.html` + `js/progresso.js`: conquistas, XP, histórico (`doneAt`), reset de
  progresso, "como funciona". Reaproveita `renderAch()` que hoje vive em
  `trilha-mapa.js`.
- Arquivos: `index.html`, `progresso.html`, `js/trilha-mapa.js`, `js/progresso.js`,
  `css/jornada.css`, `js/main.js` (rotas em `G.AREAS`).

### Etapa 4 — Exercícios e experiência mobile
- `js/fase.js`: faixa de missão única; remover chip e link da dobra; mover requisitos
  e contexto para o bloco recolhido.
- `explorar.html`/`js/explorar.js`: controles dentro do cartão do tabuleiro, remover o
  `shead` quando há missão, variedade de resposta (1.2 e 2.1 com escolha múltipla,
  1.3 com confirmação explícita, 2.1 com "não existe caminho").
- `js/pecas.js`: corrigir o `ReferenceError` ao trocar de peça; painel de números para
  o bloco sob demanda.
- `caminhos.html`/`js/caminhos.js`, `troca.html`/`js/troca.js`,
  `laboratorio.html`/`js/laboratorio.js`, `combinatoria`, `redes`: mover controles
  para a coluna do tabuleiro, resumo de objetivos em 1 linha, feedback estável.
- `css/trilha.css`, `css/responsive.css`: altura de tabuleiro adaptativa, alvos ≥ 44 px,
  sem rolagem horizontal, nada sob a barra inferior.
- Verificação: percorrer 1.1 → 1.2 → 1.3 → 1.4 com resposta certa e errada; conferir
  XP e desbloqueio (`qa/flow-check.mjs`, `qa/pecas-check.mjs`).

### Etapa 5 — Laboratório e aplicações
- `lab.html`: 5 grupos → 2 blocos ("Explorar" e "Investigar"), cartões compactos com
  uma frase e uma ação; "Como usar" sob demanda; vínculo com a trilha em uma linha.
- Aplicações: faixa "Onde isso aparece" em 1.1, 1.4, 2.1, 2.2 e bloco em Progresso.
- Arquivos: `lab.html`, `css/jornada.css`, `js/lab.js`, `js/jornada.js` (novo campo
  opcional `aplicacao` por fase — só texto, nenhuma regra nova).

### Etapa 6 — Gamificação e refinamento
- Progresso com XP, fases, conquistas e histórico; remover contadores redundantes
  ("0/18 fases · 0 XP" em três lugares) e o "0/5" do cabeçalho do mundo.
- Microinterações do nó, da barra e do feedback; transições sob movimento reduzido.
- Arquivos: `js/progresso.js`, `js/trilha-mapa.js`, `css/*`.

### Etapa 7 — Revisão final
- `qa/layout-check.mjs` (18 páginas × 6 larguras), novo roteiro de teclado e de barra
  inferior, `qa/flow-check.mjs`, `qa/pecas-check.mjs`, `qa/redes-check.mjs`; console
  limpo; progresso preservado (incluindo o legado `graphos.trilha`); contraste medido
  nos pares essenciais; atualização de `README.md` e `docs/`.

**Riscos e mitigação**

| Risco | Mitigação |
| --- | --- |
| Perder uma funcionalidade ao mover controles | cada etapa termina rodando `flow-check`/`pecas-check`, que exercitam o fluxo real |
| Quebrar a rota `?fase=` e o bloqueio | `js/fase.js` mantém a API (`blocked`, `focus`, `phases`) e os `href` de `js/jornada.js` não mudam |
| Barra inferior encobrir tabuleiro/feedback | `padding-bottom` calculado por `env(safe-area-inset-bottom)` e teste explícito nas páginas com tabuleiro |
| Barra inferior competir com a ação da fase | a ação primária fica **acima** da barra; o `.pager` deixa de ser fixo |
| Excesso de mudança de uma vez | uma etapa por vez, com sua própria verificação e sua própria aprovação |
| Textos novos com imprecisão matemática | aplicações reaproveitam o que já está em `js/redes.js`/`js/jornada.js`; nenhuma afirmação nova sem cálculo |

---

## 5. Decisões que preciso confirmar antes da Etapa 2

1. **Progresso como quarto destino**: criar `progresso.html` fundindo conquistas +
   estatísticas + histórico, e tirar conquistas/"como funciona" do rodapé da trilha.
2. **Barra inferior com 4 itens** (Aprender, Laboratório, Progresso, Pesquisa) e
   rótulos curtos visíveis — em vez de 3 itens só com ícone ou 5 itens.
3. **`sobre.html` e `pesquisa.html`** saem do cabeçalho principal: `Pesquisa` fica na
   barra inferior (é conteúdo real) e `sobre.html` vai para o rodapé/"Mais".
4. **Tema claro**: manter os dois temas. A direção escura é a identidade; o tema claro
   continua existindo para leitura longa (Pesquisa, Sobre) — nenhuma remoção.
5. **Variedade de resposta**: aceitar trocar o campo numérico por escolha múltipla em
   1.2 e 2.1 (mesma evidência, mesma validação, menos digitação no celular).

---

## 6. Artefatos desta etapa

| Arquivo | Papel |
| --- | --- |
| `docs/etapa-1-analise-e-plano.md` | este diagnóstico e plano |
| `qa/measure.mjs` | script descartável de medição (posição dos blocos, área do tabuleiro, controles abaixo da dobra) |
| `qa/probe-gap.mjs`, `qa/probe-cover.mjs` | sondas pontuais de folga e de cobertura usadas na Etapa 2 |
| `qa/nav-check.mjs` | verificação da barra inferior (18 páginas × 3 larguras) |
| `shots/measure.json` | resultado bruto das 8 medições (index/explorar/lab/caminhos/troca/redes × 390/1440) |
| `shots/analysis/*.png` | capturas de referência (antes): index, explorar e lab em 390 e 1440 px |
| `shots/etapa2/*.png` | capturas depois da Etapa 2, para comparação |

Nenhum arquivo de interface, estilo, dado ou regra foi modificado na Etapa 1.
Os únicos arquivos criados foram de documentação e de diagnóstico.

---

## 6. Etapa 2 — registro do que foi feito

**Sistema visual**

- Escala tipográfica única (`--fs-t1..--fs-t3`, `--fs-body`, `--fs-small`, `--fs-mono`):
  a mono subiu de 9–10px para 11px, e os rótulos monoespaçados de 9px saíram.
- Escala de raios (`--radius-sm/--radius/--radius-lg/--radius-xl/--radius-pill`)
  substituindo os `border-radius: 0`; as casas do tabuleiro continuam quadradas.
- Contraste do secundário no tema escuro: `--mut` passou de `#a495a0` (4,07:1 sobre
  `--surface`) para `#b4a6b1` (**6,84:1** sobre `--surface`, 6,26:1 sobre `--bg`).
- `.pager` deixou de ter filete na cor da tinta (peso de título) e passou a `--line2`;
  a barra de progresso permanece o único filete forte.
- Limpezas: regra duplicada de `.icon-button`, `.skip-link` (1px, sem deslocar o
  documento) e regras órfãs da home antiga.

**Navegação (4 destinos, uma navegação por largura)**

- `G.AREAS` agora tem Aprender, Laboratório, Progresso e Pesquisa, cada um com ícone
  e rótulo curto; `G.areaOf` deixou de devolver `null` (páginas sem área, como
  `sobre.html`, mantêm Aprender marcado).
- **Barra inferior fixa** até 900px: 58px de altura + `env(safe-area-inset-bottom)`,
  fundo opaco com desfoque, indicador de seção no topo do item (sinal que não depende
  de cor), `aria-current="page"` e alvos de 97 × 58px.
- O menu de áreas do cabeçalho é ocultado no celular: existe **uma** navegação por
  largura. Acima de 900px a barra não existe e o cabeçalho volta a mostrar as áreas.
- **Menu "Mais"**: folha única com tema, animações, exemplo pronto e páginas
  institucionais (`sobre.html`, `pesquisa.html`, `lab.html`); fecha por Escape, pelo
  véu e pelo botão, devolvendo o foco ao abridor.
- O rodapé `.pager` voltou ao fluxo (não é mais uma segunda barra fixa) e as setas
  deixaram de ser `caret-left/right` rotacionados — a navegação anterior/próximo é
  horizontal de verdade.
- Reserva de espaço: `--nav-b` no `body` e folga extra no fim das páginas
  (`.j-foot`, `.p-foot`, `.panel`, `.wrap`), para que nenhum controle termine sob a
  barra.

**Página Progresso** (`progresso.html` + `js/progresso.js`)

- Quatro números (XP, fases, mundos, conquistas) e a próxima ação em uma faixa.
- Conquistas (as 10, com bloqueadas e obtidas) e histórico das fases concluídas com
  data, mundo, XP e número de revisões — dados que já existiam em `js/jornada.js` e
  nunca eram mostrados.
- "Como o progresso funciona" e o apagar progresso saíram do rodapé da trilha.

**Verificações**

| Verificação | Resultado |
| --- | --- |
| `node scripts/check.mjs` | sintaxe, referências locais e IDs: sem problemas |
| Testes (12 + 16 + 22) | **50 passam, 0 falham** |
| `qa/nav-check.mjs` (novo) | 111 verificações: barra fixa no rodapé, 1 item ativo com `aria-current`, alvos ≥ 44px, **nada encoberto** no fim das 18 páginas em 360/390/414px, desktop sem barra |
| `qa/layout-check.mjs` | 18 páginas × 6 larguras: sem transbordamento horizontal |
| `qa/flow-check.mjs` (atualizado) | **23 verificações, 0 falhas**, sem erros de console; inclui barra navegando de verdade e menu "Mais" |
| `qa/pecas-check.mjs` | 17 verificações, sem falhas |
| `qa/redes-check.mjs` | dados e gabaritos das aplicações: sem falhas |
| Inspeção visual | index, explorar, lab, progresso em 390 e 1440px, nos temas escuro e claro |

**Efeito medido (celular, 390 × 844)**

| Medida | Antes | Depois |
| --- | ---: | ---: |
| Altura do cabeçalho | 152px (18 % da tela) | **103px** |
| Navegação | menu de 3 áreas + `<select>` + barra fixa com setas verticais | barra inferior de 4 áreas + seletor de atividade |
| Acesso às áreas principais | topo da página, com rolagem | sempre visível na barra |
| Conquistas e "como funciona" | recolhidos no rodapé da trilha | página Progresso |

**Arquivos alterados na Etapa 2**

`css/style.css` (tokens e casca), `css/jornada.css` (Progresso e limpeza da casca),
`css/responsive.css` (cabeçalho de uma faixa, folgas), `js/main.js` (casca completa),
`js/trilha-mapa.js` (reset e conquistas saíram do mapa), `index.html` (rodapé),
`progresso.html` e `js/progresso.js` (novos), `js/icons.js` e `scripts/vendor.mjs`
(quatro glifos novos), `README.md`, `qa/flow-check.mjs`, `qa/nav-check.mjs` (novo).

**Pendências anotadas para as próximas etapas** (não são regressões)

- Nos exercícios, a identidade da fase aparece em três lugares (faixa, contador da
  atividade e chip da tarefa) e a resposta fica a 475px do tabuleiro → **Etapa 4**.
- `js/pecas.js` escreve em `sel`/`pair` inexistentes ao trocar de peça
  (`ReferenceError` silencioso) → **Etapa 4**.
- Alvos pequenos restantes: `.brand` (120 × 24), botões de zoom da bancada
  (`button.g.sm`, 35 × 30), checkboxes de 15px → **Etapas 4 e 5**.
- A página Aprender foi refeita na Etapa 3 (ver abaixo).

---

## 7. Etapa 3 — registro do que foi feito

**Página Aprender** (`index.html`, `js/trilha-mapa.js`, `css/jornada.css`)

- Título de 80px, subtítulo, `eyebrow` longo, contagem "0/18 fases · 0 XP" duplicada,
  conquistas recolhidas e "Como funciona" **saíram**. A faixa do topo passou a ter o
  título em `--fs-t1` e o cartão de ação `#j-go` como **única** ação principal
  (medido: uma barra de progresso e um botão "Começar/Continuar" na página).
- **Trilha contínua** em vez de 5 grades independentes: cada fase é um nó posicionado
  por `(x, linha)` em `TRAIL` (js/trilha-mapa.js), com `--rows`/`--trail-h` definindo a
  altura. O cabeçalho do mundo ocupa a primeira linha do seu trecho, então o percurso
  atravessa os cinco mundos sem reiniciar a grade.
- Nó de 56px (50px no celular) com **estado por ícone**: ✓ concluída, cadeado
  bloqueada, número da fase disponível; a recomendada leva o rótulo "Próxima" e o anel
  em `box-shadow: inset` (não muda o alvo nem o quadro). O nome fica abaixo do ponto,
  em `max-content` com alinhamento para dentro nas pontas — o caminho nunca cruza o
  texto e nenhum rótulo sai do quadro.
- XP deixou de ser número solto repetido em cada nó: aparece só na fase recomendada e,
  com o valor exato e a recompensa do mundo, no painel de detalhes.
- **Painel de detalhes**: coluna no desktop; no celular vira **folha** presa acima da
  barra inferior, com botão de fechar (Escape também fecha) e devolução do foco ao nó.
- Cabeçalhos de mundo mais discretos: nome curto, `N/M` e chip de estado.

**Efeito medido (390 × 844)**

| Medida | Antes | Depois |
| --- | ---: | ---: |
| Topo do primeiro nó | 477px | **353px** |
| Nós visíveis na primeira dobra | 1 | **5** (mundo 1 inteiro) |
| Página inicial (altura do documento) | 2203px | **2242px** (mesmos 18 nós, mais compactos) |
| Onde está o progresso | cartão + cabeçalho do mundo + barra | uma barra + uma linha |

**Verificações**

| Verificação | Resultado |
| --- | --- |
| `node scripts/check.mjs` | sem problemas |
| Testes (12 + 16 + 22) | **50 passam, 0 falham** |
| `qa/trail-check.mjs` (novo) | **27 verificações, 0 falhas**: 18 nós e 17 arestas, primeira fase na dobra, nada fora do quadro, nenhum rótulo invadindo outro nó, 5 mundos na ordem, uma ação principal, uma barra, estados com ícone, nomes acessíveis, folha abre/fecha devolvendo o foco, sem erro de console |
| `qa/nav-check.mjs` | 111 verificações: nada encoberto pela barra (o teste passou a ignorar componentes fora de vista) |
| `qa/layout-check.mjs` | 18 páginas × 6 larguras: sem transbordamento (duas larguras de 320px acusaram o rótulo da trilha antes do ajuste de alinhamento) |
| `qa/flow-check.mjs` | 23 verificações, 0 falhas |
| Inspeção visual | index em 320, 390 e 1440px |

**Arquivos alterados na Etapa 3**: `index.html` (faixa e marcação do mapa),
`js/trilha-mapa.js` (reescrito), `css/jornada.css` (bloco do mapa substituído, ~4,5 mil
caracteres de regras antigas removidas), `qa/trail-check.mjs` (novo),
`qa/nav-check.mjs` e `docs/etapa-1-analise-e-plano.md`.
