import { defineConfig } from 'vite';

// In local dev, serve /api/leaderboard from the same handler Vercel runs in production.
// Without a Blob token it falls back to an in-memory board.
function localApi() {
  const handle = (server, load) => server.middlewares.use('/api/leaderboard', async (req, res) => {
    try {
      const mod = await load('/api/leaderboard.js');
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const url = 'http://localhost' + req.originalUrl;
      const init = { method: req.method, headers: req.headers };
      if (req.method !== 'GET' && req.method !== 'HEAD') init.body = Buffer.concat(chunks);
      const r = await mod.default.fetch(new Request(url, init));
      res.statusCode = r.status;
      r.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { res.statusCode = 500; res.end(String(e)); }
  });
  return {
    name: 'local-api',
    configureServer(server) { handle(server, (p) => server.ssrLoadModule(p)); },
  };
}

export default defineConfig({
  plugins: [localApi()],
  build: { chunkSizeWarningLimit: 1600 },
});
