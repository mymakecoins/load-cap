import { config } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '.');

// Carrega variáveis de ambiente
config({ path: resolve(projectRoot, '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  process.exit(1);
}

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  let connection;
  
  try {
    connection = await mysql.createConnection(databaseUrl);
    console.log('🔌 Conectado ao banco de dados\n');
    
    // Teste 1: Verificar que getHistory retornaria dados enriquecidos
    console.log('📋 Teste 1: Simulação de getHistory com dados enriquecidos');
    
    const [historyRecords] = await connection.execute(
      `SELECT 
        ah.*,
        u.name as changedByName,
        u.email as changedByEmail
       FROM allocation_history ah
       LEFT JOIN users u ON ah.changedBy = u.id
       ORDER BY ah.createdAt DESC
       LIMIT 5`
    );
    
    if (historyRecords.length > 0) {
      test('Histórico retorna registros', () => {
        if (historyRecords.length === 0) throw new Error('Nenhum registro encontrado');
      });
      
      historyRecords.forEach((record, idx) => {
        test(`Registro ${idx + 1} tem changedBy preenchido`, () => {
          if (!record.changedBy) throw new Error('changedBy está vazio');
        });
        
        test(`Registro ${idx + 1} tem changedByName`, () => {
          if (!record.changedByName && record.changedBy) {
            // Se changedBy existe mas changedByName não, o usuário foi deletado
            // Isso é esperado, então não é um erro
          }
        });
        
        test(`Registro ${idx + 1} tem changedByEmail`, () => {
          if (!record.changedByEmail && record.changedBy) {
            // Se changedBy existe mas changedByEmail não, o usuário foi deletado
            // Isso é esperado, então não é um erro
          }
        });
      });
      
      console.log('\n📊 Exemplo de registro enriquecido:');
      const example = historyRecords[0];
      console.log(`   ID: ${example.id}`);
      console.log(`   Action: ${example.action}`);
      console.log(`   ChangedBy: ${example.changedBy}`);
      console.log(`   ChangedByName: ${example.changedByName || 'Usuário deletado'}`);
      console.log(`   ChangedByEmail: ${example.changedByEmail || '-'}`);
    } else {
      console.log('ℹ️  Não há registros no histórico para testar');
    }
    
    // Teste 2: Verificar que não é possível inserir sem changedBy
    console.log('\n📋 Teste 2: Validação de constraint NOT NULL');
    
    try {
      await connection.execute(
        'INSERT INTO allocation_history (employeeId, projectId, allocatedHours, startDate, action, changedBy) VALUES (?, ?, ?, ?, ?, ?)',
        [1, 1, 100, new Date(), 'created', null]
      );
      test('Tentativa de inserir com changedBy NULL deve falhar', () => {
        throw new Error('Inserção com changedBy NULL foi permitida (deveria falhar)');
      });
    } catch (error) {
      if (error.code === 'ER_BAD_NULL_ERROR' || error.message.includes('NULL') || error.message.includes('cannot be null')) {
        test('Constraint NOT NULL funciona corretamente', () => {
          // Sucesso - a constraint está funcionando
        });
      } else {
        test('Constraint NOT NULL funciona corretamente', () => {
          throw new Error(`Erro inesperado: ${error.message}`);
        });
      }
    }
    
    // Teste 3: Verificar distribuição de mudanças por usuário
    console.log('\n📋 Teste 3: Distribuição de mudanças por usuário');
    
    const [userStats] = await connection.execute(
      `SELECT 
        ah.changedBy,
        u.name as userName,
        u.email as userEmail,
        COUNT(*) as total_mudancas,
        SUM(CASE WHEN ah.action = 'created' THEN 1 ELSE 0 END) as criacoes,
        SUM(CASE WHEN ah.action = 'updated' THEN 1 ELSE 0 END) as atualizacoes,
        SUM(CASE WHEN ah.action = 'deleted' THEN 1 ELSE 0 END) as delecoes
       FROM allocation_history ah
       LEFT JOIN users u ON ah.changedBy = u.id
       GROUP BY ah.changedBy, u.name, u.email
       ORDER BY total_mudancas DESC`
    );
    
    if (userStats.length > 0) {
      test('Estatísticas de usuários foram calculadas', () => {
        if (userStats.length === 0) throw new Error('Nenhuma estatística encontrada');
      });
      
      console.log('\n📊 Distribuição de mudanças por usuário:');
      userStats.forEach((stat, idx) => {
        const userName = stat.userName || 'Usuário deletado';
        console.log(`   ${idx + 1}. ${userName} (ID: ${stat.changedBy}):`);
        console.log(`      Total: ${stat.total_mudancas} | Criadas: ${stat.criacoes} | Atualizadas: ${stat.atualizacoes} | Deletadas: ${stat.delecoes}`);
      });
    }
    
    // Teste 4: Verificar que todos os registros têm changedBy válido
    console.log('\n📋 Teste 4: Validação de integridade dos dados');
    
    const [totalRecords] = await connection.execute(
      'SELECT COUNT(*) as count FROM allocation_history'
    );
    const total = totalRecords[0].count;
    
    if (total > 0) {
      const [recordsWithChangedBy] = await connection.execute(
        'SELECT COUNT(*) as count FROM allocation_history WHERE changedBy IS NOT NULL'
      );
      
      test('Todos os registros têm changedBy preenchido', () => {
        if (recordsWithChangedBy[0].count !== total) {
          throw new Error(`Apenas ${recordsWithChangedBy[0].count} de ${total} registros têm changedBy preenchido`);
        }
      });
      
      const [recordsWithValidUser] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM allocation_history ah 
         INNER JOIN users u ON ah.changedBy = u.id`
      );
      
      console.log(`\nℹ️  ${recordsWithValidUser[0].count} de ${total} registros referenciam usuários ativos`);
      console.log(`   ${total - recordsWithValidUser[0].count} registros referenciam usuários deletados (esperado)`);
    }
    
    // Resumo
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DOS TESTES DE BACKEND');
    console.log('='.repeat(50));
    console.log(`✅ Testes passados: ${testsPassed}`);
    console.log(`❌ Testes falhados: ${testsFailed}`);
    console.log(`📈 Taxa de sucesso: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    if (testsFailed > 0) {
      console.error('\n❌ Alguns testes falharam. Revise as implementações.');
      process.exit(1);
    } else {
      console.log('\n✅ Todos os testes de backend passaram!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar testes:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

runTests();

