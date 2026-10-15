# Graphos: revisão gráfica e cinética

8 de outubro de 2026.

## Diagnóstico da versão anterior

As sete páginas foram renderizadas antes das alterações. A direção editorial anterior era legível, mas repetia títulos serifados, figuras em caixas e painéis com a mesma proporção. A home mantinha uma sucessão previsível de seções. A animação concentrava-se na entrada e na troca de representação; a rolagem pouco explicava a investigação. Os grandes números de capítulo ocupavam espaço sem ajudar a trabalhar.

O propósito real é um laboratório de investigação matemática ligado a Math en Jeans. Portanto, a identidade precisa nascer dos cavalos, casas, relações e caminhos calculados, sem imagens de tecnologia fictícia ou linguagem de um produto comercial.

## Direção implementada

Uma composição gráfica e cinética. Manrope em pesos fortes, tinta e branco, coral para ações e caminhos. A geometria do próprio problema cria as imagens: um tabuleiro em perspectiva, os mesmos vértices em círculo e um caminho mínimo reorganizado espacialmente. Não são redes aleatórias.

A apresentação utiliza composições distintas: abertura monumental, figura persistente com narrativa de rolagem, dois estudos assimétricos, exemplo interativo, índice de seis perspectivas, texto da pesquisa e assinatura tipográfica. As ferramentas mantêm uma organização operacional consistente, com títulos compactos e navegação em uma linha no desktop.

A skill instalada `design-taste-frontend` orientou a auditoria e a revisão. `gpt-taste` não estava instalada. Dials: DESIGN_VARIANCE 8, MOTION_INTENSITY 8, VISUAL_DENSITY 4 na apresentação e 8 nas ferramentas. A matemática fornece a identidade; a densidade das ferramentas justifica tabelas e controles.

## Comparação crítica

Notas subjetivas da inspeção, sem pesquisa com usuários ou pretensão de avaliar o preço do trabalho. A coluna anterior corresponde ao commit `effd525`.

| Critério            | Anterior | Atual |
| ------------------- | -------: | ----: |
| Identidade visual   |        6 |   8,5 |
| Originalidade       |        5 |     8 |
| Composição e layout |        6 |   8,5 |
| Tipografia          |        7 |   8,5 |
| Cores e contraste   |        7 |   8,5 |
| Animações           |        4 |   8,5 |
| Microinterações     |        5 |     8 |
| Consistência visual |        8 |   8,5 |
| Navegação           |        8 |   8,5 |
| Acabamento          |        6 |   8,5 |

O ganho principal é a relação entre movimento e conteúdo: a transformação explica que mudar o desenho não muda as relações. A experiência tem maior ritmo e personalidade. As páginas de trabalho continuam mais sóbrias para permitir edição e análise; grafos grandes permanecem sujeitos à densidade inerente ao problema e exigem zoom.

## Transformações e movimento

- Home reconstruída, mantendo os dois modos, o exemplo original e o conteúdo da pesquisa.
- Tabuleiro SVG em perspectiva, profundidade, quatro cavalos e coordenadas; as peças usam o símbolo original.
- Transformação tabuleiro ↔ grafo com um relógio GSAP e 12 vértices/14 arestas do motor matemático existente.
- Seleção por toque e teclado destaca os saltos possíveis; A1 se liga a B3 e C2.
- ScrollTrigger coordena estrutura, conexões e caminho A1 → B3 → C1 → D3. A figura acompanha a leitura com CSS sticky e rolagem normal.
- Entrada tipográfica com máscaras, sequência de revelações e encerramento com letras coreografadas no rodapé.
- Controles e links respondem ao hover, foco, pressão e seleção sem movimentos contínuos decorativos.
- Seis ferramentas com navegação compacta, novo sistema de cor e títulos, dados monoespaçados e figuras com controles externos.
- Player preservado: movimento sincronizado no tabuleiro e grafo, velocidade, linha do tempo, pausa, reinício e troca de visualização no celular. O término apresenta estado estável e uma linha de conclusão, sem reposicionar a página.
- Contornos dos cavalos ajustados para manter leitura nas figuras menores e no tema escuro.
- Fontes e bibliotecas locais. ScrollTrigger usa o GSAP já instalado; nenhuma nova biblioteca de interface foi adicionada. A fonte serifada sem uso foi retirada.

`prefers-reduced-motion` é o padrão. O novo controle no cabeçalho permite uma escolha explícita, persistida em `graphos.motion`, independente dos dados `graphos.projeto`. A redução remove timelines e revela o caminho completo, com capítulos compactos e ações disponíveis. A preferência do sistema continua sendo acompanhada enquanto não há escolha explícita no site.

## Validação desta revisão

- `npm run check`: scripts válidos, referências locais presentes, sem IDs HTML duplicados.
- `npm test`: oito testes passaram. Abrangem topologia, movimentos legais, BFS, propriedades, disposições, troca mínima de 16 movimentos, limites, posições impossíveis e invalidação do estado.
- Sete rotas em 1440 × 900, 768 × 1024 e 390 × 844: 21 cenários sem transbordamento horizontal do documento ou componentes principais.
- Narrativa animada inspecionada durante a rolagem em desktop e celular. Versão reduzida também renderizada e exercitada pelo controle do site.
- Temas claro e escuro inspecionados. Contraste calculado nos pares essenciais: CTA claro 5,49:1; texto secundário claro 5,19:1; coordenadas claras 5,48:1; CTA escuro 7,75:1; texto secundário escuro 7,45:1; coordenadas escuras 5,79:1. Não é uma auditoria automatizada completa de acessibilidade.
- Edição de A2 por Enter: 12 → 11 → 12 casas; dimensão zero rejeitada com feedback; adjacência de A1 confirmada como B3/C2.
- Círculo e forças exercitados; 12 nós e 14 arestas preservados. Exportações SVG e PNG realizadas pelo navegador.
- Movimento do player observado em curso nas duas figuras. O último movimento terminou em 16/16: reprodução parada, quatro peças nas posições trocadas e nenhum marcador temporário restante.
- Menu móvel e Escape, alternância entre tabuleiro/grafo e linha do tempo por teclado exercitados. Pesquisa expandida e links de seções conferidos.
- QA na porta 4174 para preservar a investigação do usuário na porta 4173.

As outras exportações e fluxos já haviam sido exercitados na revisão anterior; seus algoritmos e contratos foram mantidos. Não houve mudança no backend.

## Limites da validação

Navegador Chromium integrado, sem testes em aparelhos físicos, Safari ou Firefox. Não houve medição formal com Lighthouse/Core Web Vitals. A preferência reduzida do navegador e a escolha explícita de movimento completo foram testadas; não foi alterada a configuração do sistema operacional. O solucionador mantém seu limite original de 400 mil estados.

## Recuperação e evidências

- Original: `afa11a1`, branch `codex/before-visual-transformation`.
- Primeira direção: `b262b9c`, branch `codex/graphos-first-direction`.
- Direção editorial: `effd525`, branch `codex/before-kinetic-revamp`, criada antes desta revisão.
- Implementação: `codex/graphos-visual-transformation`.

As capturas ficam em `Graphos_Site-review`, ao lado do checkout. As evidências desta revisão usam o prefixo `kinetic-`; as anteriores usam `editorial-`. Os arquivos do projeto permanecem no Explorador de Arquivos dentro de `Graphos_Site`.

## Adaptação da paleta: 9 de outubro de 2026

A pedido do usuário, somente as cores foram adaptadas à identidade de `Emanuelfo/Graphos_Site`, consultada em `origin/main:css/style.css`. O tema escuro recupera o fundo `#0D080F`, rosa `#E847AB`, lilás `#A794E0` e os tons de tabuleiro da referência. O tema claro deriva dessa mesma família: fundo `#F8F3F7`, rosa `#B1347E` para leitura e lilás `#6853AD`. Layout, tipografia, animações, algoritmos e dados da investigação permanecem os mesmos.

Superfícies, seleções, caminhos, peças e a cor do navegador seguem os tokens compartilhados. Textos sobre seleções claras usam um rosa mais escuro, sem depender da cor do botão.

Validação específica: home e solução inspecionadas nos dois temas, em 1440 × 900 e 390 × 844, sem transbordamento horizontal; transformação tabuleiro/grafo, passo do player, abas móveis e exportação SVG exercitados na porta 4174. Contrastes calculados: botão claro 5,55:1; botão escuro 5,48:1; texto secundário claro 5,31:1 e escuro 6,98:1; seleção clara 6,20:1 e escura 4,86:1; coordenadas do tabuleiro claras 7,43:1 e escuras 14,27:1. Esses pares não constituem uma auditoria completa de acessibilidade. As capturas desta adaptação usam o prefixo `palette-`.
