#!/usr/bin/env node

/**
 * Script para criar dados de teste com comentários no histórico
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '.');

config({ path: resolve(projectRoot, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env.local');
  process.exit(1);
}

async function createTestComments() {
  console.log('🔧 Criando dados de teste com comentários...\n');
  console.log('='.repeat(60));
  
  let connection;
  
  try {
    connection = await mysql.createConnection(DATABASE_URL);
    
    // Buscar um employee e project existentes
    const [employees] = await connection.execute(`
      SELECT id FROM employees WHERE isDeleted = false LIMIT 1
    `);
    
    const [projects] = await connection.execute(`
      SELECT id FROM projects WHERE isDeleted = false LIMIT 1
    `);
    
    if (employees.length === 0 || projects.length === 0) {
      console.error('❌ Não há employees ou projects disponíveis.');
      console.log('   Crie pelo menos um employee e um project pela interface primeiro.\n');
      return false;
    }
    
    const employeeId = employees[0].id;
    const projectId = projects[0].id;
    
    console.log(`✅ Usando Employee ID ${employeeId} e Project ID ${projectId}\n`);
    
    // Comentários de teste variados
    const testComments = [
      {
        action: 'created',
        comment: 'Alocação inicial para início do projeto. Necessário para kickoff.',
        allocatedHours: 40,
        allocatedPercentage: '50.00'
      },
      {
        action: 'updated',
        comment: 'Aumento de horas devido a mudanças no escopo do projeto.',
        allocatedHours: 60,
        allocatedPercentage: '75.00'
      },
      {
        action: 'updated',
        comment: 'Redução temporária para atender demanda urgente em outro projeto.',
        allocatedHours: 30,
        allocatedPercentage: '37.50'
      },
      {
        action: 'deleted',
        comment: 'Alocação removida pois o projeto foi cancelado pelo cliente.',
        allocatedHours: 40,
        allocatedPercentage: '50.00'
      },
      {
        action: 'created',
        comment: 'Nova alocação para fase de desenvolvimento. Teste de comentário longo para verificar truncamento no histórico.',
        allocatedHours: 80,
        allocatedPercentage: '100.00'
      },
      {
        action: 'updated',
        comment: 'TESTE DE BUSCA: Este comentário contém palavras-chave para testar a funcionalidade de busca.',
        allocatedHours: 50,
        allocatedPercentage: '62.50'
      }
    ];
    
    console.log(`📝 Inserindo ${testComments.length} registros de teste no histórico...\n`);
    
    let inserted = 0;
    let errors = 0;
    
    for (const testData of testComments) {
      try {
        await connection.execute(`
          INSERT INTO allocation_history 
          (allocationId, employeeId, projectId, allocatedHours, allocatedPercentage, startDate, endDate, action, changedBy, comment, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          null, // allocationId
          employeeId,
          projectId,
          testData.allocatedHours,
          testData.allocatedPercentage,
          new Date(), // startDate
          null, // endDate
          testData.action,
          null, // changedBy
          testData.comment
        ]);
        
        inserted++;
        console.log(`✅ Inserido: ${testData.action} - "${testData.comment.substring(0, 50)}${testData.comment.length > 50 ? '...' : ''}"`);
      } catch (error) {
        errors++;
        console.error(`❌ Erro ao inserir: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Resultado: ${inserted} inseridos, ${errors} erros\n`);
    
    // Verificar se foram inseridos corretamente
    const [verify] = await connection.execute(`
      SELECT COUNT(*) as count FROM allocation_history WHERE comment IS NOT NULL AND comment != ''
    `);
    
    console.log(`✅ Total de registros com comentários no histórico: ${verify[0].count}\n`);
    
    return inserted > 0;
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  const success = await createTestComments();
  
  if (success) {
    console.log('='.repeat(60));
    console.log('\n🎉 Dados de teste criados com sucesso!');
    console.log('\n💡 Agora você pode:');
    console.log('   1. Executar: node test-comments-history.mjs');
    console.log('   2. Acessar a interface web e verificar o histórico');
    console.log('   3. Testar a busca por comentário\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Não foi possível criar dados de teste.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

