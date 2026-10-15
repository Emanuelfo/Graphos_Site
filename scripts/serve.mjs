import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("."),
  port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
};
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (
      !file.startsWith(root + sep) ||
      path.split("/").some((p) => p.startsWith(".") || p === "node_modules")
    ) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    if (!(await stat(file)).isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Graphos: http://127.0.0.1:${port}`),
);
