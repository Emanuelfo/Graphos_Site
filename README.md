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

## Três áreas

- **Trilha de Aprendizagem** (`index.html`, a página inicial; `trilha.html` apenas redireciona): mapa gamificado de 5 mundos e 18 fases. Cada fase é um vértice e cada pré-requisito uma aresta.
- **Laboratório** (`lab.html`): ferramentas livres, sem XP e sem sequência. As sete atividades da trilha abrem em modo livre com `?livre=1`; a bancada de seis etapas (`estrutura` a `solucao`) segue como era.
- **Pesquisa** (`pesquisa.html`): problema, fundamentação, metodologia, demonstrações, resultados computacionais, limitações. Referências ainda pendentes (marcadas como tal).

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

- `js/main.js`: estado persistido, navegação, preferências visuais, gestos e exportação.
- `js/estrutura.js`, `regras.js`, `grafo.js`, `geometria.js`, `analise.js`: ferramentas e algoritmos. `regras.js` traz as cinco regras de peça (cavalo, torre, bispo, dama, rei).
- `js/pecas.js`: a fase 1.5. Só compõe a tela: o grafo de cada peça vem de `regras.js` + `grafo.js`.
- `js/redes.js`: as três redes do mundo 5. As arestas são **declaradas** (nome de origem e destino), não deduzidas da posição no desenho; os dados ficam em `G.redesData` para conferência fora do navegador.
- `js/solucao.js`: busca exata; `js/player.js`: reprodução sincronizada e linha do tempo.
- `js/home.js`: cenas em perspectiva, grafo e caminho geradas pelas mesmas regras do laboratório.
- `js/motion.js`: entrada tipográfica, narrativa de rolagem com ScrollTrigger e continuidade entre representações geométricas.
- `css/style.css`: temas, figuras e controles (tokens de espaçamento `--sp-1..--sp-8`, raios e cores de estado); `css/jornada.css`: navegação, mapa, faixas de fase, Laboratório e Pesquisa; `css/trilha.css`: atividades; `css/responsive.css`: adaptações de layout.
- `assets/licenses`: créditos e condições das dependências.

## Verificação

```sh
npm run check   # sintaxe, referências locais, IDs duplicados
npm test        # 50 testes: algoritmos, peças como grafos, jornada e conteúdos
```

Com o servidor no ar (`npm start`), há quatro verificações que usam o Chrome instalado:

```sh
node qa/layout-check.mjs   # transbordamento horizontal em 6 larguras × 18 páginas
node qa/flow-check.mjs     # fluxo real: responder, concluir, navegar, bloqueio
node qa/pecas-check.mjs    # a fase 1.5: painel, etapas, evidências e desbloqueio
node qa/redes-check.mjs    # dados e gabaritos das aplicações (roda sem navegador)
```

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

A página inicial é o próprio mapa: título curto, um botão "Começar/Continuar" para a fase recomendada, nós circulares conectados e painel lateral enxuto (detalhes pedagógicos em "Mais sobre esta fase"). Conquistas e "Como funciona" ficam recolhidos no rodapé. A antiga página inicial de apresentação virou `sobre.html`. No Laboratório, instruções de uso ficam em "Como usar" (recolhido).
