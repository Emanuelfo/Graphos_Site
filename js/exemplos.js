/* Graphos — exemplos prontos. Para adicionar um exemplo, inclua um item em Graphos.examples. */
(function (G) {
  G.examples = [
    {
      id: 'cavalos-3x4',
      titulo: 'Problema dos Cavalos — Tabuleiro 3×4',
      descricao: 'Dois cavalos brancos e dois pretos trocam de lugar em um tabuleiro de 4 linhas e 3 colunas. Investigação do trabalho Math en Jeans.',
      /* Devolve um projeto completo: estrutura, regra, peças, origem/destino. */
      build() {
        const p = G.newProject('cavalos');
        p.structure = { rows: 4, cols: 3, active: G.allCells(4, 3) };
        p.pieces = { W: ['A1', 'A3'], B: ['D1', 'D3'] };
        p.origin = 'A1'; p.dest = 'D3';
        p.exampleId = 'cavalos-3x4';
        return p;
      },
    },
  ];

  G.loadExample = (id) => {
    const ex = G.examples.find((e) => e.id === id);
    if (!ex) return;
    G.project = ex.build();
    G.save();
    location.href = 'estrutura.html';
  };
})(window.Graphos);
