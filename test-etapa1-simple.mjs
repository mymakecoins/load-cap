#!/usr/bin/env node

/**
 * Script de teste simplificado para validar a implementação da Etapa 1: Comentários
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '.');

config({ path: resolve(projectRoot, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

async function testDatabase() {
  console.log('📊 Testando banco de dados...');
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    const [columns] = await connection.execute(`DESCRIBE allocation_history`);
    const commentColumn = columns.find((col) => col.Field === 'comment');
    await connection.end();
    
    if (commentColumn && commentColumn.Type === 'text' && commentColumn.Null === 'YES') {
      console.log('   ✅ Coluna comment existe e está correta (text, NULL)');
      return true;
    }
    console.log('   ❌ Coluna comment não encontrada ou incorreta');
    return false;
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
    return false;
  }
}

function testFile(filePath, checks) {
  console.log(`\n📄 Testando ${filePath}...`);
  try {
    const content = readFileSync(resolve(projectRoot, filePath), 'utf-8');
    let allPassed = true;
    
    checks.forEach(({ name, pattern }) => {
      const found = pattern.test(content);
      if (found) {
        console.log(`   ✅ ${name}`);
      } else {
        console.log(`   ❌ ${name}`);
        allPassed = false;
      }
    });
    
    return allPassed;
  } catch (error) {
    console.log(`   ❌ Erro ao ler arquivo: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Testando Etapa 1: Comentários\n');
  console.log('='.repeat(60));
  
  const results = {
    database: await testDatabase(),
    
    schema: testFile('drizzle/schema.ts', [
      { name: 'Campo comment no schema', pattern: /comment:\s*text\("comment"\)/ }
    ]),
    
    backend: testFile('server/routers.ts', [
      { name: 'comment no input create', pattern: /create:.*?comment:\s*z\.string\(\)\.max\(500\)\.optional\(\)/s },
      { name: 'comment no input update', pattern: /update:.*?comment:\s*z\.string\(\)\.max\(500\)\.optional\(\)/s },
      { name: 'comment no input delete', pattern: /delete:.*?comment:\s*z\.string\(\)\.max\(500\)\.optional\(\)/s },
      { name: 'comment passado no createAllocationHistory (create)', pattern: /action:\s*"created".*?comment:\s*input\.comment/s },
      { name: 'comment passado no createAllocationHistory (update)', pattern: /action:\s*"updated".*?comment:\s*input\.comment/s },
      { name: 'comment passado no createAllocationHistory (delete)', pattern: /action:\s*"deleted".*?comment:\s*input\.comment/s }
    ]),
    
    allocations: testFile('client/src/pages/Allocations.tsx', [
      { name: 'Import Textarea', pattern: /import.*Textarea.*from.*@\/components\/ui\/textarea/ },
      { name: 'Estado comment', pattern: /const\s+\[comment,\s*setComment\]\s*=\s*useState/ },
      { name: 'Estado editComment', pattern: /const\s+\[editComment,\s*setEditComment\]\s*=\s*useState/ },
      { name: 'Estado deleteComment', pattern: /const\s+\[deleteComment,\s*setDeleteComment\]\s*=\s*useState/ },
      { name: 'Textarea no formulário de criação', pattern: /id="comment".*?Textarea/s },
      { name: 'Textarea no formulário de edição', pattern: /id="edit-comment".*?Textarea/s },
      { name: 'Textarea no AlertDialog de deleção', pattern: /id="delete-comment"/ },
      { name: 'Passar comment na mutation create', pattern: /data\.comment\s*=\s*comment/ },
      { name: 'Passar comment na mutation update', pattern: /updateData\.comment\s*=\s*editComment/ },
      { name: 'Passar comment na mutation delete', pattern: /deleteData\.comment\s*=\s*deleteComment/ }
    ]),
    
    history: testFile('client/src/pages/AllocationHistory.tsx', [
      { name: 'Import Tooltip', pattern: /from.*@\/components\/ui\/tooltip/ },
      { name: 'Estado searchComment', pattern: /const\s+\[searchComment,\s*setSearchComment\]\s*=\s*useState/ },
      { name: 'Campo de busca', pattern: /id="comment-search"/ },
      { name: 'Filtro por comentário', pattern: /if\s*\(searchComment\).*?filter.*comment/s },
      { name: 'Coluna Comentário na tabela', pattern: /<TableHead>Comentário<\/TableHead>/ },
      { name: 'Exibição com Tooltip', pattern: /record\.comment.*?Tooltip/s }
    ])
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumo:\n');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASSOU' : 'FALHOU'}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('\n🎉 Todos os testes passaram!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique acima.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

