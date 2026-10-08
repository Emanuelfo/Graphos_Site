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

`vendor` atualiza as cópias locais das dependências e os ícones selecionados. `check` verifica a sintaxe dos scripts, referências locais e IDs duplicados. Os testes verificam regras de movimento, topologia, caminhos mínimos, disposições, persistência e a solução do problema original.

## Organização

- `js/main.js`: estado persistido, navegação, temas, gestos e exportação.
- `js/estrutura.js`, `regras.js`, `grafo.js`, `geometria.js`, `analise.js`: ferramentas e algoritmos.
- `js/solucao.js`: busca exata; `js/player.js`: reprodução sincronizada e linha do tempo.
- `js/home.js`: demonstração interativa usando as mesmas regras do laboratório.
- `js/motion.js`: entrada tipográfica e continuidade entre representações geométricas.
- `css/style.css`: temas, figuras e controles do caderno; `css/responsive.css`: adaptações de layout.
- `assets/licenses`: créditos e condições das dependências.

O projeto continua usando `graphos.projeto` no localStorage. A preferência visual usa uma chave separada, `graphos.theme`. Todas as rotas originais foram mantidas.

O solucionador continua executando no navegador com limite de 400 mil estados. Configurações grandes podem atingir esse limite ou exigir mais processamento; esse comportamento já existia antes da transformação visual.

## Recuperação

Estado original: commit `afa11a1`, também preservado em `codex/before-visual-transformation`.
Primeira direção visual: commit `b262b9c`, preservado em `codex/graphos-first-direction`.
Implementação: branch `codex/graphos-visual-transformation`.

Consulte [a avaliação visual e a validação](docs/visual-review.md).
