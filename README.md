# Graphos

Laboratório visual de teoria dos grafos e dos Problemas de Guarini. HTML, CSS e JavaScript nativos, sem backend.

## Executar

Com Node.js 22 ou superior:

```sh
npm start
```

Acesse http://127.0.0.1:4173. Uma porta diferente pode ser definida com a variável `PORT`.

Também funciona em qualquer servidor HTTP estático. As fontes, os ícones e o GSAP já estão incluídos em `assets/`; o site não depende de CDN, instalação de pacotes ou compilação para funcionar.

## Manutenção

```sh
npm ci
npm run vendor
npm run check
npm test
```

`vendor` atualiza as cópias locais das dependências e os ícones selecionados. `check` verifica a sintaxe dos scripts, referências locais e IDs duplicados. Os testes verificam regras de movimento, topologia, caminhos mínimos, disposições, persistência, a solução do problema original, dicas, limite inferior, paridade, a contagem do Xadrez de Fischer por enumeração e o motor de progressão.

## Quatro áreas

- **Aprender** (`index.html`, a página inicial; `trilha.html` apenas redireciona): mapa gamificado de 5 mundos e 18 fases. Cada fase é um vértice e cada pré-requisito uma aresta.
- **Laboratório** (`lab.html`): ferramentas livres, sem XP e sem sequência. As sete atividades da trilha abrem em modo livre com `?livre=1`; a bancada de seis etapas (`estrutura` a `solucao`) segue como era.
- **Progresso** (`progresso.html`): XP, fases concluídas, conquistas e histórico. Só lê `js/jornada.js`; a lista de conquistas e o apagar progresso saíram do rodapé da trilha e vivem aqui.
- **Pesquisa** (`pesquisa.html`): problema, fundamentação, metodologia, demonstrações, resultados computacionais, limitações. Referências ainda pendentes (marcadas como tal).

## Navegação

A casca da interface é montada por `js/main.js` a partir de `G.AREAS` (as quatro áreas), `G.TRILHA` (atividades) e `G.STEPS` (etapas da bancada):

- **Até 900px**: uma **barra inferior fixa** com as quatro áreas (ícone + rótulo), o indicador de seção atual, `aria-current="page"` e respeito à área segura do aparelho. O menu do cabeçalho desaparece nessa largura, para não haver duas navegações. A casca reserva espaço (`--nav-b`) para a barra não encobrir conteúdo.
- **Acima de 900px**: as áreas ficam no cabeçalho e a barra inferior não existe.
- **Menu "Mais"**: a mesma folha em qualquer largura, com tema, animações, exemplo pronto e páginas institucionais (`sobre.html`). Reúne o que era secundário no cabeçalho.
- Em atividades com mais de uma fase/etapa, o seletor de módulo (celular) e a lista de abas (desktop) continuam trocando de página; o rodapé `.pager` virou navegação anterior/próximo **no fluxo** (não é mais uma barra fixa).

## Jornada gamificada

- `js/jornada.js`: **único** lugar com dados (mundos, fases, conquistas) e regras (XP, desbloqueio, conclusão). Regras documentadas no cabeçalho do arquivo. Para adicionar uma fase: um item em `PHASES` (e uma posição em `LAYOUT` de `js/trilha-mapa.js`; uma atividade nova também pede uma entrada em `G.TRILHA` de `js/main.js`).
- As atividades só informam **evidências** (`G.jornada.evidence("meta:troca")`). Evidência de fase bloqueada é descartada; XP é concedido uma única vez por fase e por mundo; revisões não dão XP.
- `js/fase.js`: faixa da fase e **bloqueio** nas páginas de atividade (também por link direto); `js/trilha-mapa.js`: mapa, painel de detalhes, conquistas.
- Persistência: `localStorage`, chave `graphos.jornada`, **só neste navegador e dispositivo** (sem conta, sem sincronização). Dados inválidos são descartados; XP é sempre recalculado. O progresso da versão anterior (`graphos.trilha`) é reconhecido na primeira abertura quando equivale a evidências atuais.
- Critérios reforçados em relação à versão anterior: 1.1 exige comparar dois graus; 2.1 exige acertar a distância de um par ainda não revelado; 2.2 exige caminho mínimo com distância ≥ 2.
- **Fase 1.5 — Cada peça, um grafo** (`pecas.html`): a mesma casa, grafos diferentes. O estudante troca de peça (torre, bispo, dama, rei, cavalo) e compara graus, arestas e componentes. Duas etapas com critério múltiplo: comparar o grau da mesma casa em duas peças e conferir um caminho (ou verificar que ele não existe). Exige 1.4 e destrava 2.1. As regras dessas peças vivem em `js/regras.js` (`rook`, `bishop`, `queen`, `king`); quem desliza é bloqueado por casa ausente, quem salta não é — e isso tem teste próprio.
- **Mundo 5 — As Redes do Mundo** (`redes.html`): aplicações reais da Teoria dos Grafos. Três fases, uma por situação: 5.1 rede de transporte (comparar trajetos e achar o caminho mínimo), 5.2 rede de computadores (achar o ponto de articulação que separa a rede), 5.3 rede social (comparar o caminho de menor soma com o de ligação mais forte). Depende de 4.3.

## Atividades da trilha (herdadas)

`explorar`, `caminhos`, `troca`, `laboratorio` (agora “Hipóteses”) e `combinatoria` mantêm sua lógica (`js/jogo.js`, `js/combinatoria.js`, `js/solucao.js`). Limites: nas páginas da trilha a busca exata para em 150 mil estados e as dicas exatas só valem até 80 mil posições.

## Organização

- `js/main.js`: estado persistido, navegação (cabeçalho, subnavegação, barra inferior, menu "Mais", tema e movimento), viewport SVG e exportação.
- `js/estrutura.js`, `regras.js`, `grafo.js`, `geometria.js`, `analise.js`: ferramentas e algoritmos. `regras.js` traz as cinco regras de peça (cavalo, torre, bispo, dama, rei).
- `js/pecas.js`: a fase 1.5. Só compõe a tela: o grafo de cada peça vem de `regras.js` + `grafo.js`.
- `js/redes.js`: as três redes do mundo 5. As arestas são **declaradas** (nome de origem e destino), não deduzidas da posição no desenho; os dados ficam em `G.redesData` para conferência fora do navegador.
- `js/solucao.js`: busca exata; `js/player.js`: reprodução sincronizada e linha do tempo.
- `js/progresso.js`: a página Progresso. Só lê o motor (`G.jornada`): conquistas, XP e histórico.
- `js/home.js`: cenas em perspectiva, grafo e caminho geradas pelas mesmas regras do laboratório.
- `js/motion.js`: entrada tipográfica, narrativa de rolagem com ScrollTrigger e continuidade entre representações geométricas.
- `css/style.css`: tokens (tipografia `--fs-*`, raios, espaçamento `--sp-1..--sp-8`, cores de estado, `--nav-b`/`--safe-b`), componentes base **e a casca do site** (cabeçalho, subnavegação, barra inferior, folha "Mais"); `css/jornada.css`: mapa, faixas de fase, página Progresso, Laboratório e Pesquisa; `css/trilha.css`: atividades; `css/responsive.css`: adaptações de layout.
- `assets/licenses`: créditos e condições das dependências.

## Verificação

```sh
npm run check   # sintaxe, referências locais, IDs duplicados
npm test        # 50 testes: algoritmos, peças como grafos, jornada e conteúdos
```

Com o servidor no ar (`npm start`), há cinco verificações que usam o Chrome instalado:

```sh
node qa/layout-check.mjs   # transbordamento horizontal em 6 larguras × 18 páginas
node qa/nav-check.mjs      # barra inferior: fixa, ativa, alvos ≥ 44px, nada encoberto
node qa/trail-check.mjs    # página Aprender: nós, rótulos, uma ação, folha de detalhes
node qa/flow-check.mjs     # fluxo real: responder, concluir, navegar, bloqueio, barra e menu
node qa/pecas-check.mjs    # a fase 1.5: painel, etapas, evidências e desbloqueio
node qa/redes-check.mjs    # dados e gabaritos das aplicações (roda sem navegador)
```

`qa/nav-check.mjs` cobre as 18 páginas em 360, 390 e 414px e confere, além da barra, o
cabeçalho no desktop. `qa/measure.mjs`, `qa/probe-gap.mjs`, `qa/probe-cover.mjs` e
`qa/probe-trail.mjs` são sondas pontuais de medição usadas nas etapas 1 a 3.

O projeto continua usando `graphos.projeto` no localStorage. As preferências visuais usam chaves separadas: `graphos.theme` e `graphos.motion`. Todas as rotas originais foram mantidas.

O movimento segue `prefers-reduced-motion` por padrão. O controle de animações no cabeçalho permite escolher explicitamente entre movimento completo e reduzido; a escolha persiste entre páginas. No modo reduzido, a narrativa apresenta o caminho completo sem exigir rolagem prolongada ou animação.

O solucionador continua executando no navegador com limite de 400 mil estados. Configurações grandes podem atingir esse limite ou exigir mais processamento; esse comportamento já existia antes da transformação visual.

## Recuperação

Estado original: commit `afa11a1`, também preservado em `codex/before-visual-transformation`.
Primeira direção visual: commit `b262b9c`, preservado em `codex/graphos-first-direction`.
Direção editorial anterior: commit `effd525`, preservado em `codex/before-kinetic-revamp`.
Implementação: branch `codex/graphos-visual-transformation`.

Consulte [a avaliação visual e a validação](docs/visual-review.md).

## Interface simplificada (v2)

A página inicial é o próprio mapa: título curto, um botão "Começar/Continuar" para a fase recomendada, nós circulares conectados e painel lateral enxuto (detalhes pedagógicos em "Mais sobre esta fase").

## Reformulação da experiência (etapas)

Trabalho em etapas, com diagnóstico e aprovação a cada uma. Documentos:

- `docs/etapa-1-analise-e-plano.md`: diagnóstico medido (blocos de interface, poluição, experiência móvel) e plano das etapas 2 a 7.
- **Etapa 2 (concluída)**: sistema visual (escala tipográfica, raios, cores de estado, contraste do secundário) e navegação — barra inferior fixa no celular com quatro áreas, menu "Mais", `.pager` de volta ao fluxo e a página **Progresso** (conquistas, XP e histórico fora do rodapé da trilha). A casca vive em `css/style.css` e `js/main.js`.
- **Etapa 3 (concluída)**: página **Aprender** refeita — trilha contínua em nós posicionados por `TRAIL` (`js/trilha-mapa.js`), estado por ícone, nome abaixo do ponto, XP só na fase recomendada, painel de detalhes que vira folha no celular, e a identidade da fase em um lugar só. Conquistas e "Como funciona" ficam na página Progresso; nenhuma regra de XP, desbloqueio ou conclusão foi tocada.

## Mapa da trilha (manutenção)

Cada fase precisa de dados em `js/jornada.js` (`PHASES`) e de uma posição em `TRAIL`
(`js/trilha-mapa.js`): `x` em fração da largura (0,2 a 0,8 mantém nó e rótulo dentro do
quadro) e a linha, que é contada junto com o cabeçalho do mundo. A altura do desenho é
`--rows × --trail-h` (96px→76px no desktop, 72px no celular), então uma fase nova
empurra as seguintes automaticamente. O rótulo escolhe o alinhamento por `alignOf(x)`.

Conquistas e "Como funciona" ficam na página Progresso. No Laboratório, instruções de uso ficam em "Como usar" (recolhido).
