import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '.');

// Carrega variáveis de ambiente
config({ path: resolve(projectRoot, '.env.local') });

console.log('🔍 Validando Implementações da Etapa 5');
console.log('='.repeat(60));
console.log('');

const validations = {
  schema: false,
  dbFunctions: false,
  routers: false,
  frontendComponents: false,
  routes: false,
};

// Teste 1: Verificar schema
console.log('📋 Teste 1: Verificando schema do banco de dados...');
try {
  const schemaPath = resolve(projectRoot, 'drizzle/schema.ts');
  if (existsSync(schemaPath)) {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    
    const hasNotifications = schemaContent.includes('export const notifications');
    const hasNotificationPreferences = schemaContent.includes('export const notificationPreferences');
    const hasNotificationType = schemaContent.includes('export type Notification');
    const hasPreferenceType = schemaContent.includes('export type NotificationPreference');
    
    if (hasNotifications && hasNotificationPreferences && hasNotificationType && hasPreferenceType) {
      console.log('   ✅ Tabela notifications definida');
      console.log('   ✅ Tabela notification_preferences definida');
      console.log('   ✅ Types exportados corretamente');
      validations.schema = true;
    } else {
      console.log('   ❌ Faltam definições no schema');
    }
  } else {
    console.log('   ❌ Arquivo schema.ts não encontrado');
  }
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Teste 2: Verificar funções no db.ts
console.log('\n📋 Teste 2: Verificando funções em server/db.ts...');
try {
  const dbPath = resolve(projectRoot, 'server/db.ts');
  if (existsSync(dbPath)) {
    const dbContent = readFileSync(dbPath, 'utf-8');
    
    const functions = [
      'createNotification',
      'getNotificationsByUserId',
      'getUnreadNotificationCount',
      'markNotificationAsRead',
      'deleteNotification',
      'getNotificationPreferences',
      'updateNotificationPreferences',
    ];
    
    const allFound = functions.every(fn => dbContent.includes(`export async function ${fn}`));
    
    if (allFound) {
      console.log('   ✅ Todas as funções de notificação encontradas:');
      functions.forEach(fn => console.log(`      - ${fn}`));
      validations.dbFunctions = true;
    } else {
      const missing = functions.filter(fn => !dbContent.includes(`export async function ${fn}`));
      console.log(`   ❌ Funções faltando: ${missing.join(', ')}`);
    }
    
    // Verificar imports
    const hasNotificationsImport = dbContent.includes('notifications, notificationPreferences');
    const hasSqlImport = dbContent.includes('import { eq, and, or, desc, ne, isNull, asc, sql }');
    
    if (hasNotificationsImport && hasSqlImport) {
      console.log('   ✅ Imports corretos');
    } else {
      console.log('   ⚠️  Verificar imports');
    }
  } else {
    console.log('   ❌ Arquivo db.ts não encontrado');
  }
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Teste 3: Verificar routers
console.log('\n📋 Teste 3: Verificando routers em server/routers.ts...');
try {
  const routersPath = resolve(projectRoot, 'server/routers.ts');
  if (existsSync(routersPath)) {
    const routersContent = readFileSync(routersPath, 'utf-8');
    
    // Verificar router de notificações
    const hasNotificationsRouter = routersContent.includes('notifications: router({');
    const hasListProcedure = routersContent.includes('list: protectedProcedure');
    const hasUnreadCountProcedure = routersContent.includes('unreadCount: protectedProcedure');
    const hasMarkAsReadProcedure = routersContent.includes('markAsRead: protectedProcedure');
    const hasDeleteProcedure = routersContent.includes('delete: protectedProcedure');
    const hasPreferencesProcedure = routersContent.includes('preferences: protectedProcedure');
    const hasUpdatePreferencesProcedure = routersContent.includes('updatePreferences: protectedProcedure');
    
    if (hasNotificationsRouter && hasListProcedure && hasUnreadCountProcedure && 
        hasMarkAsReadProcedure && hasDeleteProcedure && hasPreferencesProcedure && 
        hasUpdatePreferencesProcedure) {
      console.log('   ✅ Router de notificações completo');
      console.log('      - list');
      console.log('      - unreadCount');
      console.log('      - markAsRead');
      console.log('      - delete');
      console.log('      - preferences');
      console.log('      - updatePreferences');
      validations.routers = true;
    } else {
      console.log('   ❌ Router de notificações incompleto');
    }
    
    // Verificar criação de notificações nas mutations
    const hasCreateNotification = routersContent.includes('allocation_created');
    const hasUpdateNotification = routersContent.includes('allocation_updated');
    const hasDeleteNotification = routersContent.includes('allocation_deleted');
    
    if (hasCreateNotification && hasUpdateNotification && hasDeleteNotification) {
      console.log('   ✅ Notificações sendo criadas em:');
      console.log('      - allocations.create');
      console.log('      - allocations.update');
      console.log('      - allocations.delete');
    } else {
      console.log('   ⚠️  Verificar criação de notificações nas mutations');
    }
  } else {
    console.log('   ❌ Arquivo routers.ts não encontrado');
  }
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Teste 4: Verificar componentes frontend
console.log('\n📋 Teste 4: Verificando componentes frontend...');
try {
  // NotificationBell
  const bellPath = resolve(projectRoot, 'client/src/components/NotificationBell.tsx');
  if (existsSync(bellPath)) {
    const bellContent = readFileSync(bellPath, 'utf-8');
    
    const hasBellComponent = bellContent.includes('export function NotificationBell');
    const hasTrpcQueries = bellContent.includes('trpc.notifications.list.useQuery');
    const hasUnreadCount = bellContent.includes('trpc.notifications.unreadCount.useQuery');
    const hasMarkAsRead = bellContent.includes('trpc.notifications.markAsRead.useMutation');
    const hasDelete = bellContent.includes('trpc.notifications.delete.useMutation');
    
    if (hasBellComponent && hasTrpcQueries && hasUnreadCount && hasMarkAsRead && hasDelete) {
      console.log('   ✅ Componente NotificationBell encontrado');
      console.log('      - Queries tRPC configuradas');
      console.log('      - Mutations configuradas');
    } else {
      console.log('   ⚠️  NotificationBell incompleto');
    }
  } else {
    console.log('   ❌ NotificationBell.tsx não encontrado');
  }
  
  // NotificationPreferences
  const prefsPath = resolve(projectRoot, 'client/src/pages/NotificationPreferences.tsx');
  if (existsSync(prefsPath)) {
    const prefsContent = readFileSync(prefsPath, 'utf-8');
    
    const hasPrefsComponent = prefsContent.includes('export default function NotificationPreferences');
    const hasPreferencesQuery = prefsContent.includes('trpc.notifications.preferences.useQuery');
    const hasUpdateMutation = prefsContent.includes('trpc.notifications.updatePreferences.useMutation');
    
    if (hasPrefsComponent && hasPreferencesQuery && hasUpdateMutation) {
      console.log('   ✅ Página NotificationPreferences encontrada');
      console.log('      - Query de preferências configurada');
      console.log('      - Mutation de atualização configurada');
    } else {
      console.log('   ⚠️  NotificationPreferences incompleta');
    }
  } else {
    console.log('   ❌ NotificationPreferences.tsx não encontrado');
  }
  
  // DashboardLayout
  const layoutPath = resolve(projectRoot, 'client/src/components/DashboardLayout.tsx');
  if (existsSync(layoutPath)) {
    const layoutContent = readFileSync(layoutPath, 'utf-8');
    
    const hasImport = layoutContent.includes('import { NotificationBell }');
    const hasUsage = layoutContent.includes('<NotificationBell />');
    
    if (hasImport && hasUsage) {
      console.log('   ✅ NotificationBell integrado ao DashboardLayout');
      validations.frontendComponents = true;
    } else {
      console.log('   ⚠️  NotificationBell não integrado ao DashboardLayout');
    }
  } else {
    console.log('   ❌ DashboardLayout.tsx não encontrado');
  }
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Teste 5: Verificar rotas
console.log('\n📋 Teste 5: Verificando rotas...');
try {
  const appPath = resolve(projectRoot, 'client/src/App.tsx');
  if (existsSync(appPath)) {
    const appContent = readFileSync(appPath, 'utf-8');
    
    const hasImport = appContent.includes('import NotificationPreferences');
    const hasRoute = appContent.includes('/configuracoes/notificacoes');
    
    if (hasImport && hasRoute) {
      console.log('   ✅ Rota de preferências configurada');
      console.log('      - /configuracoes/notificacoes');
      validations.routes = true;
    } else {
      console.log('   ⚠️  Rota de preferências não encontrada');
    }
  } else {
    console.log('   ❌ App.tsx não encontrado');
  }
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Resumo
console.log('\n' + '='.repeat(60));
console.log('\n📊 Resumo da Validação:\n');

Object.entries(validations).forEach(([test, passed]) => {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'OK' : 'FALHOU';
  const testName = test
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
  console.log(`${icon} ${testName}: ${status}`);
});

const allPassed = Object.values(validations).every(v => v);

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('\n🎉 Todas as validações passaram!');
  console.log('\n✅ Implementação completa e correta.');
  console.log('\n💡 Próximos passos:');
  console.log('   1. Execute: node test-etapa5-notifications.mjs (testes de banco)');
  console.log('   2. Inicie o servidor: pnpm dev');
  console.log('   3. Teste manualmente na interface web\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Algumas validações falharam.');
  console.log('   Revise os arquivos mencionados acima.\n');
  process.exit(1);
}

