import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: resolve(__dirname, '.env.local') });
dotenv.config({ path: resolve(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado. Configure no arquivo .env.local');
  process.exit(1);
}

/**
 * Formata data para exibição
 */
function formatDate(date) {
  if (!date) return 'N/A';
  return date.toISOString().split('T')[0];
}

async function seedAllocationHistory() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Conectado ao banco de dados\n');
    
    // Buscar um usuário admin para usar como changedBy
    console.log('👤 Buscando usuário admin...');
    const [adminUsers] = await connection.execute(
      "SELECT id, name, email, role FROM users WHERE role IN ('admin', 'coordinator', 'manager') AND isActive = 1 LIMIT 1"
    );
    
    let changedByUserId;
    if (adminUsers.length > 0) {
      changedByUserId = adminUsers[0].id;
      console.log(`✅ Usando usuário: ${adminUsers[0].name || adminUsers[0].email} (ID: ${changedByUserId}, Role: ${adminUsers[0].role})\n`);
    } else {
      // Se não houver admin, buscar qualquer usuário ativo
      const [anyUsers] = await connection.execute(
        "SELECT id, name, email FROM users WHERE isActive = 1 LIMIT 1"
      );
      
      if (anyUsers.length > 0) {
        changedByUserId = anyUsers[0].id;
        console.log(`⚠️  Nenhum admin encontrado. Usando usuário: ${anyUsers[0].name || anyUsers[0].email} (ID: ${changedByUserId})\n`);
      } else {
        console.error('❌ Nenhum usuário encontrado no sistema. Crie um usuário antes de executar este script.');
        return;
      }
    }
    
    // Buscar todas as alocações ativas
    console.log('📋 Buscando alocações ativas...');
    const [allocations] = await connection.execute(
      `SELECT 
        a.id,
        a.employeeId,
        a.projectId,
        a.allocatedHours,
        a.allocatedPercentage,
        a.startDate,
        a.endDate,
        a.createdAt,
        e.name as employeeName,
        p.name as projectName
      FROM allocations a
      INNER JOIN employees e ON a.employeeId = e.id
      INNER JOIN projects p ON a.projectId = p.id
      WHERE a.isActive = 1
      ORDER BY a.createdAt ASC`
    );
    
    console.log(`✅ Encontradas ${allocations.length} alocação(ões) ativa(s)\n`);
    
    if (allocations.length === 0) {
      console.log('⚠️  Nenhuma alocação ativa encontrada. Crie alocações antes de executar este script.');
      return;
    }
    
    // Verificar quais alocações já têm histórico
    console.log('🔍 Verificando histórico existente...');
    const [existingHistory] = await connection.execute(
      `SELECT DISTINCT allocationId 
       FROM allocation_history 
       WHERE allocationId IS NOT NULL`
    );
    
    const existingAllocationIds = new Set(
      existingHistory.map(h => h.allocationId)
    );
    
    const allocationsToProcess = allocations.filter(
      a => !existingAllocationIds.has(a.id)
    );
    
    console.log(`   Total de alocações: ${allocations.length}`);
    console.log(`   Alocações com histórico: ${existingAllocationIds.size}`);
    console.log(`   Alocações a processar: ${allocationsToProcess.length}\n`);
    
    if (allocationsToProcess.length === 0) {
      console.log('✅ Todas as alocações já possuem histórico. Nada a fazer.');
      return;
    }
    
    let historyCreated = 0;
    let historySkipped = 0;
    let historyErrors = 0;
    
    console.log('📝 Criando registros de histórico...\n');
    
    // Criar histórico para cada alocação
    for (const allocation of allocationsToProcess) {
      try {
        // Verificar se já existe histórico para esta alocação
        const [existing] = await connection.execute(
          `SELECT id FROM allocation_history 
           WHERE allocationId = ? AND action = 'created'`,
          [allocation.id]
        );
        
        if (existing.length > 0) {
          historySkipped++;
          console.log(`   ⚠️  Alocação ID ${allocation.id} (${allocation.employeeName} → ${allocation.projectName}): histórico já existe`);
          continue;
        }
        
        // Criar registro de histórico
        await connection.execute(
          `INSERT INTO allocation_history 
           (allocationId, employeeId, projectId, allocatedHours, allocatedPercentage, 
            startDate, endDate, action, changedBy, comment, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)`,
          [
            allocation.id,
            allocation.employeeId,
            allocation.projectId,
            allocation.allocatedHours,
            allocation.allocatedPercentage || null,
            allocation.startDate,
            allocation.endDate,
            changedByUserId,
            'Histórico criado automaticamente pelo seed',
            allocation.createdAt || new Date()
          ]
        );
        
        historyCreated++;
        console.log(`   ✅ Alocação ID ${allocation.id}: ${allocation.employeeName} → ${allocation.projectName} (${allocation.allocatedHours}h, ${formatDate(allocation.startDate)} - ${formatDate(allocation.endDate)})`);
        
      } catch (error) {
        historyErrors++;
        console.error(`   ❌ Erro ao criar histórico para alocação ID ${allocation.id}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumo:');
    console.log(`   ✅ Históricos criados: ${historyCreated}`);
    console.log(`   ⚠️  Históricos ignorados (já existentes): ${historySkipped}`);
    console.log(`   ❌ Erros: ${historyErrors}`);
    console.log('='.repeat(60));
    
    // Verificar resultado final
    const [finalCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM allocation_history'
    );
    console.log(`\n📈 Total de registros no histórico: ${finalCount[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexão com banco de dados fechada');
    }
  }
}

// Executar script
seedAllocationHistory();

