# Etapa 3: Reverter Mudanças

## Visão Geral
Esta etapa implementa a funcionalidade de reverter mudanças no histórico de alocações, permitindo que coordenadores desfaçam ações anteriores e restaurar alocações ao estado anterior.

## Objetivos
- Permitir reverter criações, atualizações e deleções de alocações
- Armazenar snapshot de valores anteriores para permitir reversão de atualizações
- Registrar reversões como novas ações no histórico
- Restringir funcionalidade apenas a coordenadores e admins

## Pré-requisitos
- Etapa 1 concluída (comentários implementados)
- Etapa 2 concluída (changedBy obrigatório)
- Acesso ao banco de dados MySQL
- Conhecimento do sistema de migrações Drizzle
- Ambiente de desenvolvimento configurado

---

## Passo 1: Alterações no Schema do Banco de Dados

### 1.1 Atualizar Schema (drizzle/schema.ts)

**Arquivo:** `drizzle/schema.ts`

**Localização:** Linha ~116-128 (tabela `allocationHistory`)

**Alteração:**
1. Adicionar novos valores ao enum `action`
2. Adicionar campos para snapshot de valores anteriores
3. Adicionar campo para referenciar histórico revertido

```typescript
export const allocationHistory = mysqlTable("allocation_history", {
  id: int("id").autoincrement().primaryKey(),
  allocationId: int("allocationId"),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  allocatedHours: int("allocatedHours").notNull(),
  allocatedPercentage: decimal("allocatedPercentage", { precision: 5, scale: 2 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  action: mysqlEnum("action", [
    "created",
    "updated",
    "deleted",
    "reverted_creation",    // NOVO
    "reverted_update",       // NOVO
    "reverted_deletion",     // NOVO
  ]).notNull(),
  changedBy: int("changedBy").notNull(),
  comment: text("comment"),
  previousAllocatedHours: int("previousAllocatedHours"), // NOVO - para reverter updates
  previousAllocatedPercentage: decimal("previousAllocatedPercentage", { precision: 5, scale: 2 }), // NOVO
  previousEndDate: timestamp("previousEndDate"),          // NOVO - para reverter updates
  revertedHistoryId: int("revertedHistoryId"),            // NOVO - referência ao histórico revertido
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Validação:**
- Verificar que os novos valores foram adicionados ao enum
- Confirmar que os novos campos foram adicionados

---

### 1.2 Criar Migração do Banco de Dados

**Comando:**
```bash
cd /home/mymakecoins/_code/gteam/load-cap
pnpm drizzle-kit generate
```

**Arquivo gerado:** `drizzle/XXXX_description.sql`

**Conteúdo esperado da migração:**
```sql
-- Adicionar novos campos
ALTER TABLE `allocation_history` 
ADD COLUMN `previousAllocatedHours` INT NULL AFTER `comment`,
ADD COLUMN `previousAllocatedPercentage` DECIMAL(5,2) NULL AFTER `previousAllocatedHours`,
ADD COLUMN `previousEndDate` TIMESTAMP NULL AFTER `previousAllocatedPercentage`,
ADD COLUMN `revertedHistoryId` INT NULL AFTER `previousEndDate`;

-- Modificar enum de action
ALTER TABLE `allocation_history` 
MODIFY COLUMN `action` ENUM(
  'created', 'updated', 'deleted',
  'reverted_creation', 'reverted_update', 'reverted_deletion'
) NOT NULL;
```

**Validação:**
- Verificar que a migração foi gerada corretamente
- Confirmar que todos os campos foram incluídos

---

### 1.3 Aplicar Migração

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
- Confirmar no banco de dados que as colunas existem:
  ```sql
  DESCRIBE allocation_history;
  ```

---

## Passo 2: Alterações no Backend

### 2.1 Atualizar Função de Criação de Histórico (server/db.ts)

**Arquivo:** `server/db.ts`

**Localização:** Função `createAllocationHistory` (linha ~243)

**Alteração:**
A função já aceita um objeto genérico, então não precisa de alteração. Mas vamos verificar que aceita os novos campos.

**Validação:**
- Confirmar que a função aceita os novos campos opcionais

---

### 2.2 Atualizar Procedure de Atualização para Armazenar Snapshot (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.update` (linha ~367)

**Alteração:**
Armazenar valores anteriores antes de atualizar:

```typescript
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    allocatedHours: z.number().int().positive().optional(),
    allocatedPercentage: z.number().min(0).max(100).optional(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // ... validações existentes ...
    
    // Obter alocação anterior para snapshot
    const allocation = await db.getAllocationById(input.id);
    if (!allocation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Alocacao nao encontrada" });
    }
    
    // ... lógica de atualização existente ...
    
    // Log to history COM SNAPSHOT
    await db.createAllocationHistory({
      allocationId: id,
      employeeId: allocation.employeeId,
      projectId: allocation.projectId,
      allocatedHours: finalAllocatedHours,
      allocatedPercentage: finalAllocatedPercentage ? String(finalAllocatedPercentage) : null,
      startDate: allocation.startDate,
      endDate: input.endDate ?? allocation.endDate ?? null,
      action: "updated",
      changedBy: ctx.user.id,
      comment: input.comment ?? null,
      // NOVO: Snapshot de valores anteriores
      previousAllocatedHours: allocation.allocatedHours,
      previousAllocatedPercentage: allocation.allocatedPercentage,
      previousEndDate: allocation.endDate ?? null,
    });
    
    return updated;
  }),
```

**Validação:**
- Verificar que valores anteriores são armazenados
- Testar atualização e verificar snapshot no histórico

---

### 2.3 Criar Função para Obter Histórico por ID (server/db.ts)

**Arquivo:** `server/db.ts`

**Localização:** Após `getAllocationHistory`

**Alteração:**
Adicionar função para buscar um registro de histórico específico:

```typescript
export async function getAllocationHistoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(allocationHistory)
    .where(eq(allocationHistory.id, id))
    .limit(1);
  
  return result[0] || null;
}
```

**Validação:**
- Verificar que a função retorna o registro correto
- Testar com ID inexistente (deve retornar null)

---

### 2.4 Criar Procedure de Reversão (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** Dentro do router `allocations`, após `delete`

**Alteração:**
Criar nova procedure `revert`:

```typescript
revert: protectedProcedure
  .input(z.object({
    historyId: z.number(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Verificar permissão
    if (!isCoordinator(ctx.user?.role || "")) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Apenas coordenadores podem reverter mudanças" 
      });
    }
    
    // Verificar autenticação
    if (!ctx.user?.id) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "Usuário não autenticado" 
      });
    }
    
    // Obter registro de histórico
    const historyRecord = await db.getAllocationHistoryById(input.historyId);
    if (!historyRecord) {
      throw new TRPCError({ 
        code: "NOT_FOUND", 
        message: "Registro de histórico não encontrado" 
      });
    }
    
    // Verificar se já foi revertido
    const alreadyReverted = await db.getAllocationHistory();
    const isReverted = alreadyReverted.some(
      (h: any) => h.revertedHistoryId === input.historyId
    );
    if (isReverted) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Esta mudança já foi revertida" 
      });
    }
    
    let result;
    
    if (historyRecord.action === "created") {
      // Reverter criação = deletar alocação
      if (historyRecord.allocationId) {
        await db.deleteAllocation(historyRecord.allocationId);
      }
      
      result = await db.createAllocationHistory({
        allocationId: historyRecord.allocationId ?? null,
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: historyRecord.allocatedHours,
        allocatedPercentage: historyRecord.allocatedPercentage,
        startDate: historyRecord.startDate,
        endDate: historyRecord.endDate ?? null,
        action: "reverted_creation",
        changedBy: ctx.user.id,
        comment: input.comment || `Revertido: Alocação criada em ${new Date(historyRecord.createdAt).toLocaleString('pt-BR')}`,
        revertedHistoryId: input.historyId,
      });
      
    } else if (historyRecord.action === "updated") {
      // Reverter atualização = restaurar valores anteriores
      if (!historyRecord.allocationId) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Não é possível reverter atualização: alocação não encontrada" 
        });
      }
      
      // Restaurar valores anteriores
      const restoreData: any = {};
      if (historyRecord.previousAllocatedHours !== null) {
        restoreData.allocatedHours = historyRecord.previousAllocatedHours;
      }
      if (historyRecord.previousAllocatedPercentage !== null) {
        restoreData.allocatedPercentage = String(historyRecord.previousAllocatedPercentage);
      }
      if (historyRecord.previousEndDate !== null) {
        restoreData.endDate = historyRecord.previousEndDate;
      }
      
      await db.updateAllocation(historyRecord.allocationId, restoreData);
      
      // Obter alocação atualizada para histórico
      const updatedAllocation = await db.getAllocationById(historyRecord.allocationId);
      
      result = await db.createAllocationHistory({
        allocationId: historyRecord.allocationId,
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: updatedAllocation?.allocatedHours || historyRecord.previousAllocatedHours || 0,
        allocatedPercentage: updatedAllocation?.allocatedPercentage || historyRecord.previousAllocatedPercentage,
        startDate: historyRecord.startDate,
        endDate: updatedAllocation?.endDate ?? historyRecord.previousEndDate ?? null,
        action: "reverted_update",
        changedBy: ctx.user.id,
        comment: input.comment || `Revertido: Atualização de ${historyRecord.previousAllocatedHours}h para ${historyRecord.allocatedHours}h`,
        revertedHistoryId: input.historyId,
      });
      
    } else if (historyRecord.action === "deleted") {
      // Reverter deleção = restaurar alocação
      const restoredAllocation = await db.createAllocation({
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: historyRecord.allocatedHours,
        allocatedPercentage: historyRecord.allocatedPercentage,
        startDate: historyRecord.startDate,
        endDate: historyRecord.endDate ?? null,
        isActive: true,
      });
      
      result = await db.createAllocationHistory({
        allocationId: restoredAllocation.id,
        employeeId: historyRecord.employeeId,
        projectId: historyRecord.projectId,
        allocatedHours: historyRecord.allocatedHours,
        allocatedPercentage: historyRecord.allocatedPercentage,
        startDate: historyRecord.startDate,
        endDate: historyRecord.endDate ?? null,
        action: "reverted_deletion",
        changedBy: ctx.user.id,
        comment: input.comment || `Revertido: Alocação deletada em ${new Date(historyRecord.createdAt).toLocaleString('pt-BR')}`,
        revertedHistoryId: input.historyId,
      });
    } else {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Não é possível reverter este tipo de ação" 
      });
    }
    
    return { success: true, message: "Mudança revertida com sucesso", historyId: result.id };
  }),
```

**Validação:**
- Verificar que apenas coordenadores podem reverter
- Testar reversão de criação
- Testar reversão de atualização
- Testar reversão de deleção
- Verificar que não é possível reverter duas vezes

---

## Passo 3: Alterações no Frontend

### 3.1 Adicionar Botão de Reverter no Histórico (client/src/pages/AllocationHistory.tsx)

**Arquivo:** `client/src/pages/AllocationHistory.tsx`

**Localização:** Dentro da tabela de histórico

**Alteração:**
1. Adicionar coluna "Ações" no header
2. Adicionar botão de reverter em cada linha
3. Adicionar dialog de confirmação

**Código a adicionar:**

```typescript
// Imports necessários
import { RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/src/_core/hooks/useAuth";

// No componente, adicionar estados:
const [revertingId, setRevertingId] = useState<number | null>(null);
const [revertComment, setRevertComment] = useState("");
const revertMutation = trpc.allocations.revert.useMutation();
const { user } = useAuth();

// Função para verificar se é coordenador
const isCoordinator = (role: string) => role === "coordinator" || role === "admin";

// Função para verificar se pode reverter
const canRevert = (record: any) => {
  return !record.action.startsWith("reverted") && isCoordinator(user?.role || "");
};

// Função para reverter
const handleRevert = async () => {
  if (!revertingId) return;
  
  try {
    await revertMutation.mutateAsync({
      historyId: revertingId,
      comment: revertComment || undefined,
    });
    
    toast.success("Mudança revertida com sucesso");
    setRevertingId(null);
    setRevertComment("");
    // Recarregar histórico
    refetch();
  } catch (error: any) {
    toast.error(error.message || "Erro ao reverter mudança");
  }
};

// No TableHeader, adicionar:
<TableHead>Ações</TableHead>

// No TableBody, adicionar após as outras células:
<TableCell>
  {canRevert(record) && (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setRevertingId(record.id)}
      title="Reverter esta mudança"
    >
      <RotateCcw className="w-4 h-4" />
    </Button>
  )}
</TableCell>

// Após a tabela, adicionar dialog:
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
      <p className="text-xs text-muted-foreground">
        {revertComment.length}/500 caracteres
      </p>
    </div>
    
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction 
        onClick={handleRevert} 
        disabled={revertMutation.isPending}
      >
        {revertMutation.isPending ? "Revertendo..." : "Reverter"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Imports necessários:**
```typescript
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
```

**Validação:**
- Verificar que botão aparece apenas para coordenadores
- Verificar que botão não aparece em reversões já revertidas
- Testar dialog de confirmação
- Testar reversão com e sem comentário

---

### 3.2 Atualizar Exibição de Tipo de Mudança (client/src/pages/AllocationHistory.tsx)

**Arquivo:** `client/src/pages/AllocationHistory.tsx`

**Localização:** Célula de "Tipo de Mudança"

**Alteração:**
Adicionar labels para os novos tipos de ação:

```typescript
const getActionLabel = (action: string) => {
  switch (action) {
    case "created":
      return "Alocação";
    case "updated":
      return "Atualização";
    case "deleted":
      return "Remoção";
    case "reverted_creation":
      return "Revertido: Criação";
    case "reverted_update":
      return "Revertido: Atualização";
    case "reverted_deletion":
      return "Revertido: Deleção";
    default:
      return action;
  }
};

// Na célula de tipo:
<TableCell>
  {getActionLabel(record.action)}
</TableCell>
```

**Validação:**
- Verificar que todos os tipos são exibidos corretamente
- Testar visualização de reversões

---

## Passo 4: Testes

### 4.1 Testes de Backend

**Teste 1: Reverter criação**
```bash
# Criar alocação
# Reverter criação via tRPC
# Verificar que alocação foi deletada
# Verificar que novo registro de histórico foi criado
```

**Teste 2: Reverter atualização**
```bash
# Criar alocação
# Atualizar alocação (mudar horas)
# Reverter atualização via tRPC
# Verificar que valores foram restaurados
# Verificar que novo registro de histórico foi criado
```

**Teste 3: Reverter deleção**
```bash
# Criar alocação
# Deletar alocação
# Reverter deleção via tRPC
# Verificar que alocação foi restaurada
# Verificar que novo registro de histórico foi criado
```

**Teste 4: Permissões**
```bash
# Tentar reverter como usuário não-coordenador
# Deve retornar erro FORBIDDEN
```

**Teste 5: Reverter duas vezes**
```bash
# Reverter uma mudança
# Tentar reverter novamente
# Deve retornar erro "já foi revertida"
```

---

### 4.2 Testes de Frontend

**Teste 1: Botão de reverter**
- [ ] Botão aparece apenas para coordenadores
- [ ] Botão não aparece em reversões já revertidas
- [ ] Ícone é exibido corretamente

**Teste 2: Dialog de confirmação**
- [ ] Dialog abre ao clicar em reverter
- [ ] Campo de comentário funciona
- [ ] Botão cancelar fecha dialog
- [ ] Botão reverter executa ação

**Teste 3: Reversão de criação**
- [ ] Reverter criação remove alocação
- [ ] Novo registro aparece no histórico
- [ ] Tipo de ação mostra "Revertido: Criação"

**Teste 4: Reversão de atualização**
- [ ] Reverter atualização restaura valores
- [ ] Novo registro aparece no histórico
- [ ] Tipo de ação mostra "Revertido: Atualização"

**Teste 5: Reversão de deleção**
- [ ] Reverter deleção restaura alocação
- [ ] Novo registro aparece no histórico
- [ ] Tipo de ação mostra "Revertido: Deleção"

---

## Passo 5: Validação Final

### 5.1 Checklist de Implementação

- [ ] Migração do banco aplicada com sucesso
- [ ] Novos campos existem na tabela
- [ ] Enum de action inclui novos valores
- [ ] Backend armazena snapshot em atualizações
- [ ] Procedure de reversão funciona para todos os tipos
- [ ] Validação de permissões funciona
- [ ] Frontend exibe botão de reverter
- [ ] Dialog de confirmação funciona
- [ ] Testes passaram

---

### 5.2 Validação de Dados

**Verificar no banco de dados:**
```sql
-- Verificar estrutura da tabela
DESCRIBE allocation_history;

-- Verificar registros de reversão
SELECT 
  id,
  action,
  revertedHistoryId,
  comment,
  createdAt
FROM allocation_history
WHERE action LIKE 'reverted_%'
ORDER BY createdAt DESC
LIMIT 10;

-- Verificar snapshots em atualizações
SELECT 
  id,
  action,
  allocatedHours,
  previousAllocatedHours,
  createdAt
FROM allocation_history
WHERE action = 'updated'
  AND previousAllocatedHours IS NOT NULL
ORDER BY createdAt DESC
LIMIT 10;
```

---

## Próximos Passos

Após completar esta etapa, você pode prosseguir para:
- **Etapa 5:** Alertas de Mudanças (pode usar reversões nas notificações)

---

## Notas Técnicas

### Limitações Conhecidas
- Não é possível reverter uma reversão (apenas uma vez)
- Snapshots são armazenados apenas para atualizações (não para criações/deleções)
- Se alocação foi deletada e depois o projeto/colaborador foi deletado, reversão pode falhar

### Melhorias Futuras
- Permitir reverter reversões (desfazer desfazer)
- Histórico de reversões encadeadas
- Validação de integridade antes de reverter (verificar se dados ainda existem)
- Notificações quando reversão é feita

---

**Tempo Estimado:** 6-8 horas
**Complexidade:** Alta
**Dependências:** Etapa 1 e Etapa 2 (obrigatórias)



