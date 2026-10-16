/* Script descartável: limpa regras órfãs do mapa antigo e do bloco v2 no fim de
   css/jornada.css, preservando o media query do rodapé daquele bloco.
   Uso: node qa/clean-jornada-css.mjs */
import { readFileSync, writeFileSync } from "node:fs";

const file = "css/jornada.css";
let css = readFileSync(file, "utf8");

const cut = (from, to, label) => {
  const a = css.indexOf(from);
  if (a < 0) throw new Error(`${label}: início não encontrado`);
  const b = to === null ? css.length : css.indexOf(to, a);
  if (b < 0) throw new Error(`${label}: fim não encontrado`);
  console.log(`${label}: ${b - a} caracteres removidos`);
  css = css.slice(0, a) + css.slice(b);
};

/* 1. Media query responsivo legado: fica só o que o rodapé (.j-links/.j-storage)
   ainda usa; .fase, .world-grid e .node antigos saem. */
cut(
  "  .world-grid {\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n    gap: 22px 6px;\n  }\n  .node {\n    grid-column: var(--col);\n    grid-row: var(--row);\n    min-height: 0;\n    align-items: center;\n    text-align: center;\n  }\n  .world-h h2 {\n    font-size: 23px;\n  }\n",
  "  .j-panel {\n    padding: 18px;\n  }\n}\n",
  "regras antigas do mapa no @media 760px",
);

/* 2. Regras mortas no fim do arquivo (v2): sobrescritas pelo bloco novo. */
cut(
  ".world-h {\n  margin-bottom: 34px;\n}",
  null,
  "regras v2 órfãs no fim do arquivo",
);

writeFileSync(file, css);
console.log("css/jornada.css limpo");
