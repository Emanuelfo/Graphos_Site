# Transformação visual do Graphos

Data: 8 de outubro de 2026.

## Diagnóstico e direção

Redesign profundo de um laboratório educativo. A leitura do projeto é de uma ferramenta para estudantes e pesquisadores, com linguagem gráfica precisa, tátil e exploratória. Direção: atelier matemático, usando os próprios grafos como linguagem visual.

Parâmetros criativos: DESIGN_VARIANCE 8, MOTION_INTENSITY 7, VISUAL_DENSITY 4 na apresentação; densidade maior nos controles matemáticos. CSS próprio sobre a arquitetura existente. A skill design-taste-frontend foi aplicada à apresentação, tipografia, temas e movimento; o produto preserva suas tabelas, métricas e fluxos especializados. gpt-taste não estava instalada.

A auditoria inicial incluiu leitura de todos os HTML, CSS e scripts e inspeção renderizada das sete páginas, incluindo a solução do exemplo. Encontrados:

- Home quase limitada à marca, sem demonstrar o funcionamento da ferramenta.
- Navegação para `#modos` sem seção correspondente e listener para `#hero-example` inexistente.
- Textos das etapas ocultos em celulares, prejudicando a navegação.
- Canvas desproporcional, métricas apertadas e painéis com rolagem interna.
- Predomínio de um único plano visual, com poucos níveis de destaque.
- Movimento quase restrito à introdução da marca; peças eram redesenhadas diretamente nas posições finais.
- Na solução, reconstrução dos controles a cada passo fazia o foco de teclado se perder.

## Comparação crítica

Notas editoriais subjetivas, baseadas na inspeção visual; não são métricas de desempenho ou resultados de um teste com usuários.

| Critério            | Antes | Depois |
| ------------------- | ----: | -----: |
| Identidade visual   |     5 |      8 |
| Originalidade       |     3 |      7 |
| Composição e layout |     4 |      8 |
| Tipografia          |     5 |      8 |
| Cores e contraste   |     5 |      8 |
| Animações           |     2 |      8 |
| Microinterações     |     3 |      8 |
| Consistência visual |     6 |      8 |
| Navegação           |     4 |      8 |
| Acabamento          |     4 |      8 |

O ganho principal é funcional e visual: a ferramenta passa a apresentar um processo de investigação, com uma bancada reconhecível, controles separados dos desenhos e uma reprodução que explica o deslocamento. A identidade continua ligada ao rosa e ao cavalo, mas agora usa Space Grotesk e Manrope locais, superfícies frias e versões claras e escuras coerentes.

A revisão após o primeiro resultado aprofundou a estrutura: navegação lateral no desktop, superfícies de desenho com iluminação discreta e a Solução em uma área ampla, com transporte junto dos desenhos e dados detalhados abaixo. No celular, tabuleiro e grafo podem ser alternados, mantendo o mesmo movimento e o acesso a ambos.

## Movimento

- Introdução coordenada com máscaras tipográficas, sequência de entrada e demonstração funcional.
- Transformação de tabuleiro em grafo circular com preservação de vértices e arestas.
- Revelações de conteúdo e parallax contido na ilustração editorial.
- Transições entre grade, círculo e forças, com continuidade espacial.
- Player persistente: linha do tempo, controle por teclado, três velocidades, reprodução, pausa, reinício e passos individuais.
- Uma única progressão temporal move o cavalo no tabuleiro e seu marcador no grafo. O estado final é mantido, sem repetição automática.
- Transições entre páginas como melhoria progressiva nos navegadores compatíveis.
- `prefers-reduced-motion` desativa entradas, transformações, parallax e deslocamentos animados. As operações continuam disponíveis sem animação.

GSAP foi escolhido para a coordenação das timelines; a configuração responsiva segue a [documentação oficial de matchMedia](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/>). [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) é usado apenas para apresentação e não altera a rolagem do laboratório.

## Validação

- Oito testes automatizados passaram: adjacência simétrica, movimentos em L, propriedades do grafo, caminho mínimo, layouts, solução válida mínima de 16 movimentos, limites do solucionador e invalidação/persistência.
- Sintaxe de todos os scripts, referências locais dos HTML e IDs verificados.
- Sete rotas verificadas em 1440 × 900, 768 × 1024 e 390 × 844. Nenhum transbordamento horizontal de documento ou cabeçalho nesses 21 cenários.
- Temas claro e escuro inspecionados em navegador.
- Edição de casas, restauração por teclado, configuração textual e erro de dimensão inválida exercitados.
- Regras e adjacências conferidas em A1; caminho A1 → B3 → C1 → D3 confirmado com distância 3.
- Grade, círculo, forças, visibilidade de arestas e cruzamentos verificados.
- Downloads SVG, PNG, CSV, JSON e TXT concluídos pelo navegador.
- O player novo completou a troca: 16/16, reprodução parada, quatro peças nas posições corretas e nenhum marcador temporário restante.
- Navegação de menu móvel, Escape e linha do tempo por teclado verificados.
- A cópia de QA usa a porta 4174 para não interferir nos dados da investigação aberta na porta 4173.

## Limitações da verificação

A inspeção foi feita no navegador integrado Chromium. Não houve teste em dispositivos físicos, Safari ou Firefox. Não há resultado de Lighthouse ou medição formal de Core Web Vitals: a interface de navegador disponível não expõe essa auditoria. A redução de movimento foi revisada no código; não houve emulação da preferência do sistema operacional. Grafos muito densos ainda dependem do zoom para leitura e continuam sujeitos ao custo dos algoritmos originais.

## Arte editorial

`assets/guarini-study.png` foi criada com a ferramenta integrada imagegen. É uma ilustração conceitual, enquanto todos os desenhos interativos são calculados pelo motor original.

Prompt utilizado: “Editorial research image for Graphos, a Portuguese educational graph theory laboratory about Guarini's knight swapping puzzle. Sophisticated photorealistic CGI still life, square composition. Four sculptural chess knights, two satin ivory ceramic and two deep graphite ceramic, standing at opposite ends of a small 3-column by 4-row chessboard. Matte blush pink and muted dusty rose alternating tiles, thin slab on a very pale pink studio tabletop. Three-quarter overhead product photograph, long soft shadows, tactile materials, clean background, generous breathing room. Monochrome pink, ivory and charcoal only. No text, lettering, UI, arrows, floating elements or watermark. Conceptual artwork, not an instructional diagram.”

Capturas antes/depois estão na pasta `Graphos_Site-review`, ao lado do checkout, para manter os arquivos de QA fora dos recursos publicados.
