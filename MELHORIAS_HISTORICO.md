# Melhorias Detalhadas - Funcionalidade de Histórico

## Visão Geral

Este documento detalha as implementações técnicas para as melhorias 1, 2, 3 e 5 da funcionalidade de Histórico de Alocações.

---

## Melhoria 1: Adicionar Comentários às Mudanças

### 1.1 Objetivo

Permitir que usuários adicionem notas/comentários explicando o motivo de uma mudança de alocação, melhorando a rastreabilidade e facilitando futuras auditorias.

### 1.2 Requisitos Funcionais

#### RF 1.2.1 - Adicionar Comentário ao Criar Alocação

Quando um usuário cria uma nova alocação, deve ser possível adicionar um comentário opcional explicando o motivo.

**Critérios de Aceitação:**
- Campo de texto opcional no formulário de criação de alocação
- Máximo de 500 caracteres
- Comentário é armazenado na tabela `allocation_history`
- Comentário é exibido no histórico

#### RF 1.2.2 - Adicionar Comentário ao Atualizar Alocação

Quando um usuário atualiza uma alocação, deve ser possível adicionar um comentário explicando a mudança.

**Critérios de Aceitação:**
- Campo de texto opcional no formulário de edição
- Máximo de 500 caracteres
- Comentário é armazenado na tabela `allocation_history`
- Comentário é exibido no histórico

#### RF 1.2.3 - Adicionar Comentário ao Deletar Alocação

Quando um usuário deleta uma alocação, deve ser possível adicionar um comentário explicando o motivo.

**Critérios de Aceitação:**
- Modal de confirmação com campo de comentário
- Máximo de 500 caracteres
- Comentário é armazenado na tabela `allocation_history`
- Comentário é exibido no histórico

#### RF 1.2.4 - Visualizar Comentários no Histórico

Os comentários devem ser exibidos na página de histórico de forma clara.

**Critérios de Aceitação:**
- Coluna "Comentário" na tabela de histórico
- Comentários longos são truncados com "..." e tooltip ao passar mouse
- Comentários vazios mostram "-"
- Comentários são pesquisáveis

### 1.3 Alterações no Banco de Dados

#### Schema (drizzle/schema.ts)

Adicionar campo `comment` na tabela `allocation_history`:

```typescript
export const allocationHistory = mysqlTable("allocation_history", {
  id: int("id").autoincrement().primaryKey(),
  allocationId: int("allocationId"),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  allocatedHours: int("allocatedHours").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  action: mysqlEnum("action", ["created", "updated", "deleted"]).notNull(),
  changedBy: int("changedBy"),
  comment: text("comment"), // NOVO CAMPO
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Migração SQL:**

```sql
ALTER TABLE allocation_history ADD COLUMN comment TEXT NULL AFTER changedBy;
```

### 1.4 Alterações no Backend

#### Procedure: allocations.create

```typescript
create: protectedProcedure
  .input(z.object({
    employeeId: z.number(),
    projectId: z.number(),
    allocatedHours: z.number().min(1),
    startDate: z.date(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(), // NOVO
  }))
  .mutation(async ({ input, ctx }) => {
    // Criar alocação
    const allocation = await db.createAllocation(input);
    
    // Registrar no histórico COM COMENTÁRIO
    await db.recordAllocationHistory({
      allocationId: allocation.id,
      employeeId: input.employeeId,
      projectId: input.projectId,
      allocatedHours: input.allocatedHours,
      startDate: input.startDate,
      endDate: input.endDate,
      action: "created",
      changedBy: ctx.user?.id,
      comment: input.comment, // NOVO
    });
    
    return allocation;
  }),
```

#### Procedure: allocations.update

```typescript
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    allocatedHours: z.number().min(1).optional(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(), // NOVO
  }))
  .mutation(async ({ input, ctx }) => {
    // Atualizar alocação
    const updated = await db.updateAllocation(input);
    
    // Registrar no histórico COM COMENTÁRIO
    await db.recordAllocationHistory({
      allocationId: input.id,
      employeeId: updated.employeeId,
      projectId: updated.projectId,
      allocatedHours: updated.allocatedHours,
      startDate: updated.startDate,
      endDate: updated.endDate,
      action: "updated",
      changedBy: ctx.user?.id,
      comment: input.comment, // NOVO
    });
    
    return updated;
  }),
```

#### Procedure: allocations.delete

```typescript
delete: protectedProcedure
  .input(z.object({
    id: z.number(),
    comment: z.string().max(500).optional(), // NOVO
  }))
  .mutation(async ({ input, ctx }) => {
    const allocation = await db.getAllocationById(input.id);
    
    // Deletar alocação
    await db.deleteAllocation(input.id);
    
    // Registrar no histórico COM COMENTÁRIO
    await db.recordAllocationHistory({
      allocationId: input.id,
      employeeId: allocation.employeeId,
      projectId: allocation.projectId,
      allocatedHours: allocation.allocatedHours,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      action: "deleted",
      changedBy: ctx.user?.id,
      comment: input.comment, // NOVO
    });
    
    return { success: true };
  }),
```

### 1.5 Alterações no Frontend

#### Componente: Allocations.tsx

Adicionar campo de comentário no formulário:

```tsx
const [comment, setComment] = useState("");

return (
  <Dialog>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova Alocação</DialogTitle>
      </DialogHeader>
      
      {/* Campos existentes */}
      <Select value={selectedEmployee?.toString()}>
        {/* ... */}
      </Select>
      
      {/* NOVO: Campo de Comentário */}
      <div className="space-y-2">
        <Label htmlFor="comment">Comentário (opcional)</Label>
        <Textarea
          id="comment"
          placeholder="Explique o motivo desta alocação..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {comment.length}/500 caracteres
        </p>
      </div>
      
      <Button onClick={() => createAllocation({ ...data, comment })}>
        Criar Alocação
      </Button>
    </DialogContent>
  </Dialog>
);
```

#### Componente: AllocationHistory.tsx

Adicionar coluna de comentário na tabela:

```tsx
<TableHead>Comentário</TableHead>

{/* Na TableRow */}
<TableCell className="max-w-xs">
  {record.comment ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate cursor-help">
          {record.comment}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-sm">{record.comment}</p>
      </TooltipContent>
    </Tooltip>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
```

### 1.6 Exemplo de Uso

**Cenário:** Gerente aloca desenvolvedor para novo projeto com explicação

1. Gerente clica em "Nova Alocação"
2. Seleciona: João Silva, Projeto X, 40 horas
3. Adiciona comentário: "Alocado para nova feature de autenticação conforme planejamento Q4"
4. Clica em "Criar Alocação"
5. No histórico, aparece: "João Silva → Projeto X | Alocação | 40h | Comentário: 'Alocado para nova feature...'"

---

## Melhoria 2: Rastrear Quem Mudou (changedBy)

### 2.1 Objetivo

Registrar automaticamente qual usuário realizou cada mudança, criando uma trilha de auditoria completa.

### 2.2 Requisitos Funcionais

#### RF 2.2.1 - Registrar Usuário que Fez a Mudança

Cada ação no histórico deve registrar o ID do usuário que a realizou.

**Critérios de Aceitação:**
- Campo `changedBy` é preenchido automaticamente com ID do usuário autenticado
- Campo é obrigatório (não pode ser NULL)
- Usuário deletado não afeta histórico (referência é mantida)

#### RF 2.2.2 - Exibir Nome do Usuário no Histórico

O histórico deve exibir o nome do usuário que fez a mudança, não apenas o ID.

**Critérios de Aceitação:**
- Coluna "Modificado por" na tabela de histórico
- Exibe nome do usuário
- Se usuário foi deletado, exibe "Usuário deletado"
- Tooltip mostra email do usuário ao passar mouse

#### RF 2.2.3 - Filtrar por Usuário

Deve ser possível filtrar o histórico por usuário que fez a mudança.

**Critérios de Aceitação:**
- Novo filtro "Modificado por" na página de histórico
- Dropdown com lista de usuários que fizeram mudanças
- Filtro funciona em combinação com outros filtros

### 2.3 Alterações no Banco de Dados

#### Schema (drizzle/schema.ts)

Modificar campo `changedBy` para ser obrigatório:

```typescript
export const allocationHistory = mysqlTable("allocation_history", {
  id: int("id").autoincrement().primaryKey(),
  allocationId: int("allocationId"),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  allocatedHours: int("allocatedHours").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  action: mysqlEnum("action", ["created", "updated", "deleted"]).notNull(),
  changedBy: int("changedBy").notNull(), // MODIFICADO: agora obrigatório
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Adicionar relação com users
export const allocationHistoryRelations = relations(allocationHistory, ({ one }) => ({
  changedByUser: one(users, {
    fields: [allocationHistory.changedBy],
    references: [users.id],
  }),
}));
```

**Migração SQL:**

```sql
-- Preencher valores NULL com ID padrão (ex: admin)
UPDATE allocation_history SET changedBy = 1 WHERE changedBy IS NULL;

-- Modificar coluna para NOT NULL
ALTER TABLE allocation_history MODIFY COLUMN changedBy INT NOT NULL;

-- Adicionar constraint de chave estrangeira (opcional)
ALTER TABLE allocation_history 
ADD CONSTRAINT fk_allocation_history_user 
FOREIGN KEY (changedBy) REFERENCES users(id);
```

### 2.4 Alterações no Backend

#### Função: recordAllocationHistory (db.ts)

```typescript
export async function recordAllocationHistory(data: {
  allocationId?: number;
  employeeId: number;
  projectId: number;
  allocatedHours: number;
  startDate: Date;
  endDate?: Date;
  action: "created" | "updated" | "deleted";
  changedBy: number; // OBRIGATÓRIO
  comment?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (!data.changedBy) {
    throw new Error("changedBy é obrigatório");
  }
  
  return db.insert(allocationHistory).values({
    ...data,
    changedBy: data.changedBy, // Garantir que está preenchido
  });
}
```

#### Procedure: allocations.create

```typescript
create: protectedProcedure
  .input(z.object({
    employeeId: z.number(),
    projectId: z.number(),
    allocatedHours: z.number().min(1),
    startDate: z.date(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    const allocation = await db.createAllocation(input);
    
    await db.recordAllocationHistory({
      allocationId: allocation.id,
      employeeId: input.employeeId,
      projectId: input.projectId,
      allocatedHours: input.allocatedHours,
      startDate: input.startDate,
      endDate: input.endDate,
      action: "created",
      changedBy: ctx.user.id, // PREENCHIDO AUTOMATICAMENTE
      comment: input.comment,
    });
    
    return allocation;
  }),
```

#### Procedure: allocations.getHistory

```typescript
getHistory: protectedProcedure.query(async () => {
  const history = await db.getAllocationHistory();
  
  // Enriquecer com dados do usuário
  const enrichedHistory = await Promise.all(
    history.map(async (record) => {
      const user = await db.getUserById(record.changedBy);
      return {
        ...record,
        changedByName: user?.name || "Usuário deletado",
        changedByEmail: user?.email || "-",
      };
    })
  );
  
  return enrichedHistory;
}),
```

### 2.5 Alterações no Frontend

#### Componente: AllocationHistory.tsx

Adicionar filtro e coluna de usuário:

```tsx
const [filterChangedBy, setFilterChangedBy] = useState<number | null>(null);
const { data: users } = trpc.users.list.useQuery();

// Filtrar histórico
let filteredHistory = history || [];

if (filterChangedBy) {
  filteredHistory = filteredHistory.filter((h: any) => h.changedBy === filterChangedBy);
}

// Obter lista de usuários que fizeram mudanças
const changedByUsers = Array.from(
  new Map(
    (history || []).map((h: any) => [h.changedBy, { id: h.changedBy, name: h.changedByName }])
  ).values()
);

return (
  <div className="space-y-6">
    {/* Filtros */}
    <Card>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Filtros existentes */}
          
          {/* NOVO: Filtro de Usuário */}
          <div>
            <Label htmlFor="user-filter">Modificado por</Label>
            <Select 
              value={filterChangedBy?.toString() || ""} 
              onValueChange={(value) => setFilterChangedBy(value ? parseInt(value) : null)}
            >
              <SelectTrigger id="user-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {changedByUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Tabela */}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Colaborador</TableHead>
          <TableHead>Projeto</TableHead>
          <TableHead>Tipo de Mudança</TableHead>
          <TableHead>Horas Alteradas</TableHead>
          <TableHead>Modificado por</TableHead> {/* NOVO */}
          <TableHead>Comentário</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredHistory.map((record: any) => (
          <TableRow key={record.id}>
            <TableCell>
              {new Date(record.createdAt).toLocaleString('pt-BR')}
            </TableCell>
            <TableCell>
              {employees?.find(e => e.id === record.employeeId)?.name || "-"}
            </TableCell>
            <TableCell>
              {projects?.find(p => p.id === record.projectId)?.name || "-"}
            </TableCell>
            <TableCell>
              {record.action === "created" && "Alocação"}
              {record.action === "updated" && "Atualização"}
              {record.action === "deleted" && "Remoção"}
            </TableCell>
            <TableCell>{record.allocatedHours}h</TableCell>
            {/* NOVO: Coluna de usuário */}
            <TableCell>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    {record.changedByName}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{record.changedByEmail}</p>
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {record.comment || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
```

### 2.6 Exemplo de Uso

**Cenário:** Auditar quem fez mudanças em um período

1. Acesse "Histórico de Alocações"
2. Selecione filtro "Modificado por" → "Maria Silva"
3. Defina período: 01/11/2025 a 30/11/2025
4. Visualize todas as mudanças feitas por Maria neste período
5. Veja nome, email e ações específicas

---

## Melhoria 3: Reverter Mudanças

### 3.1 Objetivo

Permitir que usuários com permissão desfaçam uma mudança anterior, restaurando a alocação ao estado anterior.

### 3.2 Requisitos Funcionais

#### RF 3.2.1 - Botão Reverter no Histórico

Cada registro de histórico deve ter um botão "Reverter" que desfaz a ação.

**Critérios de Aceitação:**
- Botão "Reverter" aparece em cada linha do histórico
- Apenas coordenadores e admins podem reverter
- Ícone de undo ou texto claro
- Confirmação antes de reverter

#### RF 3.2.2 - Reverter Criação

Reverter uma alocação criada significa deletá-la.

**Critérios de Aceitação:**
- Alocação é deletada
- Novo registro de histórico é criado com ação "reverted_creation"
- Comentário automático: "Revertido: Alocação criada em [data]"

#### RF 3.2.3 - Reverter Atualização

Reverter uma atualização significa restaurar os valores anteriores.

**Critérios de Aceitação:**
- Sistema armazena valores anteriores (snapshot)
- Valores são restaurados ao estado anterior
- Novo registro de histórico é criado com ação "reverted_update"
- Comentário automático: "Revertido: Atualizado de 40h para 50h"

#### RF 3.2.4 - Reverter Deleção

Reverter uma deleção significa restaurar a alocação deletada.

**Critérios de Aceitação:**
- Alocação é restaurada com dados originais
- Novo registro de histórico é criado com ação "reverted_deletion"
- Comentário automático: "Revertido: Alocação deletada em [data]"

#### RF 3.2.5 - Histórico de Reversões

Reversões são registradas como ações normais no histórico.

**Critérios de Aceitação:**
- Reversões aparecem no histórico com ação "reverted_*"
- Mostram qual ação foi revertida
- Mostram quem reverteu e quando

### 3.3 Alterações no Banco de Dados

#### Schema (drizzle/schema.ts)

Adicionar campos para armazenar snapshot de valores anteriores:

```typescript
export const allocationHistory = mysqlTable("allocation_history", {
  id: int("id").autoincrement().primaryKey(),
  allocationId: int("allocationId"),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  allocatedHours: int("allocatedHours").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  action: mysqlEnum("action", [
    "created",
    "updated",
    "deleted",
    "reverted_creation",    // NOVO
    "reverted_update",      // NOVO
    "reverted_deletion",    // NOVO
  ]).notNull(),
  changedBy: int("changedBy").notNull(),
  comment: text("comment"),
  previousAllocatedHours: int("previousAllocatedHours"), // NOVO - para reverter updates
  previousEndDate: timestamp("previousEndDate"),          // NOVO - para reverter updates
  revertedHistoryId: int("revertedHistoryId"),            // NOVO - referência ao histórico revertido
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Migração SQL:**

```sql
ALTER TABLE allocation_history 
ADD COLUMN previousAllocatedHours INT NULL AFTER comment,
ADD COLUMN previousEndDate TIMESTAMP NULL AFTER previousAllocatedHours,
ADD COLUMN revertedHistoryId INT NULL AFTER previousEndDate;

-- Modificar enum de action
ALTER TABLE allocation_history 
MODIFY COLUMN action ENUM(
  'created', 'updated', 'deleted',
  'reverted_creation', 'reverted_update', 'reverted_deletion'
) NOT NULL;
```

### 3.4 Alterações no Backend

#### Função: recordAllocationHistory com Snapshot

```typescript
export async function recordAllocationHistory(data: {
  allocationId?: number;
  employeeId: number;
  projectId: number;
  allocatedHours: number;
  startDate: Date;
  endDate?: Date;
  action: "created" | "updated" | "deleted" | "reverted_creation" | "reverted_update" | "reverted_deletion";
  changedBy: number;
  comment?: string;
  previousAllocatedHours?: number; // Para updates
  previousEndDate?: Date;           // Para updates
  revertedHistoryId?: number;       // Para reversões
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(allocationHistory).values(data);
}
```

#### Procedure: allocations.update com Snapshot

```typescript
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    allocatedHours: z.number().min(1).optional(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    // Obter alocação anterior para snapshot
    const previous = await db.getAllocationById(input.id);
    
    // Atualizar alocação
    const updated = await db.updateAllocation(input);
    
    // Registrar no histórico COM SNAPSHOT
    await db.recordAllocationHistory({
      allocationId: input.id,
      employeeId: updated.employeeId,
      projectId: updated.projectId,
      allocatedHours: updated.allocatedHours,
      startDate: updated.startDate,
      endDate: updated.endDate,
      action: "updated",
      changedBy: ctx.user.id,
      comment: input.comment,
      previousAllocatedHours: previous.allocatedHours, // SNAPSHOT
      previousEndDate: previous.endDate,               // SNAPSHOT
    });
    
    return updated;
  }),
```

#### Procedure: allocations.revert

```typescript
revert: protectedProcedure
  .input(z.object({
    historyId: z.number(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    // Verificar permissão
    if (!isCoordinator(ctx.user?.role || "")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    
    // Obter registro de histórico
    const historyRecord = await db.getHistoryById(input.historyId);
    if (!historyRecord) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    
    let result;
    
    if (historyRecord.action === "created") {
      // Reverter criação = deletar alocação
      await db.deleteAllocation(historyRecord.allocationId);
      
      result = await db.recordAllocationHistory({
        allocationId: historyRecord.allocationId,
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: historyRecord.allocatedHours,
        startDate: historyRecord.startDate,
        endDate: historyRecord.endDate,
        action: "reverted_creation",
        changedBy: ctx.user.id,
        comment: input.comment || `Revertido: Alocação criada em ${new Date(historyRecord.createdAt).toLocaleString('pt-BR')}`,
        revertedHistoryId: input.historyId,
      });
      
    } else if (historyRecord.action === "updated") {
      // Reverter atualização = restaurar valores anteriores
      await db.updateAllocation({
        id: historyRecord.allocationId,
        allocatedHours: historyRecord.previousAllocatedHours || historyRecord.allocatedHours,
        endDate: historyRecord.previousEndDate,
      });
      
      result = await db.recordAllocationHistory({
        allocationId: historyRecord.allocationId,
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: historyRecord.previousAllocatedHours || historyRecord.allocatedHours,
        startDate: historyRecord.startDate,
        endDate: historyRecord.previousEndDate,
        action: "reverted_update",
        changedBy: ctx.user.id,
        comment: input.comment || `Revertido: Atualizado de ${historyRecord.previousAllocatedHours}h para ${historyRecord.allocatedHours}h`,
        revertedHistoryId: input.historyId,
      });
      
    } else if (historyRecord.action === "deleted") {
      // Reverter deleção = restaurar alocação
      await db.createAllocation({
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: historyRecord.allocatedHours,
        startDate: historyRecord.startDate,
        endDate: historyRecord.endDate,
      });
      
      result = await db.recordAllocationHistory({
        allocationId: historyRecord.allocationId,
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: historyRecord.allocatedHours,
        startDate: historyRecord.startDate,
        endDate: historyRecord.endDate,
        action: "reverted_deletion",
        changedBy: ctx.user.id,
        comment: input.comment || `Revertido: Alocação deletada em ${new Date(historyRecord.createdAt).toLocaleString('pt-BR')}`,
        revertedHistoryId: input.historyId,
      });
    }
    
    return { success: true, message: "Mudança revertida com sucesso" };
  }),
```

### 3.5 Alterações no Frontend

#### Componente: AllocationHistory.tsx

Adicionar botão de reverter:

```tsx
import { RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AllocationHistory() {
  const [revertingId, setRevertingId] = useState<number | null>(null);
  const [revertComment, setRevertComment] = useState("");
  const revertMutation = trpc.allocations.revert.useMutation();
  const { user } = useAuth();

  const handleRevert = async () => {
    if (!revertingId) return;
    
    try {
      await revertMutation.mutateAsync({
        historyId: revertingId,
        comment: revertComment,
      });
      
      toast.success("Mudança revertida com sucesso");
      setRevertingId(null);
      setRevertComment("");
      // Recarregar histórico
      refetch();
    } catch (error) {
      toast.error("Erro ao reverter mudança");
    }
  };

  return (
    <div className="space-y-6">
      {/* ... */}
      
      <Table>
        <TableBody>
          {filteredHistory.map((record: any) => (
            <TableRow key={record.id}>
              {/* Colunas existentes */}
              
              {/* NOVO: Coluna de ações */}
              <TableCell>
                {!record.action.startsWith("reverted") && (
                  isCoordinator(user?.role || "") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRevertingId(record.id)}
                      title="Reverter esta mudança"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Dialog de confirmação de reversão */}
      <AlertDialog open={revertingId !== null} onOpenChange={(open) => !open && setRevertingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter Mudança?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação desfará a mudança anterior. Uma nova entrada será criada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="revert-comment">Comentário (opcional)</Label>
            <Textarea
              id="revert-comment"
              placeholder="Por que está revertendo esta mudança?"
              value={revertComment}
              onChange={(e) => setRevertComment(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRevert} disabled={revertMutation.isPending}>
            {revertMutation.isPending ? "Revertendo..." : "Reverter"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### 3.6 Exemplo de Uso

**Cenário:** Coordenador reverte uma atualização errada

1. Acesse "Histórico de Alocações"
2. Encontre registro: "João Silva | Projeto X | Atualização | 50h"
3. Clique no botão "Reverter" (ícone de undo)
4. Dialog aparece: "Reverter Mudança?"
5. Adiciona comentário: "Erro ao atualizar, deveria ser 40h"
6. Clica "Reverter"
7. Alocação volta para 40h
8. Novo registro aparece no histórico: "Revertido: Atualizado de 50h para 40h"

---

## Melhoria 5: Alertas de Mudanças

### 5.1 Objetivo

Notificar gerentes e coordenadores quando alocações de seus projetos são alteradas, mantendo-os informados em tempo real.

### 5.2 Requisitos Funcionais

#### RF 5.2.1 - Notificação ao Criar Alocação

Quando uma nova alocação é criada em um projeto, o gerente do projeto recebe uma notificação.

**Critérios de Aceitação:**
- Gerente recebe notificação: "Novo colaborador alocado: João Silva (40h)"
- Notificação inclui link para visualizar alocação
- Notificação é enviada imediatamente
- Notificação é armazenada no banco de dados

#### RF 5.2.2 - Notificação ao Atualizar Alocação

Quando uma alocação é atualizada, o gerente do projeto recebe uma notificação.

**Critérios de Aceitação:**
- Gerente recebe notificação: "Alocação alterada: João Silva (40h → 50h)"
- Notificação inclui detalhes da mudança
- Notificação é enviada imediatamente
- Notificação é armazenada no banco de dados

#### RF 5.2.3 - Notificação ao Deletar Alocação

Quando uma alocação é deletada, o gerente do projeto recebe uma notificação.

**Critérios de Aceitação:**
- Gerente recebe notificação: "Alocação removida: João Silva (40h)"
- Notificação inclui motivo se houver comentário
- Notificação é enviada imediatamente
- Notificação é armazenada no banco de dados

#### RF 5.2.4 - Centro de Notificações

Usuários devem poder visualizar todas as notificações em um centro centralizado.

**Critérios de Aceitação:**
- Ícone de sino no header com contador de notificações não lidas
- Clique abre dropdown com últimas notificações
- Notificações mostram data/hora, tipo e descrição
- Clique em notificação leva para página relevante
- Botão para marcar como lida
- Botão para deletar notificação

#### RF 5.2.5 - Preferências de Notificação

Usuários devem poder configurar quais notificações desejam receber.

**Critérios de Aceitação:**
- Página de preferências de notificações
- Toggle para cada tipo de notificação
- Opção de notificação por email (opcional)
- Opção de notificação em tempo real (in-app)
- Preferências são salvas no banco de dados

### 5.3 Alterações no Banco de Dados

#### Schema (drizzle/schema.ts)

Adicionar tabela de notificações:

```typescript
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

// Tabela de preferências de notificação
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

**Migração SQL:**

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type ENUM('allocation_created', 'allocation_updated', 'allocation_deleted', 'allocation_reverted') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  relatedAllocationId INT,
  relatedProjectId INT,
  isRead BOOLEAN DEFAULT FALSE NOT NULL,
  actionUrl VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  readAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  allocationCreated BOOLEAN DEFAULT TRUE NOT NULL,
  allocationUpdated BOOLEAN DEFAULT TRUE NOT NULL,
  allocationDeleted BOOLEAN DEFAULT TRUE NOT NULL,
  allocationReverted BOOLEAN DEFAULT TRUE NOT NULL,
  emailNotifications BOOLEAN DEFAULT FALSE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### 5.4 Alterações no Backend

#### Função: createNotification (db.ts)

```typescript
export async function createNotification(data: {
  userId: number;
  type: "allocation_created" | "allocation_updated" | "allocation_deleted" | "allocation_reverted";
  title: string;
  message: string;
  relatedAllocationId?: number;
  relatedProjectId?: number;
  actionUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar preferências do usuário
  const prefs = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, data.userId))
    .limit(1);
  
  const preference = prefs[0];
  
  // Verificar se usuário quer receber este tipo de notificação
  const typeKey = `${data.type}` as keyof typeof preference;
  if (preference && !preference[typeKey]) {
    return null; // Usuário desativou este tipo de notificação
  }
  
  return db.insert(notifications).values(data);
}
```

#### Procedure: allocations.create com Notificação

```typescript
create: protectedProcedure
  .input(z.object({
    employeeId: z.number(),
    projectId: z.number(),
    allocatedHours: z.number().min(1),
    startDate: z.date(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    // Criar alocação
    const allocation = await db.createAllocation(input);
    
    // Registrar no histórico
    await db.recordAllocationHistory({
      allocationId: allocation.id,
      employeeId: input.employeeId,
      projectId: input.projectId,
      allocatedHours: input.allocatedHours,
      startDate: input.startDate,
      endDate: input.endDate,
      action: "created",
      changedBy: ctx.user.id,
      comment: input.comment,
    });
    
    // NOVO: Obter gerente do projeto
    const project = await db.getProjectById(input.projectId);
    const employee = await db.getEmployeeById(input.employeeId);
    
    if (project?.managerId) {
      // Enviar notificação ao gerente
      await db.createNotification({
        userId: project.managerId,
        type: "allocation_created",
        title: "Novo colaborador alocado",
        message: `${employee?.name} foi alocado(a) para ${project.name} com ${input.allocatedHours}h`,
        relatedAllocationId: allocation.id,
        relatedProjectId: input.projectId,
        actionUrl: `/alocacoes`,
      });
    }
    
    return allocation;
  }),
```

#### Procedure: allocations.update com Notificação

```typescript
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    allocatedHours: z.number().min(1).optional(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    // Obter alocação anterior
    const previous = await db.getAllocationById(input.id);
    
    // Atualizar alocação
    const updated = await db.updateAllocation(input);
    
    // Registrar no histórico
    await db.recordAllocationHistory({
      allocationId: input.id,
      employeeId: updated.employeeId,
      projectId: updated.projectId,
      allocatedHours: updated.allocatedHours,
      startDate: updated.startDate,
      endDate: updated.endDate,
      action: "updated",
      changedBy: ctx.user.id,
      comment: input.comment,
      previousAllocatedHours: previous.allocatedHours,
      previousEndDate: previous.endDate,
    });
    
    // NOVO: Enviar notificação ao gerente
    const project = await db.getProjectById(updated.projectId);
    const employee = await db.getEmployeeById(updated.employeeId);
    
    if (project?.managerId) {
      const hoursChange = input.allocatedHours 
        ? `${previous.allocatedHours}h → ${input.allocatedHours}h`
        : `até ${input.endDate?.toLocaleDateString('pt-BR')}`;
      
      await db.createNotification({
        userId: project.managerId,
        type: "allocation_updated",
        title: "Alocação alterada",
        message: `Alocação de ${employee?.name} em ${project.name} foi alterada: ${hoursChange}`,
        relatedAllocationId: input.id,
        relatedProjectId: updated.projectId,
        actionUrl: `/alocacoes`,
      });
    }
    
    return updated;
  }),
```

#### Procedure: notifications.list

```typescript
notifications: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    return db.select().from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
  }),
  
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      return db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, input.id),
          eq(notifications.userId, ctx.user.id)
        ));
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      return db.delete(notifications)
        .where(and(
          eq(notifications.id, input.id),
          eq(notifications.userId, ctx.user.id)
        ));
    }),
  
  preferences: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    const prefs = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);
    
    return prefs[0] || {
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
      
      const existing = await db.select().from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);
      
      if (existing.length > 0) {
        return db.update(notificationPreferences)
          .set(input)
          .where(eq(notificationPreferences.userId, ctx.user.id));
      } else {
        return db.insert(notificationPreferences).values({
          userId: ctx.user.id,
          ...input,
        });
      }
    }),
}),
```

### 5.5 Alterações no Frontend

#### Componente: NotificationBell.tsx

```tsx
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

export function NotificationBell() {
  const { data: notifications, refetch } = trpc.notifications.list.useQuery();
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const deleteNotificationMutation = trpc.notifications.delete.useMutation();
  
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  
  const handleMarkAsRead = async (id: number) => {
    await markAsReadMutation.mutateAsync({ id });
    refetch();
  };
  
  const handleDelete = async (id: number) => {
    await deleteNotificationMutation.mutateAsync({ id });
    refetch();
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
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4">
          <h3 className="font-semibold">Notificações</h3>
        </div>
        
        <DropdownMenuSeparator />
        
        {notifications && notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted transition ${
                  !notification.isRead ? "bg-blue-50" : ""
                }`}
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
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Marcar como lida"
                      >
                        ✓
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notification.id)}
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
          <a href="/notificacoes/preferencias" className="cursor-pointer">
            ⚙️ Preferências
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### Página: NotificationPreferences.tsx

```tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NotificationPreferences() {
  const { data: preferences } = trpc.notifications.preferences.useQuery();
  const updateMutation = trpc.notifications.updatePreferences.useMutation();
  
  const [settings, setSettings] = useState(preferences || {});
  
  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(settings);
      toast.success("Preferências salvas com sucesso");
    } catch (error) {
      toast.error("Erro ao salvar preferências");
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preferências de Notificações</h1>
        <p className="text-muted-foreground mt-2">Configure quais notificações você deseja receber</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>Selecione quais eventos você quer ser notificado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-created">Novo Colaborador Alocado</Label>
              <p className="text-sm text-muted-foreground">Notificar quando um colaborador é alocado em seus projetos</p>
            </div>
            <Switch
              id="allocation-created"
              checked={settings.allocationCreated}
              onCheckedChange={(checked) => setSettings({ ...settings, allocationCreated: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-updated">Alocação Alterada</Label>
              <p className="text-sm text-muted-foreground">Notificar quando uma alocação é modificada</p>
            </div>
            <Switch
              id="allocation-updated"
              checked={settings.allocationUpdated}
              onCheckedChange={(checked) => setSettings({ ...settings, allocationUpdated: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-deleted">Alocação Removida</Label>
              <p className="text-sm text-muted-foreground">Notificar quando uma alocação é deletada</p>
            </div>
            <Switch
              id="allocation-deleted"
              checked={settings.allocationDeleted}
              onCheckedChange={(checked) => setSettings({ ...settings, allocationDeleted: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allocation-reverted">Mudança Revertida</Label>
              <p className="text-sm text-muted-foreground">Notificar quando uma mudança é revertida</p>
            </div>
            <Switch
              id="allocation-reverted"
              checked={settings.allocationReverted}
              onCheckedChange={(checked) => setSettings({ ...settings, allocationReverted: checked })}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Canais de Notificação</CardTitle>
          <CardDescription>Escolha como você quer receber notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications">Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">Receber notificações também por email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar Preferências"}
        </Button>
      </div>
    </div>
  );
}
```

### 5.6 Exemplo de Uso

**Cenário:** Gerente recebe notificação de nova alocação

1. Coordenador cria alocação: João Silva → Projeto X (40h)
2. Gerente do Projeto X recebe notificação no sino
3. Notificação mostra: "Novo colaborador alocado - João Silva foi alocado(a) para Projeto X com 40h"
4. Gerente clica na notificação
5. É levado para página de alocações
6. Pode clicar em "✓" para marcar como lida ou "✕" para deletar

---

## Resumo das Melhorias

| Melhoria | Impacto | Complexidade | Tempo Estimado |
|----------|---------|--------------|-----------------|
| **1. Comentários** | Alto - Melhora rastreabilidade | Média | 4-6 horas |
| **2. Rastrear Quem Mudou** | Alto - Essencial para auditoria | Média | 3-5 horas |
| **3. Reverter Mudanças** | Alto - Permite desfazer erros | Alta | 6-8 horas |
| **5. Alertas de Mudanças** | Muito Alto - Melhora comunicação | Alta | 8-10 horas |

**Tempo Total Estimado:** 21-29 horas de desenvolvimento

---

**Documento de Melhorias - Histórico de Alocações**  
Data: 8 de Novembro de 2025

