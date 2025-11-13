# Etapa 5: Alertas de Mudanças

## Visão Geral
Esta etapa implementa um sistema completo de notificações para alertar gerentes e coordenadores quando alocações de seus projetos são alteradas, mantendo-os informados em tempo real.

## Objetivos
- Notificar gerentes quando alocações são criadas, atualizadas ou deletadas
- Criar centro de notificações com contador de não lidas
- Permitir que usuários configurem preferências de notificação
- Armazenar notificações no banco de dados

## Pré-requisitos
- Etapa 1 concluída (comentários implementados)
- Etapa 2 concluída (changedBy obrigatório)
- Etapa 3 concluída (reverter mudanças - opcional, mas recomendado)
- Acesso ao banco de dados MySQL
- Conhecimento do sistema de migrações Drizzle
- Ambiente de desenvolvimento configurado

---

## Passo 1: Alterações no Schema do Banco de Dados

### 1.1 Criar Tabela de Notificações (drizzle/schema.ts)

**Arquivo:** `drizzle/schema.ts`

**Localização:** Após a tabela `allocationHistory`

**Alteração:**
Adicionar tabela de notificações:

```typescript
/**
 * Notifications table - stores user notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "allocation_created",
    "allocation_updated",
    "allocation_deleted",
    "allocation_reverted",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedAllocationId: int("relatedAllocationId"),
  relatedProjectId: int("relatedProjectId"),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
```

**Validação:**
- Verificar que a tabela foi adicionada corretamente
- Confirmar que todos os campos estão presentes

---

### 1.2 Criar Tabela de Preferências de Notificação (drizzle/schema.ts)

**Arquivo:** `drizzle/schema.ts`

**Localização:** Após a tabela `notifications`

**Alteração:**
Adicionar tabela de preferências:

```typescript
/**
 * Notification preferences table - stores user notification preferences
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  allocationCreated: boolean("allocationCreated").default(true).notNull(),
  allocationUpdated: boolean("allocationUpdated").default(true).notNull(),
  allocationDeleted: boolean("allocationDeleted").default(true).notNull(),
  allocationReverted: boolean("allocationReverted").default(true).notNull(),
  emailNotifications: boolean("emailNotifications").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
```

**Validação:**
- Verificar que a tabela foi adicionada corretamente
- Confirmar que `userId` é único

---

### 1.3 Criar Migração do Banco de Dados

**Comando:**
```bash
cd /home/mymakecoins/_code/gteam/load-cap
pnpm drizzle-kit generate
```

**Arquivo gerado:** `drizzle/XXXX_description.sql`

**Conteúdo esperado da migração:**
```sql
CREATE TABLE `notifications` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `type` enum('allocation_created', 'allocation_updated', 'allocation_deleted', 'allocation_reverted') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `relatedAllocationId` int,
  `relatedProjectId` int,
  `isRead` boolean DEFAULT false NOT NULL,
  `actionUrl` varchar(500),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `readAt` timestamp,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
);

CREATE TABLE `notification_preferences` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `allocationCreated` boolean DEFAULT true NOT NULL,
  `allocationUpdated` boolean DEFAULT true NOT NULL,
  `allocationDeleted` boolean DEFAULT true NOT NULL,
  `allocationReverted` boolean DEFAULT true NOT NULL,
  `emailNotifications` boolean DEFAULT false NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
);
```

**Validação:**
- Verificar que a migração foi gerada corretamente
- Confirmar que foreign keys foram criadas

---

### 1.4 Aplicar Migração

**Comando:**
```bash
pnpm drizzle-kit push
```

**OU** (se usar script customizado):
```bash
node scripts/drizzle-with-env.mjs push
```

**Validação:**
- Verificar que a migração foi aplicada sem erros
- Confirmar no banco de dados que as tabelas existem:
  ```sql
  DESCRIBE notifications;
  DESCRIBE notification_preferences;
  ```

---

## Passo 2: Alterações no Backend

### 2.1 Criar Funções de Notificação (server/db.ts)

**Arquivo:** `server/db.ts`

**Localização:** Após as funções de histórico

**Alteração:**
Adicionar funções para gerenciar notificações:

```typescript
// ===== NOTIFICATION QUERIES =====
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar preferências do usuário
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, data.userId))
    .limit(1);
  
  const preference = prefs[0];
  
  // Se não houver preferências, criar com padrões
  if (!preference) {
    // Usuário recebe notificações por padrão
  } else {
    // Verificar se usuário quer receber este tipo de notificação
    const typeKey = data.type.replace("allocation_", "") as 
      "created" | "updated" | "deleted" | "reverted";
    
    const preferenceKey = `allocation${typeKey.charAt(0).toUpperCase() + typeKey.slice(1)}` as
      "allocationCreated" | "allocationUpdated" | "allocationDeleted" | "allocationReverted";
    
    if (!preference[preferenceKey]) {
      return null; // Usuário desativou este tipo de notificação
    }
  }
  
  return db.insert(notifications).values(data);
}

export async function getNotificationsByUserId(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));
  
  return result[0]?.count || 0;
}

export async function markNotificationAsRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notifications.id, id),
      eq(notifications.userId, userId)
    ));
}

export async function deleteNotification(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .delete(notifications)
    .where(and(
      eq(notifications.id, id),
      eq(notifications.userId, userId)
    ));
}

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  
  return result[0] || null;
}

export async function updateNotificationPreferences(
  userId: number,
  preferences: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getNotificationPreferences(userId);
  
  if (existing) {
    return db
      .update(notificationPreferences)
      .set(preferences)
      .where(eq(notificationPreferences.userId, userId));
  } else {
    return db.insert(notificationPreferences).values({
      userId,
      ...preferences,
    });
  }
}
```

**Imports necessários:**
```typescript
import { notifications, notificationPreferences } from "../drizzle/schema";
import { sql } from "drizzle-orm";
```

**Validação:**
- Verificar que todas as funções foram criadas
- Testar criação de notificação
- Testar busca de notificações

---

### 2.2 Atualizar Procedure de Criação com Notificação (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.create` (linha ~254)

**Alteração:**
Adicionar criação de notificação após criar histórico:

```typescript
create: protectedProcedure
  .input(z.object({
    // ... inputs existentes ...
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de criação ...
    
    // Log to history
    await db.createAllocationHistory({
      // ... dados existentes ...
    });
    
    // NOVO: Criar notificação para gerente do projeto
    try {
      const project = await db.getProjectById(input.projectId);
      const employee = await db.getEmployeeById(input.employeeId);
      
      if (project?.managerId && project.managerId !== ctx.user?.id) {
        // Não notificar se o gerente é quem criou
        await db.createNotification({
          userId: project.managerId,
          type: "allocation_created",
          title: "Novo colaborador alocado",
          message: `${employee?.name || "Colaborador"} foi alocado(a) para ${project.name} com ${allocatedHours}h${allocatedPercentage ? ` (${allocatedPercentage}%)` : ""}`,
          relatedAllocationId: allocation.id,
          relatedProjectId: input.projectId,
          actionUrl: `/alocacoes`,
          isRead: false,
        });
      }
    } catch (error) {
      // Não falhar criação se notificação falhar
      console.error("Erro ao criar notificação:", error);
    }
    
    return allocation;
  }),
```

**Validação:**
- Verificar que notificação é criada para gerente
- Testar que não notifica se gerente é quem criou
- Verificar que criação não falha se notificação falhar

---

### 2.3 Atualizar Procedure de Atualização com Notificação (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.update` (linha ~367)

**Alteração:**
Adicionar criação de notificação após atualizar histórico:

```typescript
update: protectedProcedure
  .input(z.object({
    // ... inputs existentes ...
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de atualização ...
    
    // Log to history
    await db.createAllocationHistory({
      // ... dados existentes ...
    });
    
    // NOVO: Criar notificação para gerente do projeto
    try {
      const project = await db.getProjectById(allocation.projectId);
      const employee = await db.getEmployeeById(allocation.employeeId);
      
      if (project?.managerId && project.managerId !== ctx.user?.id) {
        // Construir mensagem de mudança
        let changeMessage = "";
        if (input.allocatedHours !== undefined && allocation.allocatedHours !== finalAllocatedHours) {
          changeMessage = `${allocation.allocatedHours}h → ${finalAllocatedHours}h`;
        } else if (input.endDate !== undefined) {
          changeMessage = `Data fim alterada para ${input.endDate.toLocaleDateString('pt-BR')}`;
        } else {
          changeMessage = "Alocação atualizada";
        }
        
        await db.createNotification({
          userId: project.managerId,
          type: "allocation_updated",
          title: "Alocação alterada",
          message: `Alocação de ${employee?.name || "Colaborador"} em ${project.name} foi alterada: ${changeMessage}`,
          relatedAllocationId: input.id,
          relatedProjectId: allocation.projectId,
          actionUrl: `/alocacoes`,
          isRead: false,
        });
      }
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
    }
    
    return updated;
  }),
```

**Validação:**
- Verificar que notificação é criada para gerente
- Testar mensagem de mudança
- Verificar que atualização não falha se notificação falhar

---

### 2.4 Atualizar Procedure de Deleção com Notificação (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.delete`

**Alteração:**
Adicionar criação de notificação após deletar:

```typescript
delete: protectedProcedure
  .input(z.object({
    id: z.number(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de deleção ...
    
    // Log to history
    await db.createAllocationHistory({
      // ... dados existentes ...
    });
    
    // NOVO: Criar notificação para gerente do projeto
    try {
      const project = await db.getProjectById(allocation.projectId);
      const employee = await db.getEmployeeById(allocation.employeeId);
      
      if (project?.managerId && project.managerId !== ctx.user?.id) {
        await db.createNotification({
          userId: project.managerId,
          type: "allocation_deleted",
          title: "Alocação removida",
          message: `Alocação de ${employee?.name || "Colaborador"} em ${project.name} (${allocation.allocatedHours}h) foi removida`,
          relatedAllocationId: input.id,
          relatedProjectId: allocation.projectId,
          actionUrl: `/historico-alocacoes`,
          isRead: false,
        });
      }
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
    }
    
    return { success: true };
  }),
```

**Validação:**
- Verificar que notificação é criada para gerente
- Testar que não notifica se gerente é quem deletou
- Verificar que deleção não falha se notificação falhar

---

### 2.5 Criar Router de Notificações (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** Após o router `allocations`

**Alteração:**
Criar novo router para notificações:

```typescript
// ===== NOTIFICATIONS ROUTER =====
notifications: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    return db.getNotificationsByUserId(ctx.user.id, 20);
  }),
  
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    return { count: await db.getUnreadNotificationCount(ctx.user.id) };
  }),
  
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      return db.markNotificationAsRead(input.id, ctx.user.id);
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      return db.deleteNotification(input.id, ctx.user.id);
    }),
  
  preferences: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    const prefs = await db.getNotificationPreferences(ctx.user.id);
    
    // Retornar padrões se não houver preferências
    return prefs || {
      userId: ctx.user.id,
      allocationCreated: true,
      allocationUpdated: true,
      allocationDeleted: true,
      allocationReverted: true,
      emailNotifications: false,
    };
  }),
  
  updatePreferences: protectedProcedure
    .input(z.object({
      allocationCreated: z.boolean().optional(),
      allocationUpdated: z.boolean().optional(),
      allocationDeleted: z.boolean().optional(),
      allocationReverted: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      return db.updateNotificationPreferences(ctx.user.id, input);
    }),
}),
```

**Validação:**
- Verificar que todas as procedures foram criadas
- Testar listagem de notificações
- Testar contador de não lidas
- Testar marcar como lida
- Testar deletar notificação
- Testar preferências

---

## Passo 3: Alterações no Frontend

### 3.1 Criar Componente NotificationBell (client/src/components/NotificationBell.tsx)

**Arquivo:** `client/src/components/NotificationBell.tsx`

**Alteração:**
Criar novo componente:

```typescript
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useNavigate } from "wouter";

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications, refetch } = trpc.notifications.list.useQuery();
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const deleteNotificationMutation = trpc.notifications.delete.useMutation();
  
  const unreadCount = unreadData?.count || 0;
  
  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      toast.error("Erro ao marcar como lida");
    }
  };
  
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotificationMutation.mutateAsync({ id });
      refetch();
      toast.success("Notificação removida");
    } catch (error) {
      toast.error("Erro ao remover notificação");
    }
  };
  
  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "allocation_created":
        return "➕";
      case "allocation_updated":
        return "✏️";
      case "allocation_deleted":
        return "🗑️";
      case "allocation_reverted":
        return "↩️";
      default:
        return "📢";
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
        </div>
        
        {notifications && notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted transition ${
                  !notification.isRead ? "bg-blue-50 dark:bg-blue-950" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{getNotificationIcon(notification.type)}</span>
                      <p className="font-medium text-sm">{notification.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex gap-1">
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        title="Marcar como lida"
                      >
                        ✓
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDelete(notification.id, e)}
                      title="Deletar"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma notificação
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <a href="/configuracoes/notificacoes" className="cursor-pointer w-full">
            ⚙️ Preferências
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Validação:**
- Verificar que componente foi criado
- Testar exibição de notificações
- Testar contador de não lidas
- Testar marcar como lida
- Testar deletar notificação

---

### 3.2 Adicionar NotificationBell ao DashboardLayout (client/src/components/DashboardLayout.tsx)

**Arquivo:** `client/src/components/DashboardLayout.tsx`

**Localização:** No header, próximo ao menu do usuário

**Alteração:**
Adicionar componente de notificações:

```typescript
import { NotificationBell } from "./NotificationBell";

// No header, adicionar antes do menu do usuário:
<NotificationBell />
```

**Validação:**
- Verificar que sino aparece no header
- Testar que contador funciona
- Testar que dropdown abre

---

### 3.3 Criar Página de Preferências de Notificação (client/src/pages/NotificationPreferences.tsx)

**Arquivo:** `client/src/pages/NotificationPreferences.tsx`

**Alteração:**
Criar nova página:

```typescript
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NotificationPreferences() {
  const { data: preferences, refetch } = trpc.notifications.preferences.useQuery();
  const updateMutation = trpc.notifications.updatePreferences.useMutation();
  
  const [settings, setSettings] = useState({
    allocationCreated: true,
    allocationUpdated: true,
    allocationDeleted: true,
    allocationReverted: true,
    emailNotifications: false,
  });
  
  useEffect(() => {
    if (preferences) {
      setSettings({
        allocationCreated: preferences.allocationCreated,
        allocationUpdated: preferences.allocationUpdated,
        allocationDeleted: preferences.allocationDeleted,
        allocationReverted: preferences.allocationReverted,
        emailNotifications: preferences.emailNotifications,
      });
    }
  }, [preferences]);
  
  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(settings);
      toast.success("Preferências salvas com sucesso");
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar preferências");
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preferências de Notificações</h1>
        <p className="text-muted-foreground mt-2">
          Configure quais notificações você deseja receber
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Selecione quais eventos você quer ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-created">Novo Colaborador Alocado</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando um colaborador é alocado em seus projetos
              </p>
            </div>
            <Switch
              id="allocation-created"
              checked={settings.allocationCreated}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationCreated: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-updated">Alocação Alterada</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando uma alocação é modificada
              </p>
            </div>
            <Switch
              id="allocation-updated"
              checked={settings.allocationUpdated}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationUpdated: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-deleted">Alocação Removida</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando uma alocação é deletada
              </p>
            </div>
            <Switch
              id="allocation-deleted"
              checked={settings.allocationDeleted}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationDeleted: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-reverted">Mudança Revertida</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando uma mudança é revertida
              </p>
            </div>
            <Switch
              id="allocation-reverted"
              checked={settings.allocationReverted}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, allocationReverted: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Canais de Notificação</CardTitle>
          <CardDescription>
            Escolha como você quer receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications">Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações também por email (em breve)
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, emailNotifications: checked })
              }
              disabled // Desabilitado por enquanto
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar Preferências"}
        </Button>
      </div>
    </div>
  );
}
```

**Validação:**
- Verificar que página foi criada
- Testar salvamento de preferências
- Testar que switches funcionam

---

### 3.4 Adicionar Rota de Preferências (client/src/App.tsx)

**Arquivo:** `client/src/App.tsx`

**Localização:** Dentro das rotas protegidas

**Alteração:**
Adicionar rota:

```typescript
import NotificationPreferences from "./pages/NotificationPreferences";

// Dentro das rotas protegidas:
<Route path={"/configuracoes/notificacoes"} component={NotificationPreferences} />
```

**Validação:**
- Verificar que rota funciona
- Testar navegação para página

---

## Passo 4: Testes

### 4.1 Testes de Backend

**Teste 1: Criar notificação**
```bash
# Criar alocação como coordenador
# Verificar que notificação foi criada para gerente
# Verificar no banco de dados
```

**Teste 2: Preferências**
```bash
# Desativar notificação de criação
# Criar alocação
# Verificar que notificação NÃO foi criada
```

**Teste 3: Contador de não lidas**
```bash
# Criar várias notificações
# Verificar contador
# Marcar como lida
# Verificar que contador diminui
```

---

### 4.2 Testes de Frontend

**Teste 1: Sino de notificações**
- [ ] Sino aparece no header
- [ ] Contador mostra número correto
- [ ] Dropdown abre ao clicar
- [ ] Notificações são exibidas

**Teste 2: Interações**
- [ ] Clicar em notificação marca como lida
- [ ] Clicar em notificação navega para URL
- [ ] Botão de marcar como lida funciona
- [ ] Botão de deletar funciona

**Teste 3: Preferências**
- [ ] Página de preferências carrega
- [ ] Switches funcionam
- [ ] Salvamento funciona
- [ ] Preferências são aplicadas

---

## Passo 5: Validação Final

### 5.1 Checklist de Implementação

- [ ] Migração do banco aplicada com sucesso
- [ ] Tabelas de notificações e preferências existem
- [ ] Backend cria notificações em create, update e delete
- [ ] Backend respeita preferências do usuário
- [ ] Router de notificações funciona
- [ ] Componente NotificationBell funciona
- [ ] Página de preferências funciona
- [ ] Testes passaram

---

### 5.2 Validação de Dados

**Verificar no banco de dados:**
```sql
-- Verificar notificações criadas
SELECT 
  id,
  userId,
  type,
  title,
  isRead,
  createdAt
FROM notifications
ORDER BY createdAt DESC
LIMIT 10;

-- Verificar preferências
SELECT 
  userId,
  allocationCreated,
  allocationUpdated,
  allocationDeleted,
  allocationReverted
FROM notification_preferences;

-- Verificar distribuição de tipos
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN isRead = false THEN 1 ELSE 0 END) as nao_lidas
FROM notifications
GROUP BY type;
```

---

## Próximos Passos

Após completar esta etapa, todas as melhorias estarão implementadas!

**Melhorias futuras opcionais:**
- Notificações por email (requer configuração de SMTP)
- Notificações em tempo real (WebSockets)
- Notificações push no navegador
- Agrupamento de notificações similares

---

## Notas Técnicas

### Limitações Conhecidas
- Notificações por email não estão implementadas (apenas estrutura)
- Notificações não são em tempo real (requer polling ou WebSockets)
- Não há limite automático de notificações antigas (pode ser adicionado depois)

### Melhorias Futuras
- Implementar notificações por email
- Adicionar WebSockets para notificações em tempo real
- Limpeza automática de notificações antigas
- Agrupamento de notificações similares
- Notificações push no navegador

---

**Tempo Estimado:** 8-10 horas
**Complexidade:** Alta
**Dependências:** Etapa 1 e Etapa 2 (obrigatórias), Etapa 3 (recomendada)



