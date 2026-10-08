/* Graphos — página inicial: lista de exemplos. */
(function (G) {
  function examples() {
    G.$('#ex-list').innerHTML = G.examples.map((e) => `<article class="ex"><div><h3>${e.titulo}</h3><p>${e.descricao}</p></div><button type="button" class="p" data-ex="${e.id}">Carregar</button></article>`).join('');
    G.$('#ex-list').addEventListener('click', (ev) => { const b = ev.target.closest('[data-ex]'); if (b) G.loadExample(b.dataset.ex); });
  }

  if (document.body.dataset.page === 'home') { examples(); G.$('#hero-example').addEventListener('click', () => G.loadExample(G.examples[0].id)); }
})(window.Graphos);
