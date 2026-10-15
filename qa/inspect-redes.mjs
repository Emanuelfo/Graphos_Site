/* Inspeção rápida dos dados de rede (uso interno de QA). */
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
ctx.window = ctx;
const vazio = { forEach() {}, length: 0 };
ctx.document = { body: { dataset: {} }, querySelector: () => null, querySelectorAll: () => vazio, addEventListener() {}, getElementById: () => null };
ctx.Graphos = {
  $: () => null, icon: () => "", icons: () => {},
  cellId: (r, c) => String.fromCharCode(65 + r) + (c + 1),
  allCells: (rows, cols) => { const o = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) o.push(String.fromCharCode(65 + r) + (c + 1)); return o; },
  elements: (s) => { const a = new Set(s.active), o = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) { const id = String.fromCharCode(65 + r) + (c + 1); if (a.has(id)) o.push({ id, r, c }); } return o; },
  newProject: () => ({ structure: { rows: 4, cols: 3, active: [] } }),
  project: { structure: { rows: 4, cols: 3, active: [] } },
  save() {}, reset() {},
  jogo: { rc: (id) => [id.charCodeAt(0) - 65, parseInt(id.slice(1), 10) - 1] },
  viewport: () => ({ fit() {} }),
};
await vm.runInContext(await readFile("js/redes.js", "utf8"), ctx);
const REDES = ctx.Graphos.redesData;
for (const r of REDES) {
  console.log(`\n=== ${r.id} (grade ${r.grade.join("x")}) ===`);
  const keys = Object.keys(r.nos);
  console.log(`${keys.length} nós declarados:`);
  console.log(keys.map((k) => `${k}=${r.nos[k]}`).join("  "));
  const [rows, cols] = r.grade;
  const set = new Set(keys);
  const E = [];
  for (let rr = 0; rr < rows; rr++)
    for (let cc = 0; cc < cols; cc++) {
      if (!set.has(`${rr},${cc}`)) continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) if (set.has(`${rr + dr},${cc + dc}`)) E.push([`${rr},${cc}`, `${rr + dr},${cc + dc}`]);
    }
  console.log(`arestas calculadas: ${E.length}`);
  console.log(E.map(([a, b]) => `${r.nos[a]}–${r.nos[b]}`).join("  "));
  if (r.arestas) {
    console.log(`arestas declaradas com peso: ${r.arestas.length}`);
    for (const [x, y, w] of r.arestas) {
      const ka = keys.find((k) => r.nos[k] === x), kb = keys.find((k) => r.nos[k] === y);
      const viz = ka && kb && (Math.abs(+ka.split(",")[0] - +kb.split(",")[0]) + Math.abs(+ka.split(",")[1] - +kb.split(",")[1]) === 1);
      console.log(`  ${x}–${y} (peso ${w})  ${viz ? "vizinhos" : "NÃO VIZINHOS"}`);
    }
  }
}
