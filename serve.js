// Tiny static file server. Run with `npm run serve`.
// Required because ES module imports don't work over file:// — Chrome enforces same-origin.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const port = Number(process.env.PORT || 8080);
const root = process.cwd();
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".json": "application/json",
};

http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const full = path.normalize(path.join(root, p));
  if (!full.startsWith(root)) { res.statusCode = 403; return res.end("forbidden"); }
  try {
    const data = await fs.readFile(full);
    res.setHeader("Content-Type", TYPES[path.extname(full).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
}).listen(port, () => console.log(`ARP8 → http://localhost:${port}`));
