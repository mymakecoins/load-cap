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
 * Obtém a próxima segunda-feira a partir de hoje
 */
function getNextMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  
  // Se hoje é domingo (0), a próxima segunda é amanhã
  // Se hoje é segunda (1), a próxima segunda é hoje
  // Caso contrário, calcular dias até a próxima segunda
  let daysUntilMonday;
  if (dayOfWeek === 0) {
    daysUntilMonday = 1;
  } else if (dayOfWeek === 1) {
    daysUntilMonday = 0;
  } else {
    daysUntilMonday = 8 - dayOfWeek; // Dias até a próxima segunda
  }
  
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  return nextMonday;
}

/**
 * Obtém as datas de início e fim de uma semana (segunda a sexta)
 */
function getWeekDates(weekOffset = 0) {
  const monday = getNextMonday();
  monday.setDate(monday.getDate() + (weekOffset * 7));
  
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Segunda + 4 dias = Sexta
  friday.setHours(23, 59, 59, 999);
  
  return {
    startDate: monday,
    endDate: friday,
  };
}

/**
 * Formata data para exibição
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function seedAllocations2Weeks() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Conectado ao banco de dados\n');
    
    // Buscar projetos ativos
    console.log('📋 Buscando projetos ativos...');
    const [projects] = await connection.execute(
      'SELECT id, name, status FROM projects WHERE isDeleted = 0 AND status != "concluido"'
    );
    console.log(`✅ Encontrados ${projects.length} projeto(s) ativo(s)\n`);
    
    if (projects.length === 0) {
      console.log('⚠️  Nenhum projeto ativo encontrado. Crie projetos antes de executar este script.');
      return;
    }
    
    // Buscar desenvolvedores (excluindo managers)
    console.log('👥 Buscando desenvolvedores...');
    const [employees] = await connection.execute(
      `SELECT id, name, type, monthlyCapacityHours 
       FROM employees 
       WHERE isDeleted = 0 
       AND type IN ('backend', 'frontend', 'mobile', 'fullstack', 'qa', 'requirements_analyst')`
    );
    console.log(`✅ Encontrados ${employees.length} desenvolvedor(es)\n`);
    
    if (employees.length === 0) {
      console.log('⚠️  Nenhum desenvolvedor encontrado. Crie desenvolvedores antes de executar este script.');
      return;
    }
    
    // Obter datas das próximas 2 semanas
    const week1 = getWeekDates(0);
    const week2 = getWeekDates(1);
    
    console.log('📅 Período de alocações:');
    console.log(`   Semana 1: ${formatDate(week1.startDate)} a ${formatDate(week1.endDate)}`);
    console.log(`   Semana 2: ${formatDate(week2.startDate)} a ${formatDate(week2.endDate)}\n`);
    
    let totalAllocationsCreated = 0;
    let totalAllocationsSkipped = 0;
    
    // Para cada projeto
    for (const project of projects) {
      console.log(`\n📦 Projeto: ${project.name} (ID: ${project.id})`);
      
      // Selecionar aleatoriamente 2-5 desenvolvedores para este projeto
      const numEmployees = Math.min(
        Math.floor(Math.random() * 4) + 2, // 2-5 desenvolvedores
        employees.length
      );
      
      // Embaralhar e selecionar desenvolvedores
      const shuffled = [...employees].sort(() => Math.random() - 0.5);
      const selectedEmployees = shuffled.slice(0, numEmployees);
      
      console.log(`   Alocando ${selectedEmployees.length} desenvolvedor(es)...`);
      
      // Criar alocações para cada desenvolvedor selecionado
      for (const employee of selectedEmployees) {
        // Calcular horas semanais (8-40h por semana, respeitando capacidade mensal)
        // Capacidade mensal padrão: 160h = ~40h/semana
        const maxWeeklyHours = Math.min(40, Math.floor(employee.monthlyCapacityHours / 4));
        const minWeeklyHours = Math.max(8, Math.floor(maxWeeklyHours * 0.2)); // Mínimo 20% da capacidade
        
        const week1Hours = Math.floor(Math.random() * (maxWeeklyHours - minWeeklyHours + 1)) + minWeeklyHours;
        const week2Hours = Math.floor(Math.random() * (maxWeeklyHours - minWeeklyHours + 1)) + minWeeklyHours;
        
        // Semana 1
        try {
          // Verificar se já existe alocação para este período
          const [existing1] = await connection.execute(
            `SELECT id FROM allocations 
             WHERE employeeId = ? 
             AND projectId = ? 
             AND startDate <= ? 
             AND (endDate >= ? OR endDate IS NULL)
             AND isActive = 1`,
            [employee.id, project.id, week1.endDate, week1.startDate]
          );
          
          if (existing1.length === 0) {
            await connection.execute(
              `INSERT INTO allocations 
               (employeeId, projectId, allocatedHours, startDate, endDate, isActive) 
               VALUES (?, ?, ?, ?, ?, 1)`,
              [
                employee.id,
                project.id,
                week1Hours,
                week1.startDate,
                week1.endDate,
              ]
            );
            totalAllocationsCreated++;
            console.log(`     ✓ ${employee.name} (${employee.type}): ${week1Hours}h na semana 1`);
          } else {
            totalAllocationsSkipped++;
            console.log(`     ⚠ ${employee.name}: já possui alocação na semana 1`);
          }
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            totalAllocationsSkipped++;
            console.log(`     ⚠ ${employee.name}: alocação duplicada na semana 1`);
          } else {
            console.error(`     ❌ Erro ao criar alocação para ${employee.name} (semana 1):`, error.message);
          }
        }
        
        // Semana 2
        try {
          // Verificar se já existe alocação para este período
          const [existing2] = await connection.execute(
            `SELECT id FROM allocations 
             WHERE employeeId = ? 
             AND projectId = ? 
             AND startDate <= ? 
             AND (endDate >= ? OR endDate IS NULL)
             AND isActive = 1`,
            [employee.id, project.id, week2.endDate, week2.startDate]
          );
          
          if (existing2.length === 0) {
            await connection.execute(
              `INSERT INTO allocations 
               (employeeId, projectId, allocatedHours, startDate, endDate, isActive) 
               VALUES (?, ?, ?, ?, ?, 1)`,
              [
                employee.id,
                project.id,
                week2Hours,
                week2.startDate,
                week2.endDate,
              ]
            );
            totalAllocationsCreated++;
            console.log(`     ✓ ${employee.name} (${employee.type}): ${week2Hours}h na semana 2`);
          } else {
            totalAllocationsSkipped++;
            console.log(`     ⚠ ${employee.name}: já possui alocação na semana 2`);
          }
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            totalAllocationsSkipped++;
            console.log(`     ⚠ ${employee.name}: alocação duplicada na semana 2`);
          } else {
            console.error(`     ❌ Erro ao criar alocação para ${employee.name} (semana 2):`, error.message);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumo:');
    console.log(`   ✅ Alocações criadas: ${totalAllocationsCreated}`);
    console.log(`   ⚠️  Alocações ignoradas (já existentes): ${totalAllocationsSkipped}`);
    console.log('='.repeat(60));
    
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
seedAllocations2Weeks();

