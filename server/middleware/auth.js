import jwt from 'jsonwebtoken';

// JWT Secret — DEBE estar en .env, nunca hardcodeado
if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no esta definido en las variables de entorno.');
  console.error('[FATAL] Agrega al .env: JWT_SECRET=<clave-aleatoria-larga>');
  process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    console.warn(`[SEGURIDAD] Acceso admin denegado — usuario: ${req.user?.name} (id:${req.user?.id}) — ruta: ${req.originalUrl}`);
    return res.status(403).json({ error: 'Acceso de administrador requerido' });
  }
  next();
};
