import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '.');

console.log('🔍 Teste Detalhado - Etapa 5: Comparação com Especificação');
console.log('='.repeat(70));
console.log('');

const results = {
  schema: { passed: 0, total: 0, details: [] },
  dbFunctions: { passed: 0, total: 0, details: [] },
  routers: { passed: 0, total: 0, details: [] },
  frontend: { passed: 0, total: 0, details: [] },
};

// Teste 1: Schema - Verificar campos exatos
console.log('📋 Teste 1: Schema do Banco de Dados');
console.log('-'.repeat(70));

try {
  const schemaPath = resolve(projectRoot, 'drizzle/schema.ts');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  
  // Verificar tabela notifications
  const notificationsChecks = [
    { name: 'Tabela notifications existe', check: schemaContent.includes('export const notifications = mysqlTable("notifications"') },
    { name: 'Campo id com autoincrement', check: schemaContent.includes('id: int("id").autoincrement().primaryKey()') },
    { name: 'Campo userId', check: schemaContent.includes('userId: int("userId").notNull()') },
    { name: 'Campo type com enum correto', check: schemaContent.includes('"allocation_created"') && schemaContent.includes('"allocation_updated"') && schemaContent.includes('"allocation_deleted"') && schemaContent.includes('"allocation_reverted"') },
    { name: 'Campo title', check: schemaContent.includes('title: varchar("title"') },
    { name: 'Campo message', check: schemaContent.includes('message: text("message"') },
    { name: 'Campo relatedAllocationId', check: schemaContent.includes('relatedAllocationId: int("relatedAllocationId")') },
    { name: 'Campo relatedProjectId', check: schemaContent.includes('relatedProjectId: int("relatedProjectId")') },
    { name: 'Campo isRead com default false', check: schemaContent.includes('isRead: boolean("isRead").default(false)') },
    { name: 'Campo actionUrl', check: schemaContent.includes('actionUrl: varchar("actionUrl"') },
    { name: 'Campo createdAt', check: schemaContent.includes('createdAt: timestamp("createdAt").defaultNow()') },
    { name: 'Campo readAt', check: schemaContent.includes('readAt: timestamp("readAt")') },
    { name: 'Type Notification exportado', check: schemaContent.includes('export type Notification =') },
    { name: 'Type InsertNotification exportado', check: schemaContent.includes('export type InsertNotification =') },
  ];
  
  notificationsChecks.forEach(check => {
    results.schema.total++;
    if (check.check) {
      results.schema.passed++;
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name}`);
      results.schema.details.push(`FALHOU: ${check.name}`);
    }
  });
  
  // Verificar tabela notification_preferences
  const preferencesChecks = [
    { name: 'Tabela notification_preferences existe', check: schemaContent.includes('export const notificationPreferences = mysqlTable("notification_preferences"') },
    { name: 'Campo userId único', check: schemaContent.includes('userId: int("userId").notNull().unique()') },
    { name: 'Campo allocationCreated com default true', check: schemaContent.includes('allocationCreated: boolean("allocationCreated").default(true)') },
    { name: 'Campo allocationUpdated com default true', check: schemaContent.includes('allocationUpdated: boolean("allocationUpdated").default(true)') },
    { name: 'Campo allocationDeleted com default true', check: schemaContent.includes('allocationDeleted: boolean("allocationDeleted").default(true)') },
    { name: 'Campo allocationReverted com default true', check: schemaContent.includes('allocationReverted: boolean("allocationReverted").default(true)') },
    { name: 'Campo emailNotifications com default false', check: schemaContent.includes('emailNotifications: boolean("emailNotifications").default(false)') },
    { name: 'Type NotificationPreference exportado', check: schemaContent.includes('export type NotificationPreference =') },
    { name: 'Type InsertNotificationPreference exportado', check: schemaContent.includes('export type InsertNotificationPreference =') },
  ];
  
  preferencesChecks.forEach(check => {
    results.schema.total++;
    if (check.check) {
      results.schema.passed++;
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name}`);
      results.schema.details.push(`FALHOU: ${check.name}`);
    }
  });
  
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Teste 2: Funções DB - Verificar implementação exata
console.log('\n📋 Teste 2: Funções em server/db.ts');
console.log('-'.repeat(70));

try {
  const dbPath = resolve(projectRoot, 'server/db.ts');
  const dbContent = readFileSync(dbPath, 'utf-8');
  
  const functionChecks = [
    { name: 'createNotification - verifica preferências', check: dbContent.includes('Verificar preferências do usuário') && dbContent.includes('notificationPreferences.userId') },
    { name: 'createNotification - retorna null se desativado', check: dbContent.includes('return null; // Usuário desativou este tipo de notificação') },
    { name: 'getNotificationsByUserId - ordena por createdAt DESC', check: dbContent.includes('orderBy(desc(notifications.createdAt))') },
    { name: 'getNotificationsByUserId - limita resultados', check: dbContent.includes('.limit(limit)') },
    { name: 'getUnreadNotificationCount - usa sql count', check: dbContent.includes('sql<number>`count(*)`') },
    { name: 'getUnreadNotificationCount - filtra isRead = false', check: dbContent.includes('eq(notifications.isRead, false)') },
    { name: 'markNotificationAsRead - atualiza isRead e readAt', check: dbContent.includes('isRead: true, readAt: new Date()') },
    { name: 'markNotificationAsRead - valida userId', check: dbContent.includes('eq(notifications.userId, userId)') },
    { name: 'deleteNotification - valida userId', check: dbContent.includes('deleteNotification') && dbContent.includes('eq(notifications.userId, userId)') },
    { name: 'getNotificationPreferences - retorna null se não existe', check: dbContent.includes('return result[0] || null') },
    { name: 'updateNotificationPreferences - cria se não existe', check: dbContent.includes('if (existing)') && dbContent.includes('else {') && dbContent.includes('db.insert(notificationPreferences)') },
  ];
  
  functionChecks.forEach(check => {
    results.dbFunctions.total++;
    if (check.check) {
      results.dbFunctions.passed++;
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name}`);
      results.dbFunctions.details.push(`FALHOU: ${check.name}`);
    }
  });
  
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Teste 3: Routers - Verificar procedures e criação de notificações
console.log('\n📋 Teste 3: Routers em server/routers.ts');
console.log('-'.repeat(70));

try {
  const routersPath = resolve(projectRoot, 'server/routers.ts');
  const routersContent = readFileSync(routersPath, 'utf-8');
  
  const routerChecks = [
    { name: 'Router notifications existe', check: routersContent.includes('notifications: router({') },
    { name: 'Procedure list - protectedProcedure', check: routersContent.includes('list: protectedProcedure.query') },
    { name: 'Procedure list - valida userId', check: routersContent.includes('if (!ctx.user?.id)') && routersContent.includes('throw new TRPCError({ code: "UNAUTHORIZED" })') },
    { name: 'Procedure unreadCount - retorna count', check: routersContent.includes('unreadCount: protectedProcedure') && routersContent.includes('count: await db.getUnreadNotificationCount') },
    { name: 'Procedure markAsRead - mutation com input id', check: routersContent.includes('markAsRead: protectedProcedure') && routersContent.includes('input(z.object({ id: z.number() }))') },
    { name: 'Procedure delete - mutation com input id', check: routersContent.includes('delete: protectedProcedure') && routersContent.includes('input(z.object({ id: z.number() }))') },
    { name: 'Procedure preferences - retorna padrões se não existe', check: routersContent.includes('preferences: protectedProcedure') && routersContent.includes('return prefs || {') },
    { name: 'Procedure updatePreferences - input opcional', check: routersContent.includes('updatePreferences: protectedProcedure') && routersContent.includes('.optional()') },
    { name: 'Notificação em allocations.create', check: routersContent.includes('allocation_created') && routersContent.includes('Novo colaborador alocado') },
    { name: 'Notificação em allocations.update', check: routersContent.includes('allocation_updated') && routersContent.includes('Alocação alterada') },
    { name: 'Notificação em allocations.delete', check: routersContent.includes('allocation_deleted') && routersContent.includes('Alocação removida') },
    { name: 'Não notifica se gerente é quem criou', check: routersContent.includes('project.managerId !== ctx.user?.id') },
    { name: 'Try-catch em criação de notificações', check: (routersContent.match(/try\s*{[\s\S]*?catch\s*\(error\)/g) || []).length >= 3 && routersContent.includes('Erro ao criar notificação') },
  ];
  
  routerChecks.forEach(check => {
    results.routers.total++;
    if (check.check) {
      results.routers.passed++;
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name}`);
      results.routers.details.push(`FALHOU: ${check.name}`);
    }
  });
  
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Teste 4: Frontend - Verificar componentes
console.log('\n📋 Teste 4: Componentes Frontend');
console.log('-'.repeat(70));

try {
  // NotificationBell
  const bellPath = resolve(projectRoot, 'client/src/components/NotificationBell.tsx');
  const bellContent = readFileSync(bellPath, 'utf-8');
  
  const bellChecks = [
    { name: 'NotificationBell exportado', check: bellContent.includes('export function NotificationBell') },
    { name: 'Usa trpc.notifications.list.useQuery', check: bellContent.includes('trpc.notifications.list.useQuery') },
    { name: 'Usa trpc.notifications.unreadCount.useQuery', check: bellContent.includes('trpc.notifications.unreadCount.useQuery') },
    { name: 'Usa trpc.notifications.markAsRead.useMutation', check: bellContent.includes('trpc.notifications.markAsRead.useMutation') },
    { name: 'Usa trpc.notifications.delete.useMutation', check: bellContent.includes('trpc.notifications.delete.useMutation') },
    { name: 'Badge com contador', check: bellContent.includes('<Badge') && bellContent.includes('unreadCount') },
    { name: 'Mostra "9+" se > 9', check: bellContent.includes('unreadCount > 9 ? "9+" : unreadCount') },
    { name: 'Ícones por tipo', check: bellContent.includes('allocation_created') && bellContent.includes('➕') },
    { name: 'Destaque para não lidas', check: bellContent.includes('!notification.isRead') && bellContent.includes('bg-blue-50') },
    { name: 'Navegação para actionUrl', check: bellContent.includes('navigate(notification.actionUrl)') },
    { name: 'Link para preferências', check: bellContent.includes('/configuracoes/notificacoes') },
  ];
  
  bellChecks.forEach(check => {
    results.frontend.total++;
    if (check.check) {
      results.frontend.passed++;
      console.log(`   ✅ NotificationBell: ${check.name}`);
    } else {
      console.log(`   ❌ NotificationBell: ${check.name}`);
      results.frontend.details.push(`FALHOU: ${check.name}`);
    }
  });
  
  // NotificationPreferences
  const prefsPath = resolve(projectRoot, 'client/src/pages/NotificationPreferences.tsx');
  const prefsContent = readFileSync(prefsPath, 'utf-8');
  
  const prefsChecks = [
    { name: 'NotificationPreferences exportado', check: prefsContent.includes('export default function NotificationPreferences') },
    { name: 'Usa trpc.notifications.preferences.useQuery', check: prefsContent.includes('trpc.notifications.preferences.useQuery') },
    { name: 'Usa trpc.notifications.updatePreferences.useMutation', check: prefsContent.includes('trpc.notifications.updatePreferences.useMutation') },
    { name: 'Switch para allocationCreated', check: prefsContent.includes('allocationCreated') && prefsContent.includes('<Switch') },
    { name: 'Switch para allocationUpdated', check: prefsContent.includes('allocationUpdated') && prefsContent.includes('<Switch') },
    { name: 'Switch para allocationDeleted', check: prefsContent.includes('allocationDeleted') && prefsContent.includes('<Switch') },
    { name: 'Switch para allocationReverted', check: prefsContent.includes('allocationReverted') && prefsContent.includes('<Switch') },
    { name: 'Switch para emailNotifications (desabilitado)', check: prefsContent.includes('emailNotifications') && prefsContent.includes('disabled') },
    { name: 'Botão salvar', check: prefsContent.includes('Salvar Preferências') },
    { name: 'Toast de sucesso', check: prefsContent.includes('toast.success') },
  ];
  
  prefsChecks.forEach(check => {
    results.frontend.total++;
    if (check.check) {
      results.frontend.passed++;
      console.log(`   ✅ NotificationPreferences: ${check.name}`);
    } else {
      console.log(`   ❌ NotificationPreferences: ${check.name}`);
      results.frontend.details.push(`FALHOU: ${check.name}`);
    }
  });
  
  // DashboardLayout
  const layoutPath = resolve(projectRoot, 'client/src/components/DashboardLayout.tsx');
  const layoutContent = readFileSync(layoutPath, 'utf-8');
  
  const layoutChecks = [
    { name: 'Import NotificationBell', check: layoutContent.includes('import { NotificationBell }') },
    { name: 'NotificationBell usado no header', check: layoutContent.includes('<NotificationBell />') },
  ];
  
  layoutChecks.forEach(check => {
    results.frontend.total++;
    if (check.check) {
      results.frontend.passed++;
      console.log(`   ✅ DashboardLayout: ${check.name}`);
    } else {
      console.log(`   ❌ DashboardLayout: ${check.name}`);
      results.frontend.details.push(`FALHOU: ${check.name}`);
    }
  });
  
  // App.tsx
  const appPath = resolve(projectRoot, 'client/src/App.tsx');
  const appContent = readFileSync(appPath, 'utf-8');
  
  const appChecks = [
    { name: 'Import NotificationPreferences', check: appContent.includes('import NotificationPreferences') },
    { name: 'Rota /configuracoes/notificacoes', check: appContent.includes('/configuracoes/notificacoes') },
  ];
  
  appChecks.forEach(check => {
    results.frontend.total++;
    if (check.check) {
      results.frontend.passed++;
      console.log(`   ✅ App.tsx: ${check.name}`);
    } else {
      console.log(`   ❌ App.tsx: ${check.name}`);
      results.frontend.details.push(`FALHOU: ${check.name}`);
    }
  });
  
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// Resumo final
console.log('\n' + '='.repeat(70));
console.log('\n📊 Resumo Detalhado:\n');

const sections = [
  { name: 'Schema do Banco', result: results.schema },
  { name: 'Funções DB', result: results.dbFunctions },
  { name: 'Routers', result: results.routers },
  { name: 'Frontend', result: results.frontend },
];

let totalPassed = 0;
let totalTotal = 0;

sections.forEach(section => {
  const percentage = section.result.total > 0 
    ? ((section.result.passed / section.result.total) * 100).toFixed(1)
    : 0;
  const icon = section.result.passed === section.result.total ? '✅' : '⚠️';
  
  console.log(`${icon} ${section.name}:`);
  console.log(`   ${section.result.passed}/${section.result.total} testes passaram (${percentage}%)`);
  
  if (section.result.details.length > 0) {
    console.log(`   ⚠️  Falhas:`);
    section.result.details.forEach(detail => {
      console.log(`      - ${detail}`);
    });
  }
  
  totalPassed += section.result.passed;
  totalTotal += section.result.total;
  console.log('');
});

const overallPercentage = totalTotal > 0 
  ? ((totalPassed / totalTotal) * 100).toFixed(1)
  : 0;

console.log('='.repeat(70));
console.log(`\n📈 Total Geral: ${totalPassed}/${totalTotal} testes passaram (${overallPercentage}%)`);

if (totalPassed === totalTotal) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM!');
  console.log('✅ Implementação está 100% conforme a especificação da Etapa 5.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Alguns testes falharam.');
  console.log('   Revise os detalhes acima e corrija as implementações.\n');
  process.exit(1);
}

