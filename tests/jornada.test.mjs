import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
vm.runInContext(await readFile("js/jornada.js", "utf8"), ctx);
const J = ctx.GraphosJornada;
const make = (mem = {}, free = false) => {
  const events = [];
  const e = J.create({
    free,
    read: (k) => mem[k] ?? null,
    write: (k, v) => { if (v === null) delete mem[k]; else mem[k] = v; return true; },
    emit: (d) => events.push(...d.events),
  });
  return { e, mem, events };
};
const feed = (e, ids) => ids.forEach((i) => e.evidence(i));
/* Cada mundo exige TODAS as evidências das suas fases. Manter estas listas em um só
   lugar evita que acrescentar uma fase quebre vários testes ao mesmo tempo; e o teste
   "as listas de evidências cobrem o currículo" garante que elas acompanhem PHASES. */
const VILA = ["explorar:0", "explorar:1", "explorar:2", "explorar:3", "pecas:graus", "pecas:caminho"];
const LABIRINTO = ["explorar:4", "caminhos:min2", "meta:sem-caminho"];
const REINO = ["meta:troca", "meta:troca-minimo", "meta:analise", "meta:irregular"];
const POSSIBILIDADES = ["meta:hipotese", "meta:acerto", "meta:contagem"];
const REDES = ["redes:transporte", "redes:computadores", "redes:sociais"];
const TUDO = [...VILA, ...LABIRINTO, ...REINO, ...POSSIBILIDADES, ...REDES];

test("as listas de evidências cobrem o currículo inteiro", () => {
  /* Se uma fase nova entrar em PHASES, o acumulado precisa completá-la; senão os
     testes abaixo estariam medindo um percurso incompleto sem avisar. */
  const { e } = make();
  feed(e, TUDO);
  assert.equal(e.doneCount(), J.PHASES.length, "TUDO conclui todas as fases");
  assert.equal(e.xp(), J.XP_MAX, "TUDO alcança o XP máximo");
  const faltando = J.PHASES.filter((p) => p.needs.some((n) => !TUDO.includes(n))).map((p) => p.id);
  assert.equal(faltando.length, 0, `fases sem evidência nas listas: ${faltando.join(", ")}`);
});

test("registry: ids unicos, requisitos existentes, sem ciclos, XP maximo coerente", () => {
  const ids = new Set(J.PHASES.map((p) => p.id));
  assert.equal(ids.size, J.PHASES.length);
  const seen = new Set();
  for (const p of J.PHASES) {
    p.requires.forEach((r) => assert.ok(seen.has(r), `${p.id} requer ${r} antes dela`));
    seen.add(p.id);
    assert.ok(p.needs.length && p.xp > 0);
    assert.ok(J.WORLDS.some((w) => w.id === p.world));
  }
  const total = J.PHASES.reduce((s, p) => s + p.xp, 0) + J.WORLD_BONUS * J.WORLDS.length;
  assert.equal(J.XP_MAX, total);
});

test("inicio: so a fase 1.1 esta liberada e e a recomendada", () => {
  const { e } = make();
  assert.equal(e.next().id, "1.1");
  assert.equal(J.PHASES.filter((p) => e.status(p.id) === "available").map((p) => p.id).join(), "1.1");
  assert.equal(e.xp(), 0);
});

test("evidencia de fase bloqueada e descartada (bloqueio e logica, nao visual)", () => {
  const { e } = make();
  assert.equal(e.evidence("meta:troca").length, 0);
  feed(e, VILA);
  feed(e, ["explorar:4", "caminhos:min2", "meta:troca"]);
  assert.ok(e.isDone("3.1"));
  /* 3.3 estava bloqueada quando 'analise' chegou antes da hora: nao pode ter sido guardada */
  const { e: f } = make();
  feed(f, [...VILA, "explorar:4", "caminhos:min2", "meta:troca"]);
  f.evidence("meta:analise");
  assert.equal(f.status("3.3"), "locked");
  feed(f, ["meta:troca-minimo"]);
  assert.equal(f.status("3.3"), "available");
  assert.equal(f.isDone("3.3"), false, "evidencia antecipada nao conta");
});

test("conclusao concede XP uma vez; bonus de mundo uma vez", () => {
  const { e, events } = make();
  feed(e, VILA);
  /* O XP do mundo é a soma das fases que ele conclui, mais o bônus de mundo. */
  const porId = (id) => J.PHASES.find((p) => p.id === id);
  const doMundo = J.WORLDS[0].fases.reduce((s, id) => s + porId(id).xp, 0);
  assert.equal(e.xp(), doMundo + J.WORLD_BONUS);
  assert.ok(e.worldDone("vila"));
  assert.equal(events.filter((x) => x.type === "mundo").length, 1);
});

test("revisao nao gera XP, nem eventos de conclusao, mas conta revisoes", () => {
  const { e, events } = make();
  feed(e, VILA);
  const xp = e.xp(),
    n = events.filter((x) => x.type === "fase").length;
  feed(e, VILA);
  feed(e, VILA);
  assert.equal(e.xp(), xp);
  assert.equal(events.filter((x) => x.type === "fase").length, n);
  assert.equal(e.reviews("1.1"), 2);
});

test("fase com criterio multiplo exige todas as evidencias", () => {
  const multi = J.PHASES.filter((p) => p.needs.length > 1);
  assert.ok(Array.isArray(multi)); // hoje todas tem 1; o motor trata N (testado abaixo)
  const { e } = make();
  const p = J.PHASES[0];
  const orig = p.needs;
  p.needs = ["explorar:0", "explorar:9"];
  e.evidence("explorar:0");
  assert.equal(e.isDone("1.1"), false);
  e.evidence("explorar:9");
  assert.equal(e.isDone("1.1"), true);
  p.needs = orig;
});

test("jornada completa libera conquistas automaticamente", () => {
  const { e } = make();
  feed(e, TUDO);
  assert.equal(e.doneCount(), J.PHASES.length);
  assert.equal(e.xp(), J.XP_MAX);
  assert.equal(e.achievements().filter((a) => a.got).length, J.ACHIEVEMENTS.length);
  assert.equal(e.next(), null);
});

test("fase 1.5 (peças como grafos) exige as duas evidências e destrava 2.1", () => {
  const { e } = make();
  const primeiroMundo = ["explorar:0", "explorar:1", "explorar:2", "explorar:3"];
  feed(e, primeiroMundo);
  assert.equal(e.isDone("1.4"), true);
  assert.equal(e.status("1.5"), "available");
  assert.equal(e.status("2.1"), "locked", "2.1 agora depende de 1.5");
  /* Critério múltiplo: uma evidência só não conclui. */
  e.evidence("pecas:graus");
  assert.equal(e.isDone("1.5"), false);
  assert.equal(e.have("1.5").length, 1);
  e.evidence("pecas:caminho");
  assert.equal(e.isDone("1.5"), true);
  assert.equal(e.status("2.1"), "available");
  /* Evidência antecipada de 2.1 continua sendo descartada. */
  const { e: f } = make();
  feed(f, [...primeiroMundo, "pecas:graus"]);
  f.evidence("explorar:4");
  assert.equal(f.status("2.1"), "locked");
  assert.equal(f.isDone("2.1"), false);
});

test("mundo 5 (aplicações) exige o mundo 4 concluído e concede XP uma vez", () => {
  const { e } = make();
  /* A evidência das redes não adianta enquanto as fases anteriores não fecharam. */
  e.evidence("redes:transporte");
  assert.equal(e.status("5.1"), "locked");
  assert.equal(e.isDone("5.1"), false);
  feed(e, [...VILA, ...LABIRINTO, ...REINO, ...POSSIBILIDADES]);
  assert.equal(e.status("4.3"), "done");
  assert.equal(e.status("5.1"), "available");
  e.evidence("redes:transporte");
  assert.equal(e.isDone("5.1"), true);
  const xp = e.xp();
  e.evidence("redes:transporte");
  assert.equal(e.xp(), xp, "revisão não concede XP");
  assert.equal(e.status("5.2"), "available");
  assert.equal(e.status("5.3"), "locked", "5.3 exige 5.2");
});

test("persistencia: recarregar preserva fases, XP e conquistas sem duplicar recompensas", () => {
  const a = make();
  feed(a.e, VILA);
  const b = make(a.mem);
  assert.equal(b.e.xp(), a.e.xp());
  assert.ok(b.e.isDone("1.4"));
  assert.ok(b.e.achievements().find((x) => x.id === "primeiro-passo").got);
  feed(b.e, VILA);
  assert.equal(b.e.xp(), a.e.xp());
  assert.equal(b.events.filter((x) => x.type === "fase").length, 0);
});

test("dados invalidos ou adulterados sao tratados com seguranca", () => {
  for (const bad of ["{", "null", "[]", '{"v":99}', '{"v":1,"done":{"4.3":{"at":1}}}', '{"v":1,"done":"x","prog":5,"bonus":[]}']) {
    const { e } = make({ "graphos.jornada": bad });
    assert.equal(e.doneCount(), 0, bad);
    assert.equal(e.next().id, "1.1");
  }
  /* XP salvo e ignorado: sempre recalculado */
  const { e } = make({ "graphos.jornada": JSON.stringify({ v: 1, xp: 99999, done: { "1.1": { at: 1 } } }) });
  assert.equal(e.xp(), 40);
  /* fase concluida sem pre-requisito e descartada */
  const { e: f } = make({ "graphos.jornada": JSON.stringify({ v: 1, done: { "1.1": { at: 1 }, "1.3": { at: 1 } } }) });
  assert.equal(f.isDone("1.3"), false);
});

test("modo livre nao registra nada", () => {
  const { e, mem } = make({}, true);
  feed(e, VILA);
  assert.equal(e.doneCount(), 0);
  assert.equal(mem["graphos.jornada"], undefined);
});

test("migracao do progresso anterior reconhece apenas evidencias equivalentes, sem anuncios", () => {
  const legacy = { "graphos.trilha": JSON.stringify({ explorar: { done: [true, true, true, true, true] }, metas: { minimo: true } }) };
  const { e, events } = make(legacy);
  /* O progresso antigo reconhece os cinco conceitos do Explorar: fases 1.1 a 1.4. */
  assert.ok(e.isDone("1.4"));
  assert.equal(e.isLegacy("1.1"), true);
  /* A fase 1.5 é nova e depende de dois conceitos das peças, que o progresso antigo
     não registrava. Ela fica disponível — não "ganha" de graça. */
  assert.equal(e.isDone("1.5"), false);
  assert.equal(e.status("1.5"), "available");
  assert.equal(e.isDone("2.1"), false, "2.1 depende de 1.5, que é nova");
  assert.equal(e.isDone("2.2"), false, "'minimo' antigo nao equivale a 'caminhos:min2'");
  assert.ok(events.every((x) => x.silent !== false));
});

test("reset apaga o progresso", () => {
  const { e, mem } = make();
  feed(e, VILA);
  e.reset();
  assert.equal(e.doneCount(), 0);
  assert.equal(mem["graphos.jornada"], undefined);
});

test("armazenamento indisponivel: o motor continua funcionando em memoria", () => {
  const e = J.create({ read: () => { throw new Error("x"); }, write: () => { throw new Error("x"); }, emit() {} });
  feed(e, VILA);
  assert.equal(e.doneCount(), J.WORLDS[0].fases.length);
  assert.equal(e.persistent, false);
});
