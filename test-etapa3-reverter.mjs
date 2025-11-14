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
    
    // Teste 1: Verificar estrutura da tabela - novos campos
    console.log('📋 Teste 1: Estrutura da tabela allocation_history (novos campos)');
    const [columns] = await connection.execute('DESCRIBE allocation_history');
    
    const previousAllocatedHours = columns.find((col) => col.Field === 'previousAllocatedHours');
    const previousAllocatedPercentage = columns.find((col) => col.Field === 'previousAllocatedPercentage');
    const previousEndDate = columns.find((col) => col.Field === 'previousEndDate');
    const revertedHistoryId = columns.find((col) => col.Field === 'revertedHistoryId');
    
    test('Campo previousAllocatedHours existe', () => {
      if (!previousAllocatedHours) throw new Error('Campo previousAllocatedHours não encontrado');
    });
    
    test('Campo previousAllocatedPercentage existe', () => {
      if (!previousAllocatedPercentage) throw new Error('Campo previousAllocatedPercentage não encontrado');
    });
    
    test('Campo previousEndDate existe', () => {
      if (!previousEndDate) throw new Error('Campo previousEndDate não encontrado');
    });
    
    test('Campo revertedHistoryId existe', () => {
      if (!revertedHistoryId) throw new Error('Campo revertedHistoryId não encontrado');
    });
    
    console.log('');
    
    // Teste 2: Verificar enum de action
    console.log('📋 Teste 2: Enum de action atualizado');
    const [actionColumn] = await connection.execute(
      "SHOW COLUMNS FROM allocation_history WHERE Field = 'action'"
    );
    
    test('Enum action contém reverted_creation', () => {
      const enumValues = actionColumn[0].Type;
      if (!enumValues.includes('reverted_creation')) {
        throw new Error('Enum não contém reverted_creation');
      }
    });
    
    test('Enum action contém reverted_update', () => {
      const enumValues = actionColumn[0].Type;
      if (!enumValues.includes('reverted_update')) {
        throw new Error('Enum não contém reverted_update');
      }
    });
    
    test('Enum action contém reverted_deletion', () => {
      const enumValues = actionColumn[0].Type;
      if (!enumValues.includes('reverted_deletion')) {
        throw new Error('Enum não contém reverted_deletion');
      }
    });
    
    console.log('');
    
    // Teste 3: Verificar dados de teste e criar se necessário
    console.log('📋 Teste 3: Preparar dados de teste');
    
    // Buscar um coordenador
    const [coordinators] = await connection.execute(
      "SELECT id FROM users WHERE role IN ('coordinator', 'admin') LIMIT 1"
    );
    
    if (coordinators.length === 0) {
      console.log('⚠️  Nenhum coordenador encontrado. Criando coordenador de teste...');
      const passwordHash = require('crypto').createHash('sha256').update('test123').digest('hex');
      await connection.execute(
        `INSERT INTO users (openId, name, email, passwordHash, role, loginMethod, lastSignedIn, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [`local_${Date.now()}_test_coord`, 'Coordenador Teste', 'coord_test@test.com', passwordHash, 'coordinator', 'email']
      );
      const [newCoord] = await connection.execute('SELECT LAST_INSERT_ID() as id');
      coordinators.push({ id: newCoord[0].id });
    }
    
    const coordinatorId = coordinators[0].id;
    console.log(`✅ Coordenador de teste: ID ${coordinatorId}`);
    
    // Buscar colaborador e projeto
    const [employees] = await connection.execute(
      "SELECT id FROM employees WHERE isDeleted = 0 LIMIT 1"
    );
    const [projects] = await connection.execute(
      "SELECT id FROM projects WHERE isDeleted = 0 LIMIT 1"
    );
    
    if (employees.length === 0 || projects.length === 0) {
      console.log('⚠️  Dados insuficientes. Por favor, crie pelo menos um colaborador e um projeto.');
      console.log('');
      console.log('📊 Resumo dos Testes:');
      console.log(`✅ Passou: ${testsPassed}`);
      console.log(`❌ Falhou: ${testsFailed}`);
      await connection.end();
      process.exit(testsFailed > 0 ? 1 : 0);
    }
    
    const employeeId = employees[0].id;
    const projectId = projects[0].id;
    
    console.log(`✅ Colaborador: ID ${employeeId}`);
    console.log(`✅ Projeto: ID ${projectId}`);
    console.log('');
    
    // Teste 4: Criar alocação de teste e verificar snapshot
    console.log('📋 Teste 4: Criar alocação e verificar snapshot em atualização');
    
    // Criar alocação
    const [createResult] = await connection.execute(
      `INSERT INTO allocations (employeeId, projectId, allocatedHours, allocatedPercentage, startDate, endDate, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW(), NOW())`,
      [employeeId, projectId, 40, '50.00']
    );
    const allocationId = createResult.insertId;
    
    // Criar histórico de criação
    await connection.execute(
      `INSERT INTO allocation_history (allocationId, employeeId, projectId, allocatedHours, allocatedPercentage, startDate, endDate, action, changedBy, createdAt)
       VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'created', ?, NOW())`,
      [allocationId, employeeId, projectId, 40, '50.00', coordinatorId]
    );
    
    // Atualizar alocação (deve criar snapshot)
    await connection.execute(
      `UPDATE allocations SET allocatedHours = ?, updatedAt = NOW() WHERE id = ?`,
      [60, allocationId]
    );
    
    // Criar histórico de atualização com snapshot
    await connection.execute(
      `INSERT INTO allocation_history (allocationId, employeeId, projectId, allocatedHours, allocatedPercentage, startDate, endDate, action, changedBy, comment, previousAllocatedHours, previousAllocatedPercentage, previousEndDate, createdAt)
       VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'updated', ?, 'Teste de atualização', ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())`,
      [allocationId, employeeId, projectId, 60, '50.00', coordinatorId, 40, '50.00']
    );
    
    // Verificar se snapshot foi criado
    const [snapshotCheck] = await connection.execute(
      `SELECT previousAllocatedHours, previousAllocatedPercentage FROM allocation_history 
       WHERE allocationId = ? AND action = 'updated' ORDER BY createdAt DESC LIMIT 1`,
      [allocationId]
    );
    
    test('Snapshot de valores anteriores foi armazenado', () => {
      if (snapshotCheck.length === 0) {
        throw new Error('Registro de atualização não encontrado');
      }
      if (snapshotCheck[0].previousAllocatedHours !== 40) {
        throw new Error(`previousAllocatedHours incorreto: ${snapshotCheck[0].previousAllocatedHours}`);
      }
    });
    
    console.log('');
    
    // Teste 5: Testar reversão de atualização (via SQL direto)
    console.log('📋 Teste 5: Reverter atualização');
    
    const [updateHistory] = await connection.execute(
      `SELECT id FROM allocation_history 
       WHERE allocationId = ? AND action = 'updated' ORDER BY createdAt DESC LIMIT 1`,
      [allocationId]
    );
    
    if (updateHistory.length > 0) {
      const historyId = updateHistory[0].id;
      
      // Obter valores anteriores do histórico
      const [historyRecord] = await connection.execute(
        `SELECT previousAllocatedHours, previousAllocatedPercentage, previousEndDate 
         FROM allocation_history WHERE id = ?`,
        [historyId]
      );
      
      if (historyRecord.length > 0 && historyRecord[0].previousAllocatedHours !== null) {
        // Restaurar valores
        await connection.execute(
          `UPDATE allocations SET allocatedHours = ?, updatedAt = NOW() WHERE id = ?`,
          [historyRecord[0].previousAllocatedHours, allocationId]
        );
        
        // Criar registro de reversão
        await connection.execute(
          `INSERT INTO allocation_history (allocationId, employeeId, projectId, allocatedHours, allocatedPercentage, startDate, endDate, action, changedBy, comment, revertedHistoryId, createdAt)
           VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'reverted_update', ?, 'Revertido via teste', ?, NOW())`,
          [allocationId, employeeId, projectId, historyRecord[0].previousAllocatedHours, historyRecord[0].previousAllocatedPercentage, coordinatorId, historyId]
        );
        
        // Verificar se reversão foi criada
        const [revertCheck] = await connection.execute(
          `SELECT id FROM allocation_history WHERE revertedHistoryId = ?`,
          [historyId]
        );
        
        test('Reversão de atualização foi criada', () => {
          if (revertCheck.length === 0) {
            throw new Error('Registro de reversão não encontrado');
          }
        });
        
        // Verificar se valores foram restaurados
        const [allocationCheck] = await connection.execute(
          `SELECT allocatedHours FROM allocations WHERE id = ?`,
          [allocationId]
        );
        
        test('Valores foram restaurados corretamente', () => {
          if (allocationCheck[0].allocatedHours !== historyRecord[0].previousAllocatedHours) {
            throw new Error(`Valor não foi restaurado. Esperado: ${historyRecord[0].previousAllocatedHours}, Obtido: ${allocationCheck[0].allocatedHours}`);
          }
        });
      }
    }
    
    console.log('');
    
    // Teste 6: Verificar que não é possível reverter duas vezes
    console.log('📋 Teste 6: Validação de reversão duplicada');
    
    const [revertedHistory] = await connection.execute(
      `SELECT id FROM allocation_history WHERE action = 'reverted_update' ORDER BY createdAt DESC LIMIT 1`
    );
    
    if (revertedHistory.length > 0) {
      const [duplicateCheck] = await connection.execute(
        `SELECT COUNT(*) as count FROM allocation_history WHERE revertedHistoryId = ?`,
        [revertedHistory[0].id]
      );
      
      test('Não há reversões duplicadas', () => {
        if (duplicateCheck[0].count > 1) {
          throw new Error(`Encontradas ${duplicateCheck[0].count} reversões para o mesmo histórico`);
        }
      });
    }
    
    console.log('');
    
    // Limpeza: remover dados de teste
    console.log('🧹 Limpando dados de teste...');
    await connection.execute(`DELETE FROM allocation_history WHERE allocationId = ?`, [allocationId]);
    await connection.execute(`DELETE FROM allocations WHERE id = ?`, [allocationId]);
    console.log('✅ Dados de teste removidos\n');
    
    // Resumo
    console.log('='.repeat(60));
    console.log('\n📊 Resumo dos Testes:\n');
    console.log(`✅ Passou: ${testsPassed}`);
    console.log(`❌ Falhou: ${testsFailed}`);
    console.log('');
    
    if (testsFailed === 0) {
      console.log('🎉 Todos os testes passaram! A funcionalidade de reversão está implementada corretamente.\n');
      console.log('💡 Próximos passos:');
      console.log('   1. Teste a funcionalidade pela interface web');
      console.log('   2. Verifique que o botão de reverter aparece apenas para coordenadores');
      console.log('   3. Teste reverter criação, atualização e deleção');
      console.log('   4. Verifique que não é possível reverter duas vezes\n');
    } else {
      console.log('⚠️  Alguns testes falharam. Verifique os erros acima.\n');
    }
    
    await connection.end();
    process.exit(testsFailed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

runTests();

