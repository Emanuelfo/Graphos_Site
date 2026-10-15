import { readdir, readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
let problems = 0;
for (const file of await readdir("js")) {
  if (!file.endsWith(".js")) continue;
  const result = spawnSync(process.execPath, ["--check", `js/${file}`], {
    encoding: "utf8",
  });
  if (result.status) {
    console.error(result.stderr);
    problems++;
  }
}
for (const file of (await readdir(".")).filter((f) => f.endsWith(".html"))) {
  const html = await readFile(file, "utf8");
  for (const [, href] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|#)/.test(href)) continue;
    try {
      await access(href.split(/[?#]/)[0]);
    } catch {
      console.error(`${file}: missing ${href}`);
      problems++;
    }
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) {
    console.error(`${file}: duplicate IDs`);
    problems++;
  }
}
if (problems) process.exitCode = 1;
else
  console.log(
    "All scripts parse; all local HTML references exist; no duplicate HTML IDs.",
  );
