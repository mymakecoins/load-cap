import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
const args = process.argv.slice(2);
const DUMP_FILE = args.find(arg => !arg.startsWith('--')) || join(__dirname, 'tmp', 'database-dump-2025-11-08.json');
const CLEAR_TABLES = args.includes('--clear') || args.includes('-c');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado. Configure no arquivo .env');
  process.exit(1);
}

// Função para conectar ao banco
async function getConnection() {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Conectado ao banco de dados');
    return connection;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error.message);
    process.exit(1);
  }
}

// Função para desabilitar foreign key checks
async function disableForeignKeyChecks(connection) {
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
}

// Função para habilitar foreign key checks
async function enableForeignKeyChecks(connection) {
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
}

// Função para limpar tabelas
async function clearTables(connection) {
  console.log('\n🧹 Limpando tabelas existentes...');
  
  await disableForeignKeyChecks(connection);
  
  const tables = [
    'allocation_history',
    'allocations',
    'project_log_entries',
    'projects',
    'employees',
    'clients',
    'users'
  ];
  
  for (const table of tables) {
    try {
      await connection.execute(`TRUNCATE TABLE ${table}`);
      console.log(`  ✓ Tabela ${table} limpa`);
    } catch (error) {
      // Ignora erro se a tabela não existir
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        console.warn(`  ⚠ Erro ao limpar ${table}:`, error.message);
      }
    }
  }
  
  await enableForeignKeyChecks(connection);
  console.log('✅ Tabelas limpas\n');
}

// Função para inserir users
async function insertUsers(connection, users) {
  if (!users || users.length === 0) {
    console.log('⚠ Nenhum usuário encontrado no dump');
    return;
  }
  
  console.log(`📝 Inserindo ${users.length} usuários...`);
  
  for (const user of users) {
    try {
      await connection.execute(
        `INSERT INTO users (id, openId, name, email, phone, passwordHash, loginMethod, role, isActive, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.openId || null,
          user.name || null,
          user.email || null,
          user.phone || null,
          user.passwordHash || null,
          user.loginMethod || null,
          user.role || 'user',
          user.isActive !== undefined ? user.isActive : true,
          user.createdAt ? new Date(user.createdAt) : new Date(),
          user.updatedAt ? new Date(user.updatedAt) : new Date(),
          user.lastSignedIn ? new Date(user.lastSignedIn) : null
        ]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⚠ Usuário ${user.id} já existe, atualizando...`);
        await connection.execute(
          `UPDATE users SET 
            openId = ?, name = ?, email = ?, phone = ?, passwordHash = ?, 
            loginMethod = ?, role = ?, isActive = ?, 
            createdAt = ?, updatedAt = ?, lastSignedIn = ?
           WHERE id = ?`,
          [
            user.openId || null,
            user.name || null,
            user.email || null,
            user.phone || null,
            user.passwordHash || null,
            user.loginMethod || null,
            user.role || 'user',
            user.isActive !== undefined ? user.isActive : true,
            user.createdAt ? new Date(user.createdAt) : new Date(),
            user.updatedAt ? new Date(user.updatedAt) : new Date(),
            user.lastSignedIn ? new Date(user.lastSignedIn) : null,
            user.id
          ]
        );
      } else {
        console.error(`  ❌ Erro ao inserir usuário ${user.id}:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${users.length} usuários processados\n`);
}

// Função para inserir clients
async function insertClients(connection, clients) {
  if (!clients || clients.length === 0) {
    console.log('⚠ Nenhum cliente encontrado no dump');
    return;
  }
  
  console.log(`📝 Inserindo ${clients.length} clientes...`);
  
  for (const client of clients) {
    try {
      await connection.execute(
        `INSERT INTO clients (id, name, email, phone, company, isDeleted, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          client.name || null,
          client.email || null,
          client.phone || null,
          client.company || null,
          client.isDeleted !== undefined ? client.isDeleted : false,
          client.createdAt ? new Date(client.createdAt) : new Date(),
          client.updatedAt ? new Date(client.updatedAt) : new Date()
        ]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⚠ Cliente ${client.id} já existe, atualizando...`);
        await connection.execute(
          `UPDATE clients SET 
            name = ?, email = ?, phone = ?, company = ?, 
            isDeleted = ?, createdAt = ?, updatedAt = ?
           WHERE id = ?`,
          [
            client.name || null,
            client.email || null,
            client.phone || null,
            client.company || null,
            client.isDeleted !== undefined ? client.isDeleted : false,
            client.createdAt ? new Date(client.createdAt) : new Date(),
            client.updatedAt ? new Date(client.updatedAt) : new Date(),
            client.id
          ]
        );
      } else {
        console.error(`  ❌ Erro ao inserir cliente ${client.id}:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${clients.length} clientes processados\n`);
}

// Função para inserir employees
async function insertEmployees(connection, employees) {
  if (!employees || employees.length === 0) {
    console.log('⚠ Nenhum colaborador encontrado no dump');
    return;
  }
  
  console.log(`📝 Inserindo ${employees.length} colaboradores...`);
  
  for (const employee of employees) {
    try {
      await connection.execute(
        `INSERT INTO employees (id, name, email, type, monthlyCapacityHours, isDeleted, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee.id,
          employee.name || null,
          employee.email || null,
          employee.type || null,
          employee.monthlyCapacityHours || 160,
          employee.isDeleted !== undefined ? employee.isDeleted : false,
          employee.createdAt ? new Date(employee.createdAt) : new Date(),
          employee.updatedAt ? new Date(employee.updatedAt) : new Date()
        ]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⚠ Colaborador ${employee.id} já existe, atualizando...`);
        await connection.execute(
          `UPDATE employees SET 
            name = ?, email = ?, type = ?, monthlyCapacityHours = ?, 
            isDeleted = ?, createdAt = ?, updatedAt = ?
           WHERE id = ?`,
          [
            employee.name || null,
            employee.email || null,
            employee.type || null,
            employee.monthlyCapacityHours || 160,
            employee.isDeleted !== undefined ? employee.isDeleted : false,
            employee.createdAt ? new Date(employee.createdAt) : new Date(),
            employee.updatedAt ? new Date(employee.updatedAt) : new Date(),
            employee.id
          ]
        );
      } else {
        console.error(`  ❌ Erro ao inserir colaborador ${employee.id}:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${employees.length} colaboradores processados\n`);
}

// Função para inserir projects
async function insertProjects(connection, projects) {
  if (!projects || projects.length === 0) {
    console.log('⚠ Nenhum projeto encontrado no dump');
    return;
  }
  
  console.log(`📝 Inserindo ${projects.length} projetos...`);
  
  for (const project of projects) {
    try {
      await connection.execute(
        `INSERT INTO projects (id, name, clientId, type, managerId, startDate, plannedEndDate, actualEndDate, 
         plannedProgress, actualProgress, status, isDeleted, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.name || null,
          project.clientId || null,
          project.type || null,
          project.managerId || null,
          project.startDate ? new Date(project.startDate) : null,
          project.plannedEndDate ? new Date(project.plannedEndDate) : null,
          project.actualEndDate ? new Date(project.actualEndDate) : null,
          project.plannedProgress || 0,
          project.actualProgress || 0,
          project.status || 'planejamento',
          project.isDeleted !== undefined ? project.isDeleted : false,
          project.createdAt ? new Date(project.createdAt) : new Date(),
          project.updatedAt ? new Date(project.updatedAt) : new Date()
        ]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⚠ Projeto ${project.id} já existe, atualizando...`);
        await connection.execute(
          `UPDATE projects SET 
            name = ?, clientId = ?, type = ?, managerId = ?, 
            startDate = ?, plannedEndDate = ?, actualEndDate = ?,
            plannedProgress = ?, actualProgress = ?, status = ?, 
            isDeleted = ?, createdAt = ?, updatedAt = ?
           WHERE id = ?`,
          [
            project.name || null,
            project.clientId || null,
            project.type || null,
            project.managerId || null,
            project.startDate ? new Date(project.startDate) : null,
            project.plannedEndDate ? new Date(project.plannedEndDate) : null,
            project.actualEndDate ? new Date(project.actualEndDate) : null,
            project.plannedProgress || 0,
            project.actualProgress || 0,
            project.status || 'planejamento',
            project.isDeleted !== undefined ? project.isDeleted : false,
            project.createdAt ? new Date(project.createdAt) : new Date(),
            project.updatedAt ? new Date(project.updatedAt) : new Date(),
            project.id
          ]
        );
      } else {
        console.error(`  ❌ Erro ao inserir projeto ${project.id}:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${projects.length} projetos processados\n`);
}

// Função para inserir allocations
async function insertAllocations(connection, allocations) {
  if (!allocations || allocations.length === 0) {
    console.log('⚠ Nenhuma alocação encontrada no dump');
    return;
  }
  
  console.log(`📝 Inserindo ${allocations.length} alocações...`);
  
  for (const allocation of allocations) {
    try {
      await connection.execute(
        `INSERT INTO allocations (id, employeeId, projectId, allocatedHours, startDate, endDate, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          allocation.id,
          allocation.employeeId || null,
          allocation.projectId || null,
          allocation.allocatedHours || 0,
          allocation.startDate ? new Date(allocation.startDate) : null,
          allocation.endDate ? new Date(allocation.endDate) : null,
          allocation.isActive !== undefined ? allocation.isActive : true,
          allocation.createdAt ? new Date(allocation.createdAt) : new Date(),
          allocation.updatedAt ? new Date(allocation.updatedAt) : new Date()
        ]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⚠ Alocação ${allocation.id} já existe, atualizando...`);
        await connection.execute(
          `UPDATE allocations SET 
            employeeId = ?, projectId = ?, allocatedHours = ?, 
            startDate = ?, endDate = ?, isActive = ?, 
            createdAt = ?, updatedAt = ?
           WHERE id = ?`,
          [
            allocation.employeeId || null,
            allocation.projectId || null,
            allocation.allocatedHours || 0,
            allocation.startDate ? new Date(allocation.startDate) : null,
            allocation.endDate ? new Date(allocation.endDate) : null,
            allocation.isActive !== undefined ? allocation.isActive : true,
            allocation.createdAt ? new Date(allocation.createdAt) : new Date(),
            allocation.updatedAt ? new Date(allocation.updatedAt) : new Date(),
            allocation.id
          ]
        );
      } else {
        console.error(`  ❌ Erro ao inserir alocação ${allocation.id}:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${allocations.length} alocações processadas\n`);
}

// Função para inserir projectLogEntries
async function insertProjectLogEntries(connection, projectLogEntries) {
  if (!projectLogEntries || projectLogEntries.length === 0) {
    console.log('⚠ Nenhuma entrada de log de projeto encontrada no dump');
    return;
  }
  
  console.log(`📝 Inserindo ${projectLogEntries.length} entradas de log de projeto...`);
  
  for (const entry of projectLogEntries) {
    try {
      await connection.execute(
        `INSERT INTO project_log_entries (id, projectId, userId, title, content, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.projectId || null,
          entry.userId || null,
          entry.title || null,
          entry.content || null,
          entry.createdAt ? new Date(entry.createdAt) : new Date(),
          entry.updatedAt ? new Date(entry.updatedAt) : new Date()
        ]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⚠ Entrada de log ${entry.id} já existe, atualizando...`);
        await connection.execute(
          `UPDATE project_log_entries SET 
            projectId = ?, userId = ?, title = ?, content = ?, 
            createdAt = ?, updatedAt = ?
           WHERE id = ?`,
          [
            entry.projectId || null,
            entry.userId || null,
            entry.title || null,
            entry.content || null,
            entry.createdAt ? new Date(entry.createdAt) : new Date(),
            entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
            entry.id
          ]
        );
      } else {
        console.error(`  ❌ Erro ao inserir entrada de log ${entry.id}:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${projectLogEntries.length} entradas de log processadas\n`);
}

// Função principal
async function seedDatabase() {
  let connection;
  
  try {
    // Ler arquivo JSON
    console.log(`📂 Lendo arquivo: ${DUMP_FILE}`);
    const dumpData = JSON.parse(readFileSync(DUMP_FILE, 'utf-8'));
    console.log(`✅ Arquivo lido com sucesso`);
    console.log(`📊 Dados exportados em: ${dumpData.exportedAt || 'N/A'}\n`);
    
    // Conectar ao banco
    connection = await getConnection();
    
    // Limpar tabelas se solicitado
    if (CLEAR_TABLES) {
      await clearTables(connection);
    } else {
      console.log('ℹ️  Tabelas não serão limpas (use --clear para limpar antes de inserir)\n');
    }
    
    // Inserir dados na ordem correta (respeitando foreign keys)
    if (dumpData.tables) {
      if (dumpData.tables.users) {
        await insertUsers(connection, dumpData.tables.users);
      }
      
      if (dumpData.tables.clients) {
        await insertClients(connection, dumpData.tables.clients);
      }
      
      if (dumpData.tables.employees) {
        await insertEmployees(connection, dumpData.tables.employees);
      }
      
      if (dumpData.tables.projects) {
        await insertProjects(connection, dumpData.tables.projects);
      }
      
      if (dumpData.tables.allocations) {
        await insertAllocations(connection, dumpData.tables.allocations);
      }
      
      if (dumpData.tables.projectLogEntries) {
        await insertProjectLogEntries(connection, dumpData.tables.projectLogEntries);
      }
    }
    
    console.log('✅ Seed concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Conexão com banco de dados fechada');
    }
  }
}

// Executar seed
seedDatabase();

