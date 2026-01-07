/**
 * Development API Server
 * Запускает Vercel API routes локально на порту 3001
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Загружаем .env.local
const envPath = join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!key.startsWith('#')) {
        process.env[key.trim()] = value;
      }
    }
  });
  console.log('[DEV SERVER] Environment variables loaded from .env.local');
}

// Динамически загружаем и запускаем API routes
async function loadApiRoute(path, req, res) {
  try {
    const routePath = join(__dirname, 'api', `${path}.ts`);

    if (!fs.existsSync(routePath)) {
      return res.status(404).json({ error: 'API route not found' });
    }

    // Используем dynamic import для TypeScript файлов
    const module = await import(routePath);
    const handler = module.default;

    if (typeof handler === 'function') {
      await handler(req, res);
    } else {
      res.status(500).json({ error: 'Invalid API handler' });
    }
  } catch (error) {
    console.error('[DEV SERVER] Error loading route:', error);
    res.status(500).json({ error: error.message });
  }
}

// Обработчик всех /api/* запросов
app.use('/api', async (req, res) => {
  const apiPath = req.path.substring(1); // Убираем начальный /
  console.log(`[DEV SERVER] ${req.method} /api/${apiPath}`);
  await loadApiRoute(apiPath, req, res);
});

app.listen(PORT, () => {
  console.log(`[DEV SERVER] API server running on http://localhost:${PORT}`);
  console.log(`[DEV SERVER] Serving API routes from /api/*`);
});
