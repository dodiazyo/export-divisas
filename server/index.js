import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './database.js';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import shiftsRoutes from './routes/shifts.js';
import vaultRoutes from './routes/vault.js';
import superadminRoutes from './routes/superadmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy since Render proxies the traffic
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'", "data:"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  } : false, // Disabled in dev for hot-reload convenience
}));

// CORS: en producción sólo el origen configurado; en dev, Vite local
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin origin (Postman, mobile, SSR) o dentro de la whitelist
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/superadmin', superadminRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Initialize DB and start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('[server] Failed to initialize DB:', err);
  process.exit(1);
});
