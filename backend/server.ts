import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { app } from './app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const ROOT_DIR = path.resolve(__dirname, '..');
  const FRONTEND_DIR = path.resolve(ROOT_DIR, 'frontend');
  const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

  // Integração com Vite SPA
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(DIST_DIR, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      configFile: path.resolve(ROOT_DIR, 'vite.config.ts'),
      root: FRONTEND_DIR,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n☕ Aroma rodando em:`);
    console.log(`➜ [Aroma](http://localhost:${PORT}/)\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
