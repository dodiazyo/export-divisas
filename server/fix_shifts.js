import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixShifts() {
  const client = await pool.connect();
  console.log('Iniciando reconciliación de turnos...');
  
  try {
    await client.query('BEGIN');
    
    // Obtenemos todos los turnos
    const shiftsRes = await client.query('SELECT * FROM shifts');
    let updatedCount = 0;
    
    for (const shift of shiftsRes.rows) {
      const shiftId = shift.id;
      let shiftData = shift.data || {};
      
      // Reiniciar acumuladores (para no duplicar si se corre varias veces)
      shiftData.currencyPayouts = 0;
      shiftData.usdOnHand = shiftData.usdStartAmount || 0;
      shiftData.eurOnHand = shiftData.eurStartAmount || 0;
      shiftData.totalGain = 0;
      shiftData.externalSalesTotal = 0;
      shiftData.transactions = 0;
      shiftData.injections = [];
      
      // Sumar transacciones
      const txs = await client.query('SELECT * FROM transactions WHERE shift_id = $1', [shiftId]);
      for (const tx of txs.rows) {
        shiftData.transactions++;
        const tData = tx.data || {};
        
        if (tx.type === 'exchange') {
          shiftData.currencyPayouts += (tData.dopAmount || 0);
          if (tData.currency === 'USD') shiftData.usdOnHand += (tData.amount || 0);
          if (tData.currency === 'EUR') shiftData.eurOnHand += (tData.amount || 0);
          shiftData.totalGain += (tData.gain || 0);
        } else if (tx.type === 'external_sale') {
          shiftData.externalSalesTotal += (tData.total || 0);
        }
      }
      
      // Sumar inyecciones
      const injs = await client.query('SELECT * FROM injections WHERE shift_id = $1', [shiftId]);
      for (const inj of injs.rows) {
        const iData = inj.data || {};
        shiftData.injections.push(iData);
        if (iData.currency === 'USD') shiftData.usdOnHand += (iData.amount || 0);
        if (iData.currency === 'EUR') shiftData.eurOnHand += (iData.amount || 0);
      }
      
      // Actualizar turno
      await client.query('UPDATE shifts SET data = $1 WHERE id = $2', [JSON.stringify(shiftData), shiftId]);
      updatedCount++;
    }
    
    await client.query('COMMIT');
    console.log(`¡Éxito! Se han recalculado y corregido los saldos de ${updatedCount} turnos.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recalculando turnos:', err);
  } finally {
    client.release();
    pool.end();
  }
}

fixShifts();
