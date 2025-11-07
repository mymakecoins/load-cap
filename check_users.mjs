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

async function checkUsers() {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.query('SELECT id, name, email, role FROM users LIMIT 10');
    console.log('Usuários no banco de dados:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
  } finally {
    await connection.release();
    await pool.end();
  }
}

checkUsers();
