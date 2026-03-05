import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// We need the DATABASE_URL to connect to the production DB
// Example: process.env.DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createItUser() {
  const client = await pool.connect();
  try {
    console.log('Iniciando creacion de cuenta de Soporte TI...');

    // Hash the default PIN (1234)
    const hash = await bcrypt.hash('1234', 10);
    
    // Check if it already exists
    const { rows } = await client.query('SELECT * FROM users WHERE role = $1 LIMIT 1', ['it']);
    if (rows.length > 0) {
      console.log('¡Ya existe un usuario con el rol de Soporte TI (it)! Nombre:', rows[0].name);
      return;
    }

    // Insert the new user
    await client.query(
      \`INSERT INTO users (name, pin_hash, role) VALUES ($1, $2, $3)\`,
      ['Soporte TI', hash, 'it']
    );

    console.log('¡Éxito! Se ha creado la cuenta "Soporte TI" con el PIN predeterminado: 1234');
    console.log('Puedes iniciar sesión con este usuario ahora mismo.');

  } catch (error) {
    console.error('Error al crear usuario de TI:', error);
  } finally {
    client.release();
    pool.end();
  }
}

createItUser();
