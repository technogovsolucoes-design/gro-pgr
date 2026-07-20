/**
 * Servidor local que emula as Vercel Serverless Functions em api/*.js
 * para desenvolvimento com `vite dev` (que não roda a pasta api/).
 *
 * Uso: node scripts/dev-api.mjs
 * O vite.config.js faz proxy de /api para este servidor (ver server.proxy).
 */
import { createServer } from "node:http";
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const PORT    = 3001;
const API_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "api");

function withHelpers(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
    return res;
  };
  return res;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const server = createServer(async (req, res) => {
  withHelpers(res);
  const name = req.url.split("?")[0].replace(/^\/api\//, "").replace(/\/$/, "");
  const file = path.join(API_DIR, `${name}.js`);

  try {
    req.body = await readBody(req);
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`); // cache-bust for edits
    await mod.default(req, res);
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      res.status(404).json({ erro: `Rota não encontrada: /api/${name}` });
    } else {
      console.error(`[dev-api] /api/${name}`, err);
      res.status(500).json({ erro: "Erro interno no servidor de dev.", detalhe: err.message });
    }
  }
});

server.listen(PORT, async () => {
  const files = (await readdir(API_DIR)).filter((f) => f.endsWith(".js"));
  console.log(`[dev-api] rodando em http://localhost:${PORT}`);
  console.log(`[dev-api] rotas: ${files.map((f) => `/api/${f.replace(/\.js$/, "")}`).join(", ")}`);
});
