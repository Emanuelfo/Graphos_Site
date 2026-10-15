# Reformulação: três áreas e trilha gamificada

## Acrescentado depois (diversificação didática)

Duas fases e uma atividade nova, sem mexer no que já funcionava:

- **1.5 · Cada peça, um grafo** (`pecas.html`, evidências `pecas:graus` e `pecas:caminho`): a mesma casa tem grafos diferentes conforme a peça. Exige 1.4 e passa a anteceder 2.1 — o percurso do mundo 1 ficou com cinco fases. As regras de torre, bispo, dama e rei entraram em `js/regras.js`; as que deslizam são bloqueadas por casa ausente e a que salta não é.
- **Mundo 5 · As Redes do Mundo** (`redes.html`, fases 5.1 a 5.3): aplicações reais — transporte, redes de computadores e redes sociais. Exige 4.3.

Efeito no progresso: um estudante com o progresso anterior (conceitos do Explorar) mantém 1.1–1.4 concluídas e encontra a 1.5 **disponível**, não concluída; 2.1 passa a depender dela. O motor continua descartando evidências de fases bloqueadas.

## Testes realizados (outubro de 2026)

Automatizados (`npm test`, `npm run check`): 50 testes passam (30 anteriores + 13 do motor de progressão + 5 das peças como grafos + 2 da fase 1.5). Verificação de sintaxe, links locais e IDs duplicados: sem problemas.

Verificações com o Chrome instalado (ver `README.md`): `qa/layout-check.mjs` (18 páginas × 6 larguras, sem transbordamento horizontal), `qa/flow-check.mjs` (19 verificações de fluxo real), `qa/pecas-check.mjs` (17 verificações da fase 1.5: painel, navegação entre etapas, evidências e desbloqueio de 2.1) e `qa/redes-check.mjs` (dados e gabaritos das aplicações, conferidos por enumeração).

No navegador (Chromium headless, 1440 × 900 e 390 × 844), fluxo real: home → trilha; fase bloqueada no mapa (painel informa o que falta e não oferece “Iniciar”); link direto para fase bloqueada (página de bloqueio); fase 1.1 concluída tocando canto e centro (XP, conquista, toast); recarregar mantém o progresso; repetir a atividade conta revisão e não dá XP; resposta errada em 1.2 dá feedback sem concluir, resposta certa conclui; conceito bloqueado na página mostra mensagem; modo livre não bloqueia nem registra; atividade seguinte bloqueada por link direto; mapa atualizado (XP 80, 2/14). Sem erros de console; sem rolagem horizontal em 5 páginas no celular.

## Não testado / limitações

- As fases 1.3 a 4.3 foram validadas pelo motor (testes automatizados) e pelo código das atividades, mas **não foram percorridas manualmente no navegador** (a troca, o 2.2, as hipóteses e a combinatória dependem de jogadas longas).
- Sem testes em Safari, Firefox ou aparelhos reais; sem auditoria de acessibilidade automatizada (há `aria-*`, foco visível e navegação por teclado nos nós do mapa, mas não houve teste com leitor de tela).
- Progresso só em `localStorage` (por navegador/dispositivo).
- Referências bibliográficas da Pesquisa e resultados gerais sobre tabuleiros irregulares aguardam o grupo; o mundo 4 usa o que existe (hipóteses e combinatória do Xadrez 960); não há combinatória avançada ainda.
- Fases dos mundos 3 e 4 reaproveitam “metas” antigas (ex.: 3.4 conta ao calcular a análise de um tabuleiro com casas removidas; 4.1 ao testar uma hipótese).
- Regras de peça implementadas: cavalo, torre, bispo, dama e rei. **Não há** peão, capturas, xeque ou roque; a atividade 1.5 compara movimentos, não partidas.
