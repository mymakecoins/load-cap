import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
const NEW_PASSWORD = "+8UGcQ'M=1C6";

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado. Configure no arquivo .env.local');
  process.exit(1);
}

// Hash da senha usando SHA256 (mesmo método usado no db.ts)
function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function updatePasswords() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Conectado ao banco de dados\n');
    
    // Obter todos os usuários
    console.log('📋 Buscando usuários...');
    const [users] = await connection.execute('SELECT id, email, name FROM users');
    
    if (users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no banco de dados');
      return;
    }
    
    console.log(`📊 Encontrados ${users.length} usuário(s)\n`);
    
    // Hash da nova senha
    const passwordHash = hashPassword(NEW_PASSWORD);
    
    // Atualizar senha de todos os usuários
    console.log('🔐 Atualizando senhas...');
    let updatedCount = 0;
    
    for (const user of users) {
      try {
        await connection.execute(
          'UPDATE users SET passwordHash = ?, updatedAt = NOW() WHERE id = ?',
          [passwordHash, user.id]
        );
        console.log(`  ✓ Senha atualizada para: ${user.email || user.name || `ID ${user.id}`}`);
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Erro ao atualizar usuário ${user.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ ${updatedCount} de ${users.length} usuário(s) atualizado(s) com sucesso!`);
    console.log(`\n🔑 Nova senha para todos os usuários: ${NEW_PASSWORD}`);
    console.log('⚠️  ATENÇÃO: Esta senha deve ser alterada após o primeiro login!');
    
  } catch (error) {
    console.error('❌ Erro durante a atualização:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexão com banco de dados fechada');
    }
  }
}

// Executar atualização
updatePasswords();

