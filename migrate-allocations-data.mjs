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
 * Calcula dias úteis entre duas datas (excluindo sábados e domingos)
 */
function getBusinessDays(start, end) {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calcula horas baseado em percentual de alocação
 */
function calculateHoursFromPercentage(percentage, monthlyCapacityHours, startDate, endDate) {
  if (!endDate) {
    // Se não há data fim, assumir 1 semana
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }
  
  // Calcular dias úteis no período
  const daysInPeriod = getBusinessDays(startDate, endDate);
  const daysInMonth = 22; // Aproximação: ~22 dias úteis por mês
  
  // Horas disponíveis no período
  const availableHoursInPeriod = (monthlyCapacityHours / daysInMonth) * daysInPeriod;
  
  // Horas alocadas = percentual × horas disponíveis
  return Math.round((percentage / 100) * availableHoursInPeriod);
}

/**
 * Calcula percentual baseado em horas alocadas
 */
function calculatePercentageFromHours(hours, monthlyCapacityHours, startDate, endDate) {
  if (!endDate) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }
  
  const daysInPeriod = getBusinessDays(startDate, endDate);
  const daysInMonth = 22;
  const availableHoursInPeriod = (monthlyCapacityHours / daysInMonth) * daysInPeriod;
  
  if (availableHoursInPeriod === 0) return 0;
  
  return parseFloat(((hours / availableHoursInPeriod) * 100).toFixed(2));
}

async function migrateAllocations() {
  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('🔄 Iniciando migração de dados de alocações...\n');
    
    // Buscar todas as alocações ativas
    console.log('📊 Buscando alocações...');
    const [allocations] = await connection.execute(
      'SELECT id, employeeId, projectId, allocatedHours, allocatedPercentage, startDate, endDate FROM allocations WHERE isActive = 1'
    );
    
    console.log(`✅ Encontradas ${allocations.length} alocações ativas\n`);
    
    if (allocations.length === 0) {
      console.log('ℹ️  Nenhuma alocação encontrada. Nada a migrar.');
      return;
    }
    
    // Buscar todos os colaboradores para obter capacidade mensal
    console.log('👥 Buscando colaboradores...');
    const [employees] = await connection.execute(
      'SELECT id, monthlyCapacityHours FROM employees WHERE isDeleted = 0'
    );
    
    const employeeMap = new Map();
    employees.forEach(emp => {
      employeeMap.set(emp.id, emp.monthlyCapacityHours);
    });
    
    console.log(`✅ Encontrados ${employees.length} colaboradores\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Processar cada alocação
    for (const alloc of allocations) {
      const employeeCapacity = employeeMap.get(alloc.employeeId);
      
      if (!employeeCapacity) {
        console.log(`⚠️  Colaborador ${alloc.employeeId} não encontrado para alocação ${alloc.id}. Pulando...`);
        skipped++;
        continue;
      }
      
      const hasHours = alloc.allocatedHours !== null && alloc.allocatedHours !== undefined;
      const hasPercentage = alloc.allocatedPercentage !== null && alloc.allocatedPercentage !== undefined;
      
      let needsUpdate = false;
      let newHours = alloc.allocatedHours;
      let newPercentage = alloc.allocatedPercentage ? parseFloat(String(alloc.allocatedPercentage)) : null;
      
      // Se tem horas mas não tem percentual, calcular percentual
      if (hasHours && !hasPercentage) {
        const startDate = new Date(alloc.startDate);
        const endDate = alloc.endDate ? new Date(alloc.endDate) : null;
        newPercentage = calculatePercentageFromHours(
          alloc.allocatedHours,
          employeeCapacity,
          startDate,
          endDate
        );
        needsUpdate = true;
        console.log(`  📝 Alocação ${alloc.id}: Calculando percentual (${newPercentage.toFixed(2)}%) a partir de ${alloc.allocatedHours}h`);
      }
      // Se tem percentual mas não tem horas, calcular horas
      else if (hasPercentage && !hasHours) {
        const startDate = new Date(alloc.startDate);
        const endDate = alloc.endDate ? new Date(alloc.endDate) : null;
        newHours = calculateHoursFromPercentage(
          newPercentage,
          employeeCapacity,
          startDate,
          endDate
        );
        needsUpdate = true;
        console.log(`  📝 Alocação ${alloc.id}: Calculando horas (${newHours}h) a partir de ${newPercentage.toFixed(2)}%`);
      }
      // Se não tem nenhum dos dois, erro
      else if (!hasHours && !hasPercentage) {
        console.log(`  ❌ Alocação ${alloc.id}: Não possui horas nem percentual. Pulando...`);
        errors++;
        continue;
      }
      // Se tem ambos, não precisa atualizar
      else {
        skipped++;
        continue;
      }
      
      if (needsUpdate) {
        try {
          await connection.execute(
            'UPDATE allocations SET allocatedHours = ?, allocatedPercentage = ? WHERE id = ?',
            [newHours, newPercentage ? String(newPercentage) : null, alloc.id]
          );
          updated++;
          console.log(`  ✅ Alocação ${alloc.id} atualizada com sucesso`);
        } catch (error) {
          console.error(`  ❌ Erro ao atualizar alocação ${alloc.id}:`, error.message);
          errors++;
        }
      }
    }
    
    console.log(`\n✅ Migração de alocações concluída:`);
    console.log(`   - Atualizadas: ${updated}`);
    console.log(`   - Já completas (puladas): ${skipped}`);
    console.log(`   - Erros: ${errors}\n`);
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Conexão com banco de dados fechada');
    }
  }
}

async function migrateAllocationHistory() {
  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('🔄 Iniciando migração de histórico de alocações...\n');
    
    // Buscar todo o histórico
    console.log('📊 Buscando histórico de alocações...');
    const [history] = await connection.execute(
      'SELECT id, employeeId, projectId, allocatedHours, allocatedPercentage, startDate, endDate FROM allocation_history'
    );
    
    console.log(`✅ Encontrados ${history.length} registros de histórico\n`);
    
    if (history.length === 0) {
      console.log('ℹ️  Nenhum histórico encontrado. Nada a migrar.');
      return;
    }
    
    // Buscar todos os colaboradores para obter capacidade mensal
    console.log('👥 Buscando colaboradores...');
    const [employees] = await connection.execute(
      'SELECT id, monthlyCapacityHours FROM employees WHERE isDeleted = 0'
    );
    
    const employeeMap = new Map();
    employees.forEach(emp => {
      employeeMap.set(emp.id, emp.monthlyCapacityHours);
    });
    
    console.log(`✅ Encontrados ${employees.length} colaboradores\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Processar cada registro de histórico
    for (const record of history) {
      const employeeCapacity = employeeMap.get(record.employeeId);
      
      if (!employeeCapacity) {
        console.log(`⚠️  Colaborador ${record.employeeId} não encontrado para histórico ${record.id}. Pulando...`);
        skipped++;
        continue;
      }
      
      const hasHours = record.allocatedHours !== null && record.allocatedHours !== undefined;
      const hasPercentage = record.allocatedPercentage !== null && record.allocatedPercentage !== undefined;
      
      let needsUpdate = false;
      let newHours = record.allocatedHours;
      let newPercentage = record.allocatedPercentage ? parseFloat(String(record.allocatedPercentage)) : null;
      
      // Se tem horas mas não tem percentual, calcular percentual
      if (hasHours && !hasPercentage) {
        const startDate = new Date(record.startDate);
        const endDate = record.endDate ? new Date(record.endDate) : null;
        newPercentage = calculatePercentageFromHours(
          record.allocatedHours,
          employeeCapacity,
          startDate,
          endDate
        );
        needsUpdate = true;
        console.log(`  📝 Histórico ${record.id}: Calculando percentual (${newPercentage.toFixed(2)}%) a partir de ${record.allocatedHours}h`);
      }
      // Se tem percentual mas não tem horas, calcular horas
      else if (hasPercentage && !hasHours) {
        const startDate = new Date(record.startDate);
        const endDate = record.endDate ? new Date(record.endDate) : null;
        newHours = calculateHoursFromPercentage(
          newPercentage,
          employeeCapacity,
          startDate,
          endDate
        );
        needsUpdate = true;
        console.log(`  📝 Histórico ${record.id}: Calculando horas (${newHours}h) a partir de ${newPercentage.toFixed(2)}%`);
      }
      // Se não tem nenhum dos dois, erro
      else if (!hasHours && !hasPercentage) {
        console.log(`  ❌ Histórico ${record.id}: Não possui horas nem percentual. Pulando...`);
        errors++;
        continue;
      }
      // Se tem ambos, não precisa atualizar
      else {
        skipped++;
        continue;
      }
      
      if (needsUpdate) {
        try {
          await connection.execute(
            'UPDATE allocation_history SET allocatedHours = ?, allocatedPercentage = ? WHERE id = ?',
            [newHours, newPercentage ? String(newPercentage) : null, record.id]
          );
          updated++;
          console.log(`  ✅ Histórico ${record.id} atualizado com sucesso`);
        } catch (error) {
          console.error(`  ❌ Erro ao atualizar histórico ${record.id}:`, error.message);
          errors++;
        }
      }
    }
    
    console.log(`\n✅ Migração de histórico concluída:`);
    console.log(`   - Atualizados: ${updated}`);
    console.log(`   - Já completos (pulados): ${skipped}`);
    console.log(`   - Erros: ${errors}\n`);
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Conexão com banco de dados fechada');
    }
  }
}

async function main() {
  console.log('🚀 Iniciando migração de dados de alocações\n');
  console.log('='.repeat(60));
  console.log('');
  
  // Migrar alocações
  await migrateAllocations();
  
  console.log('='.repeat(60));
  console.log('');
  
  // Migrar histórico
  await migrateAllocationHistory();
  
  console.log('='.repeat(60));
  console.log('\n✨ Migração completa!');
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

