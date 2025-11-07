import { createHash } from 'crypto';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[1]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function createCoordinator() {
  const connection = await pool.getConnection();
  try {
    const passwordHash = createHash('sha256').update('Coordinator@123456').digest('hex');
    
    const query = `
      INSERT INTO users (openId, name, email, phone, passwordHash, role, loginMethod, lastSignedIn, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const values = [
      `local_${Date.now()}_coordinator`,
      'Coordenador Teste',
      'coordenador@email.com',
      null,
      passwordHash,
      'coordinator',
      'email',
      new Date(),
    ];
    
    await connection.execute(query, values);
    console.log('Coordenador criado com sucesso!');
    console.log('Email: coordenador@email.com');
    console.log('Senha: Coordinator@123456');
  } catch (error) {
    console.error('Erro ao criar coordenador:', error);
  } finally {
    await connection.release();
    await pool.end();
  }
}

createCoordinator();
