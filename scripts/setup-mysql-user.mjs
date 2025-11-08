/**
 * Script para configurar usuário MySQL com autenticação por senha
 * 
 * Execute este script com sudo:
 * sudo node scripts/setup-mysql-user.mjs
 * 
 * Ou execute os comandos SQL manualmente:
 */

const mysqlCommands = `
-- Criar usuário se não existir (ou usar root existente)
CREATE USER IF NOT EXISTS 'team_management'@'localhost' IDENTIFIED BY 'team_management_password';

-- Dar todas as permissões no banco team_management
GRANT ALL PRIVILEGES ON team_management.* TO 'team_management'@'localhost';

-- Ou, se quiser usar root com senha:
-- ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
-- FLUSH PRIVILEGES;

-- Aplicar mudanças
FLUSH PRIVILEGES;

-- Verificar usuários
SELECT user, host, plugin FROM mysql.user WHERE user IN ('root', 'team_management');
`;

console.log('═══════════════════════════════════════════════════════════');
console.log('Script de Configuração MySQL');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('OPÇÃO 1: Criar novo usuário (Recomendado)');
console.log('───────────────────────────────────────────────────────────');
console.log('Execute no MySQL (com sudo mysql):');
console.log('');
console.log(mysqlCommands);
console.log('');
console.log('Depois atualize o .env.local com:');
console.log('DATABASE_URL=mysql://team_management:team_management_password@localhost:3306/team_management');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('OPÇÃO 2: Alterar root para usar senha');
console.log('───────────────────────────────────────────────────────────');
console.log('Execute no MySQL (com sudo mysql):');
console.log('');
console.log(`ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';`);
console.log(`FLUSH PRIVILEGES;`);
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('Como executar:');
console.log('───────────────────────────────────────────────────────────');
console.log('1. Conecte ao MySQL:');
console.log('   sudo mysql');
console.log('');
console.log('2. Execute os comandos SQL acima');
console.log('');
console.log('3. Atualize o arquivo .env.local com a URL correta');
console.log('');

