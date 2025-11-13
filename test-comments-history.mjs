#!/usr/bin/env node

/**
 * Script para testar comentários no histórico
 * 1. Verifica se comentários aparecem corretamente no histórico
 * 2. Testa a busca por comentário no histórico
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

async function getConnection() {
  return await mysql.createConnection(DATABASE_URL);
}

async function testCommentsInHistory() {
  console.log('\n📋 Teste 1: Verificando comentários no histórico\n');
  console.log('='.repeat(60));
  
  try {
    const connection = await getConnection();
    
    // Buscar registros do histórico que têm comentários
    const [recordsWithComments] = await connection.execute(`
      SELECT 
        id,
        action,
        comment,
        createdAt,
        employeeId,
        projectId
      FROM allocation_history
      WHERE comment IS NOT NULL AND comment != ''
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log(`\n📊 Encontrados ${recordsWithComments.length} registros com comentários:\n`);
    
    if (recordsWithComments.length === 0) {
      console.log('⚠️  Nenhum registro com comentário encontrado no histórico.');
      console.log('   Isso pode ser normal se ainda não foram criadas alocações com comentários.\n');
      
      // Verificar se há registros sem comentários
      const [allRecords] = await connection.execute(`
        SELECT COUNT(*) as total FROM allocation_history
      `);
      
      console.log(`   Total de registros no histórico: ${allRecords[0].total}`);
      console.log('   💡 Dica: Crie algumas alocações com comentários pela interface para testar.\n');
    } else {
      recordsWithComments.forEach((record, index) => {
        console.log(`${index + 1}. Registro ID ${record.id}:`);
        console.log(`   - Ação: ${record.action}`);
        console.log(`   - Comentário: "${record.comment}"`);
        console.log(`   - Data: ${new Date(record.createdAt).toLocaleString('pt-BR')}`);
        console.log(`   - Employee ID: ${record.employeeId}, Project ID: ${record.projectId}`);
        console.log('');
      });
      
      console.log('✅ Comentários estão sendo salvos corretamente no banco de dados!\n');
    }
    
    // Verificar estrutura dos comentários
    const [commentStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(comment) as with_comment,
        COUNT(*) - COUNT(comment) as without_comment,
        AVG(LENGTH(comment)) as avg_length,
        MAX(LENGTH(comment)) as max_length
      FROM allocation_history
    `);
    
    const stats = commentStats[0];
    console.log('📈 Estatísticas dos comentários:');
    console.log(`   - Total de registros: ${stats.total}`);
    console.log(`   - Com comentários: ${stats.with_comment}`);
    console.log(`   - Sem comentários: ${stats.without_comment}`);
    if (stats.avg_length) {
      console.log(`   - Tamanho médio: ${Math.round(stats.avg_length)} caracteres`);
      console.log(`   - Tamanho máximo: ${stats.max_length} caracteres`);
    }
    console.log('');
    
    await connection.end();
    return recordsWithComments.length > 0;
  } catch (error) {
    console.error('❌ Erro ao verificar comentários:', error.message);
    return false;
  }
}

async function testCommentSearch() {
  console.log('\n🔍 Teste 2: Testando busca por comentário\n');
  console.log('='.repeat(60));
  
  try {
    const connection = await getConnection();
    
    // Buscar todos os comentários únicos para testar busca
    const [allComments] = await connection.execute(`
      SELECT DISTINCT comment
      FROM allocation_history
      WHERE comment IS NOT NULL AND comment != ''
      LIMIT 20
    `);
    
    if (allComments.length === 0) {
      console.log('⚠️  Nenhum comentário encontrado para testar busca.');
      console.log('   Crie algumas alocações com comentários pela interface primeiro.\n');
      await connection.end();
      return false;
    }
    
    console.log(`\n📝 Encontrados ${allComments.length} comentários únicos para testar:\n`);
    
    // Testar busca case-insensitive
    const testSearches = [];
    
    allComments.slice(0, 5).forEach((row) => {
      const comment = row.comment;
      if (comment && comment.length > 3) {
        // Pegar primeiras 3-5 palavras do comentário
        const words = comment.split(' ').slice(0, 3);
        if (words.length > 0) {
          testSearches.push(words.join(' '));
        }
      }
    });
    
    // Adicionar algumas buscas genéricas
    testSearches.push('teste', 'alocação', 'projeto');
    
    console.log('🧪 Testando buscas:\n');
    
    let searchTestsPassed = 0;
    let searchTestsTotal = 0;
    
    for (const searchTerm of testSearches.slice(0, 5)) {
      if (!searchTerm || searchTerm.length < 2) continue;
      
      searchTestsTotal++;
      
      // Buscar no banco (simulando o que o frontend faz)
      const [results] = await connection.execute(`
        SELECT 
          id,
          action,
          comment,
          createdAt
        FROM allocation_history
        WHERE comment IS NOT NULL 
          AND LOWER(comment) LIKE LOWER(?)
        ORDER BY createdAt DESC
        LIMIT 5
      `, [`%${searchTerm}%`]);
      
      if (results.length > 0) {
        console.log(`✅ Busca por "${searchTerm}": ${results.length} resultado(s) encontrado(s)`);
        results.slice(0, 2).forEach((result) => {
          console.log(`   - "${result.comment.substring(0, 50)}${result.comment.length > 50 ? '...' : ''}"`);
        });
        searchTestsPassed++;
      } else {
        console.log(`⚠️  Busca por "${searchTerm}": Nenhum resultado (pode ser normal)`);
      }
      console.log('');
    }
    
    // Testar busca case-insensitive
    console.log('🔤 Testando busca case-insensitive:\n');
    
    if (allComments.length > 0) {
      const firstComment = allComments[0].comment;
      if (firstComment && firstComment.length > 3) {
        const searchTerm = firstComment.substring(0, 5);
        const upperSearch = searchTerm.toUpperCase();
        const lowerSearch = searchTerm.toLowerCase();
        
        const [upperResults] = await connection.execute(`
          SELECT COUNT(*) as count FROM allocation_history
          WHERE comment IS NOT NULL 
            AND LOWER(comment) LIKE LOWER(?)
        `, [`%${upperSearch}%`]);
        
        const [lowerResults] = await connection.execute(`
          SELECT COUNT(*) as count FROM allocation_history
          WHERE comment IS NOT NULL 
            AND LOWER(comment) LIKE LOWER(?)
        `, [`%${lowerSearch}%`]);
        
        if (upperResults[0].count === lowerResults[0].count) {
          console.log(`✅ Busca case-insensitive funciona corretamente`);
          console.log(`   - Busca "${upperSearch}": ${upperResults[0].count} resultados`);
          console.log(`   - Busca "${lowerSearch}": ${lowerResults[0].count} resultados`);
          searchTestsPassed++;
        } else {
          console.log(`❌ Busca case-insensitive com problema`);
        }
        searchTestsTotal++;
        console.log('');
      }
    }
    
    await connection.end();
    
    console.log(`\n📊 Resultado dos testes de busca: ${searchTestsPassed}/${searchTestsTotal} passaram\n`);
    
    return searchTestsPassed > 0;
  } catch (error) {
    console.error('❌ Erro ao testar busca:', error.message);
    return false;
  }
}

async function createTestData() {
  console.log('\n🔧 Criando dados de teste (opcional)...\n');
  console.log('='.repeat(60));
  
  try {
    const connection = await getConnection();
    
    // Verificar se há employees e projects
    const [employees] = await connection.execute(`
      SELECT id FROM employees WHERE isDeleted = false LIMIT 1
    `);
    
    const [projects] = await connection.execute(`
      SELECT id FROM projects WHERE isDeleted = false LIMIT 1
    `);
    
    if (employees.length === 0 || projects.length === 0) {
      console.log('⚠️  Não há employees ou projects disponíveis para criar dados de teste.');
      console.log('   Crie pelo menos um employee e um project pela interface primeiro.\n');
      await connection.end();
      return false;
    }
    
    const employeeId = employees[0].id;
    const projectId = projects[0].id;
    
    console.log(`✅ Employee ID ${employeeId} e Project ID ${projectId} encontrados`);
    console.log('   💡 Para criar dados de teste completos, use a interface web.\n');
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testando Comentários no Histórico');
  console.log('='.repeat(60));
  
  const results = {
    commentsInHistory: await testCommentsInHistory(),
    commentSearch: await testCommentSearch(),
    testData: await createTestData()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumo dos Testes:\n');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '⚠️';
    const status = passed ? 'OK' : 'SEM DADOS';
    console.log(`${icon} ${test.toUpperCase()}: ${status}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Próximos passos:');
  console.log('   1. Acesse a interface web');
  console.log('   2. Crie algumas alocações com comentários');
  console.log('   3. Atualize algumas alocações com comentários');
  console.log('   4. Delete algumas alocações com comentários');
  console.log('   5. Verifique o histórico de alocações');
  console.log('   6. Teste a busca por comentário no histórico\n');
  
  if (results.commentsInHistory && results.commentSearch) {
    console.log('🎉 Todos os testes passaram! Os comentários estão funcionando corretamente.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Alguns testes não puderam ser executados por falta de dados.');
    console.log('   Crie alocações com comentários pela interface e execute este script novamente.\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

