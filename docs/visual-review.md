# Revisão visual do Graphos

8 de outubro de 2026.

## O diagnóstico

O Graphos é uma ferramenta educativa nascida de uma pesquisa Math en Jeans sobre os Problemas de Guarini. O projeto original tinha pouca hierarquia, desenhos e controles desproporcionais, navegação sem nomes no celular e uma reprodução que redesenhava as peças diretamente no destino. Havia também um link para uma seção ausente e um listener associado a um elemento inexistente.

A primeira direção desta transformação também precisou ser revista. Os cartões arredondados, a palavra destacada em rosa, os slogans, a ilustração CGI e as superfícies com brilho aproximavam o site de um template de produto. A mudança solicitada pelo usuário foi incorporada à implementação inteira.

## A direção final

Um caderno de investigação matemática. A aparência é orientada pelas figuras e pelo conteúdo da pesquisa: linhas de composição, legendas numeradas, diagramas calculados e uma hierarquia editorial. EB Garamond foi escolhida para os títulos pela ligação com a tradição de composição de textos matemáticos; Manrope organiza as operações da ferramenta. Ambas são locais.

O fundo claro, os tons de tinta e o tabuleiro verde acinzentado formam a base. O rosa fica reservado à seleção, aos caminhos e à correspondência entre elementos. A versão escura usa as mesmas relações de contraste.

A skill instalada design-taste-frontend foi usada na apresentação e na revisão crítica. gpt-taste não estava instalada. Parâmetros finais: DESIGN_VARIANCE 7, MOTION_INTENSITY 5, VISUAL_DENSITY 5; os controles especializados mantêm maior densidade.

## Comparação editorial

Notas subjetivas da inspeção; não são métricas de desempenho ou uma avaliação com usuários. A preferência visual final pertence ao usuário.

| Critério            | Original | Revisão final |
| ------------------- | -------: | ------------: |
| Identidade visual   |        5 |             8 |
| Originalidade       |        3 |             7 |
| Composição e layout |        4 |             8 |
| Tipografia          |        5 |             8 |
| Cores e contraste   |        5 |             8 |
| Animações           |        2 |             8 |
| Microinterações     |        3 |             7 |
| Consistência visual |        6 |             8 |
| Navegação           |        4 |             8 |
| Acabamento          |        4 |             8 |

O principal ganho está na relação entre conteúdo e forma: a abertura apresenta o problema real e permite explorar seu grafo; o exemplo é uma figura do próprio motor matemático; as páginas de trabalho compartilham índice, legendas e controles. A solução possui dois desenhos sincronizados e uma sequência de movimentos legível abaixo.

## Implementação e movimento

- Todas as sete páginas revisadas, preservando as rotas e o estado `graphos.projeto`.
- Abertura reconstruída; entradas para os dois modos, exemplo e texto da pesquisa preservados.
- Ilustração CGI, cartões decorativos, brilhos, sombras e blocos de métricas em cartões retirados.
- Navegação horizontal por etapas no desktop e menu com nomes completos no celular.
- Zoom transferido para fora das figuras para não encobrir casas e peças.
- Transição funcional entre tabuleiro e grafo circular com as mesmas 12 casas e 14 conexões.
- GSAP coordena a entrada inicial, a reorganização de vértices e arestas e o player. Não há animações decorativas de rolagem.
- Player persistente com linha do tempo, três velocidades, teclado, pausa, reinício e movimentos individuais.
- Um relógio move a peça no tabuleiro e o marcador no grafo; o último movimento encerra a reprodução e conserva o estado final.
- No celular, as duas figuras podem ser alternadas sem mudar o índice da sequência.
- `prefers-reduced-motion` interrompe os deslocamentos animados e mantém as operações disponíveis.

A orquestração usa [GSAP](https://gsap.com/docs/v3/); as condições de movimento seguem [matchMedia](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/>). ScrollTrigger e a fonte anterior foram removidos por não serem necessários à direção final.

## Validação

- Oito testes automatizados passaram: movimentos, adjacência, topologia, propriedades, caminhos mínimos, layouts, busca de uma troca mínima de 16 movimentos, casos impossíveis, limites e invalidação do estado.
- Sintaxe, referências locais dos HTML e IDs verificados.
- Sete rotas conferidas em 1440 × 900, 768 × 1024 e 390 × 844. Nenhum transbordamento horizontal de documento ou componente principal nesses 21 cenários.
- Temas claro e escuro inspecionados no navegador Chromium integrado.
- Edição de casas e restauração por teclado, entrada textual, dimensões inválidas, adjacência de A1 e caminho mínimo A1 → B3 → C1 → D3 exercitados.
- Grade, círculo, forças e opções de visibilidade conferidos.
- Exportações SVG, PNG, CSV, JSON e TXT realizadas pelo navegador.
- Nova entrada da home carrega o exemplo. Zoom e ajuste à tela verificados após a reorganização dos controles.
- A troca completou 16/16, com reprodução parada, posições finais corretas e nenhum marcador temporário restante.
- O modo de caminho mínimo também concluiu 3/3, com o cavalo em D3, reprodução parada e nenhum marcador temporário restante.
- Menu móvel, Escape, troca de figuras e linha do tempo pelo teclado verificados.
- QA executado na porta 4174 para preservar a investigação do usuário na porta 4173.

## Limites

Não houve teste em dispositivos físicos, Safari ou Firefox, nem emulação da preferência de redução de movimento do sistema. O código dessa preferência foi revisado. A ferramenta de navegador disponível não expõe Lighthouse: não há medição formal de Core Web Vitals. Grafos densos continuam dependendo de zoom e sujeitos ao custo dos algoritmos originais.

## Recuperação e evidências

O original está em `afa11a1` e `codex/before-visual-transformation`. A primeira direção está em `b262b9c` e `codex/graphos-first-direction`. A implementação atual está na branch `codex/graphos-visual-transformation`.

Capturas antes/depois ficam na pasta `Graphos_Site-review`, ao lado do checkout. As imagens da revisão final têm o prefixo `editorial-`.
