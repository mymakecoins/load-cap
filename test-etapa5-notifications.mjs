import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '.');

// Carrega variáveis de ambiente
config({ path: resolve(projectRoot, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env.local');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL.replace('mysql://', 'http://'));
const dbConfig = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
};

let connection;

async function connect() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados\n');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error.message);
    process.exit(1);
  }
}

async function disconnect() {
  if (connection) {
    await connection.end();
    console.log('\n✅ Desconectado do banco de dados');
  }
}

async function query(sql, params = []) {
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    console.error(`❌ Erro na query: ${sql}`, error.message);
    throw error;
  }
}

// Testes
const tests = {
  tablesExist: false,
  notificationsCreated: false,
  preferencesWork: false,
  unreadCount: false,
};

async function testTablesExist() {
  console.log('📋 Teste 1: Verificando se as tabelas existem...');
  
  try {
    const notifications = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name = 'notifications'
    `, [dbConfig.database]);
    
    const preferences = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name = 'notification_preferences'
    `, [dbConfig.database]);
    
    if (notifications && notifications[0] && notifications[0].count > 0 && 
        preferences && preferences[0] && preferences[0].count > 0) {
      console.log('   ✅ Tabela notifications existe');
      console.log('   ✅ Tabela notification_preferences existe');
      
      // Verificar estrutura
      const notifColumns = await query(`DESCRIBE notifications`);
      const prefColumns = await query(`DESCRIBE notification_preferences`);
      
      const notifCount = notifColumns && notifColumns.length ? notifColumns.length : 0;
      const prefCount = prefColumns && prefColumns.length ? prefColumns.length : 0;
      
      console.log(`   ✅ notifications tem ${notifCount} colunas`);
      console.log(`   ✅ notification_preferences tem ${prefCount} colunas`);
      
      tests.tablesExist = true;
      return true;
    } else {
      console.log('   ❌ Tabelas não encontradas');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function testNotificationsCreated() {
  console.log('\n📋 Teste 2: Verificando notificações criadas...');
  
  try {
    // Buscar usuários que são gerentes
    const managers = await query(`
      SELECT DISTINCT p.managerId 
      FROM projects p 
      WHERE p.managerId IS NOT NULL 
      LIMIT 1
    `);
    
    if (!managers || managers.length === 0) {
      console.log('   ⚠️  Nenhum gerente encontrado nos projetos');
      console.log('   💡 Crie um projeto com gerente para testar notificações');
      return false;
    }
    
    const managerId = managers[0].managerId;
    
    // Verificar se há notificações para este gerente
    const notifications = await query(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE userId = ?
    `, [managerId]);
    
    const count = notifications && notifications[0] ? notifications[0].count : 0;
    
    if (count > 0) {
      console.log(`   ✅ Encontradas ${count} notificação(ões) para o gerente ID ${managerId}`);
      
      // Mostrar algumas notificações
      const recent = await query(`
        SELECT id, type, title, isRead, createdAt 
        FROM notifications 
        WHERE userId = ? 
        ORDER BY createdAt DESC 
        LIMIT 5
      `, [managerId]);
      
      if (recent.length > 0) {
        console.log('\n   📬 Notificações recentes:');
        recent.forEach(notif => {
          const date = new Date(notif.createdAt).toLocaleString('pt-BR');
          const read = notif.isRead ? '✅ Lida' : '🔔 Não lida';
          console.log(`      - [${notif.type}] ${notif.title} - ${read} (${date})`);
        });
      }
      
      tests.notificationsCreated = true;
      return true;
    } else {
      console.log(`   ⚠️  Nenhuma notificação encontrada para o gerente ID ${managerId}`);
      console.log('   💡 Crie uma alocação em um projeto deste gerente para gerar notificação');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function testPreferencesWork() {
  console.log('\n📋 Teste 3: Testando preferências de notificação...');
  
  try {
    // Buscar um usuário
    const users = await query(`
      SELECT id FROM users LIMIT 1
    `);
    
    if (!users || users.length === 0) {
      console.log('   ⚠️  Nenhum usuário encontrado');
      return false;
    }
    
    const userId = users[0].id;
    
    // Verificar se há preferências
    const prefs = await query(`
      SELECT * FROM notification_preferences 
      WHERE userId = ?
    `, [userId]);
    
    if (prefs && prefs.length > 0) {
      const pref = prefs[0];
      console.log(`   ✅ Preferências encontradas para usuário ID ${userId}:`);
      console.log(`      - allocationCreated: ${pref.allocationCreated ? '✅' : '❌'}`);
      console.log(`      - allocationUpdated: ${pref.allocationUpdated ? '✅' : '❌'}`);
      console.log(`      - allocationDeleted: ${pref.allocationDeleted ? '✅' : '❌'}`);
      console.log(`      - allocationReverted: ${pref.allocationReverted ? '✅' : '❌'}`);
      console.log(`      - emailNotifications: ${pref.emailNotifications ? '✅' : '❌'}`);
      
      tests.preferencesWork = true;
      return true;
    } else {
      console.log(`   ⚠️  Nenhuma preferência encontrada para usuário ID ${userId}`);
      console.log('   💡 As preferências serão criadas quando o usuário acessar a página');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function testUnreadCount() {
  console.log('\n📋 Teste 4: Testando contador de não lidas...');
  
  try {
    // Buscar usuários com notificações
    const usersWithNotifs = await query(`
      SELECT DISTINCT userId, 
             COUNT(*) as total,
             SUM(CASE WHEN isRead = false THEN 1 ELSE 0 END) as unread
      FROM notifications 
      GROUP BY userId 
      HAVING total > 0
      LIMIT 5
    `);
    
    if (!usersWithNotifs || usersWithNotifs.length === 0) {
      console.log('   ⚠️  Nenhum usuário com notificações encontrado');
      console.log('   💡 Crie alocações para gerar notificações');
      return false;
    }
    
    console.log(`   ✅ Encontrados ${usersWithNotifs.length} usuário(s) com notificações:\n`);
    
    usersWithNotifs.forEach(user => {
      console.log(`   👤 Usuário ID ${user.userId}:`);
      console.log(`      - Total: ${user.total} notificação(ões)`);
      console.log(`      - Não lidas: ${user.unread} notificação(ões)`);
      console.log(`      - Lidas: ${user.total - user.unread} notificação(ões)\n`);
    });
    
    tests.unreadCount = true;
    return true;
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function showStatistics() {
  console.log('\n📊 Estatísticas do Sistema de Notificações:\n');
  
  try {
    // Total de notificações
    const total = await query(`SELECT COUNT(*) as count FROM notifications`);
    const totalCount = total && total[0] ? total[0].count : 0;
    console.log(`   📬 Total de notificações: ${totalCount}`);
    
    // Por tipo
    const byType = await query(`
      SELECT type, COUNT(*) as count 
      FROM notifications 
      GROUP BY type
    `);
    
    if (byType && byType.length > 0) {
      console.log('\n   📊 Por tipo:');
      byType.forEach(item => {
        console.log(`      - ${item.type}: ${item.count}`);
      });
    }
    
    // Status de leitura
    const byRead = await query(`
      SELECT 
        SUM(CASE WHEN isRead = false THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN isRead = true THEN 1 ELSE 0 END) as \`read\`
      FROM notifications
    `);
    
    const unreadCount = byRead && byRead[0] ? (byRead[0].unread || 0) : 0;
    const readCount = byRead && byRead[0] ? (byRead[0].read || 0) : 0;
    
    console.log(`\n   📖 Status:`);
    console.log(`      - Não lidas: ${unreadCount}`);
    console.log(`      - Lidas: ${readCount}`);
    
    // Preferências
    const prefsCount = await query(`SELECT COUNT(*) as count FROM notification_preferences`);
    const prefsCountValue = prefsCount && prefsCount[0] ? prefsCount[0].count : 0;
    console.log(`\n   ⚙️  Usuários com preferências configuradas: ${prefsCountValue}`);
    
  } catch (error) {
    console.log(`   ❌ Erro ao gerar estatísticas: ${error.message}`);
  }
}

async function main() {
  console.log('🧪 Testando Sistema de Notificações - Etapa 5');
  console.log('='.repeat(60));
  console.log('');
  
  await connect();
  
  try {
    // Executar testes
    await testTablesExist();
    await testNotificationsCreated();
    await testPreferencesWork();
    await testUnreadCount();
    await showStatistics();
    
    // Resumo
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Resumo dos Testes:\n');
    
    Object.entries(tests).forEach(([test, passed]) => {
      const icon = passed ? '✅' : '⚠️';
      const status = passed ? 'OK' : 'PENDENTE';
      const testName = test
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
      console.log(`${icon} ${testName}: ${status}`);
    });
    
    const allPassed = Object.values(tests).every(t => t);
    
    console.log('\n' + '='.repeat(60));
    
    if (allPassed) {
      console.log('\n🎉 Todos os testes básicos passaram!');
      console.log('\n💡 Próximos passos para teste manual:');
      console.log('   1. Inicie o servidor: pnpm dev');
      console.log('   2. Acesse a interface web');
      console.log('   3. Verifique o sino de notificações no header');
      console.log('   4. Crie uma alocação como coordenador');
      console.log('   5. Verifique se o gerente recebeu notificação');
      console.log('   6. Teste marcar como lida e deletar');
      console.log('   7. Acesse /configuracoes/notificacoes para testar preferências\n');
    } else {
      console.log('\n⚠️  Alguns testes não puderam ser executados.');
      console.log('   Isso pode ser normal se não houver dados de teste ainda.\n');
      console.log('💡 Para gerar dados de teste:');
      console.log('   1. Inicie o servidor: pnpm dev');
      console.log('   2. Acesse a interface web');
      console.log('   3. Crie projetos com gerentes');
      console.log('   4. Crie alocações nesses projetos');
      console.log('   5. Execute este script novamente\n');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  } finally {
    await disconnect();
  }
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

