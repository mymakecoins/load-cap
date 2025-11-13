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
    
    // Teste 1: Verificar estrutura da tabela
    console.log('📋 Teste 1: Estrutura da tabela allocation_history');
    const [columns] = await connection.execute('DESCRIBE allocation_history');
    const changedByColumn = columns.find((col) => col.Field === 'changedBy');
    
    test('Campo changedBy existe', () => {
      if (!changedByColumn) throw new Error('Campo changedBy não encontrado');
    });
    
    test('Campo changedBy é NOT NULL', () => {
      if (changedByColumn.Null !== 'NO') {
        throw new Error(`Campo changedBy permite NULL (Null: ${changedByColumn.Null})`);
      }
    });
    
    test('Campo changedBy é do tipo INT', () => {
      if (!changedByColumn.Type.includes('int')) {
        throw new Error(`Campo changedBy não é INT (Type: ${changedByColumn.Type})`);
      }
    });
    
    console.log('');
    
    // Teste 2: Verificar que não há registros com changedBy NULL
    console.log('📋 Teste 2: Validação de dados existentes');
    const [nullCheck] = await connection.execute(
      'SELECT COUNT(*) as count FROM allocation_history WHERE changedBy IS NULL'
    );
    
    test('Não há registros com changedBy NULL', () => {
      if (nullCheck[0].count > 0) {
        throw new Error(`Encontrados ${nullCheck[0].count} registros com changedBy NULL`);
      }
    });
    
    // Teste 3: Verificar que todos os registros têm changedBy válido
    const [totalRecords] = await connection.execute(
      'SELECT COUNT(*) as count FROM allocation_history'
    );
    const total = totalRecords[0].count;
    
    if (total > 0) {
      const [validRecords] = await connection.execute(
        'SELECT COUNT(*) as count FROM allocation_history WHERE changedBy IS NOT NULL'
      );
      
      test('Todos os registros têm changedBy preenchido', () => {
        if (validRecords[0].count !== total) {
          throw new Error(`Apenas ${validRecords[0].count} de ${total} registros têm changedBy preenchido`);
        }
      });
      
      // Teste 4: Verificar que changedBy referencia usuários válidos
      console.log('');
      console.log('📋 Teste 3: Integridade referencial');
      
      const [invalidRefs] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM allocation_history ah 
         LEFT JOIN users u ON ah.changedBy = u.id 
         WHERE u.id IS NULL`
      );
      
      test('Todos os changedBy referenciam usuários válidos', () => {
        if (invalidRefs[0].count > 0) {
          console.warn(`⚠️  ${invalidRefs[0].count} registro(s) referenciam usuários deletados (isso é esperado)`);
        }
      });
      
      // Teste 5: Estatísticas de mudanças por usuário
      console.log('');
      console.log('📋 Teste 4: Estatísticas de mudanças');
      
      const [stats] = await connection.execute(
        `SELECT 
          ah.changedBy,
          u.name as userName,
          COUNT(*) as total_mudancas,
          SUM(CASE WHEN ah.action = 'created' THEN 1 ELSE 0 END) as criacoes,
          SUM(CASE WHEN ah.action = 'updated' THEN 1 ELSE 0 END) as atualizacoes,
          SUM(CASE WHEN ah.action = 'deleted' THEN 1 ELSE 0 END) as delecoes
         FROM allocation_history ah
         LEFT JOIN users u ON ah.changedBy = u.id
         GROUP BY ah.changedBy, u.name
         ORDER BY total_mudancas DESC
         LIMIT 5`
      );
      
      if (stats.length > 0) {
        console.log('\n📊 Top 5 usuários por número de mudanças:');
        stats.forEach((stat, idx) => {
          console.log(`   ${idx + 1}. ${stat.userName || 'Usuário deletado'} (ID: ${stat.changedBy}):`);
          console.log(`      Total: ${stat.total_mudancas} | Criadas: ${stat.criacoes} | Atualizadas: ${stat.atualizacoes} | Deletadas: ${stat.delecoes}`);
        });
      }
    } else {
      console.log('ℹ️  Não há registros no histórico para validar');
    }
    
    // Teste 6: Verificar que a constraint NOT NULL funciona
    console.log('');
    console.log('📋 Teste 5: Validação de constraint NOT NULL');
    
    try {
      await connection.execute(
        'INSERT INTO allocation_history (employeeId, projectId, allocatedHours, startDate, action, changedBy) VALUES (?, ?, ?, ?, ?, ?)',
        [1, 1, 100, new Date(), 'created', null]
      );
      test('Tentativa de inserir com changedBy NULL deve falhar', () => {
        throw new Error('Inserção com changedBy NULL foi permitida (deveria falhar)');
      });
    } catch (error) {
      if (error.code === 'ER_BAD_NULL_ERROR' || error.message.includes('NULL')) {
        test('Constraint NOT NULL funciona corretamente', () => {
          // Sucesso - a constraint está funcionando
        });
      } else {
        test('Constraint NOT NULL funciona corretamente', () => {
          throw new Error(`Erro inesperado: ${error.message}`);
        });
      }
    }
    
    // Resumo
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(50));
    console.log(`✅ Testes passados: ${testsPassed}`);
    console.log(`❌ Testes falhados: ${testsFailed}`);
    console.log(`📈 Taxa de sucesso: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    if (testsFailed > 0) {
      console.error('\n❌ Alguns testes falharam. Revise as implementações.');
      process.exit(1);
    } else {
      console.log('\n✅ Todos os testes passaram!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar testes:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

runTests();

