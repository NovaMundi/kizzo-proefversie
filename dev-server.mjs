// Lokale dev-server: serveert de app EN het /api/chat-brein op één poort,
// zodat je Kizzo op je eigen machine kunt testen zonder Vercel.
// Nodig: ANTHROPIC_API_KEY in je omgeving (of in proefversie/.env).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lees proefversie/.env als die bestaat (simpel, geen extra pakket).
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// Import NA het laden van .env, zodat de Anthropic-client de sleutel ziet.
const { chat } = await import("./api/chat.js");

const PORT = process.env.PORT || 3461;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      try {
        const body = raw ? JSON.parse(raw) : {};
        const text = await chat(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ text }));
      } catch (e) {
        console.error("chat fout:", e && e.message ? e.message : e);
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "serverfout: " + (e && e.message ? e.message : "onbekend") }));
      }
    });
    return;
  }

  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = normalize(join(__dirname, p));
  if (!file.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  readFile(file)
    .then((data) => {
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(data);
    })
    .catch(() => {
      res.writeHead(404);
      res.end("Niet gevonden");
    });
});

server.listen(PORT, () => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  console.log("Kizzo dev-server: http://localhost:" + PORT);
  if (!hasKey) console.log("LET OP: geen ANTHROPIC_API_KEY gevonden. Zet die in proefversie/.env of in je omgeving.");
});
