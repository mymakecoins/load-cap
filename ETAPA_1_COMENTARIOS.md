# Etapa 1: Adicionar Comentários às Mudanças

## Visão Geral
Esta etapa implementa a funcionalidade de adicionar comentários opcionais às mudanças de alocação, melhorando a rastreabilidade e facilitando auditorias futuras.

## Objetivos
- Permitir adicionar comentários ao criar, atualizar ou deletar alocações
- Exibir comentários no histórico de forma clara e pesquisável
- Armazenar comentários no banco de dados

## Pré-requisitos
- Acesso ao banco de dados MySQL
- Conhecimento do sistema de migrações Drizzle
- Ambiente de desenvolvimento configurado

---

## Passo 1: Alterações no Schema do Banco de Dados

### 1.1 Atualizar Schema (drizzle/schema.ts)

**Arquivo:** `drizzle/schema.ts`

**Localização:** Linha ~116-128 (tabela `allocationHistory`)

**Alteração:**
Adicionar o campo `comment` do tipo `text` após o campo `changedBy`:

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
  action: mysqlEnum("action", ["created", "updated", "deleted"]).notNull(),
  changedBy: int("changedBy"),
  comment: text("comment"), // NOVO CAMPO
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Validação:**
- Verificar que o campo foi adicionado corretamente
- Confirmar que o tipo é `text` (permite textos longos)

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
ALTER TABLE `allocation_history` ADD COLUMN `comment` TEXT NULL AFTER `changedBy`;
```

**Validação:**
- Verificar que a migração foi gerada corretamente
- Confirmar que o campo é `TEXT` e `NULL` (opcional)

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
- Confirmar no banco de dados que a coluna existe:
  ```sql
  DESCRIBE allocation_history;
  ```

---

## Passo 2: Alterações no Backend

### 2.1 Atualizar Função de Criação de Histórico (server/db.ts)

**Arquivo:** `server/db.ts`

**Localização:** Função `createAllocationHistory` (linha ~243)

**Alteração:**
A função já aceita um objeto genérico, então não precisa de alteração. Mas vamos verificar que o tipo está correto.

**Validação:**
- Confirmar que a função aceita o campo `comment` no objeto `data`

---

### 2.2 Atualizar Procedure de Criação (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.create` (linha ~254)

**Alteração:**
1. Adicionar `comment` opcional no input do Zod
2. Passar `comment` para `createAllocationHistory`

**Código a modificar:**

```typescript
create: protectedProcedure
  .input(z.object({
    employeeId: z.number(),
    projectId: z.number(),
    allocatedHours: z.number().int().positive().optional(),
    allocatedPercentage: z.number().min(0).max(100).optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(), // ADICIONAR ESTA LINHA
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente ...
    
    // Log to history
    await db.createAllocationHistory({
      allocationId: null,
      employeeId: input.employeeId,
      projectId: input.projectId,
      allocatedHours,
      allocatedPercentage: allocatedPercentage ? String(allocatedPercentage) : null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      action: "created",
      changedBy: ctx.user?.id ?? null,
      comment: input.comment ?? null, // ADICIONAR ESTA LINHA
    });
    
    return allocation;
  }),
```

**Validação:**
- Verificar que o input aceita `comment` opcional
- Confirmar que o comentário é passado para o histórico
- Testar criação de alocação com e sem comentário

---

### 2.3 Atualizar Procedure de Atualização (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.update` (linha ~367)

**Alteração:**
1. Adicionar `comment` opcional no input do Zod
2. Passar `comment` para `createAllocationHistory`

**Código a modificar:**

```typescript
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    allocatedHours: z.number().int().positive().optional(),
    allocatedPercentage: z.number().min(0).max(100).optional(),
    endDate: z.date().optional(),
    comment: z.string().max(500).optional(), // ADICIONAR ESTA LINHA
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de atualização ...
    
    // Log to history
    await db.createAllocationHistory({
      allocationId: id,
      employeeId: allocation.employeeId,
      projectId: allocation.projectId,
      allocatedHours: finalAllocatedHours,
      allocatedPercentage: finalAllocatedPercentage ? String(finalAllocatedPercentage) : null,
      startDate: allocation.startDate,
      endDate: input.endDate ?? allocation.endDate ?? null,
      action: "updated",
      changedBy: ctx.user?.id ?? null,
      comment: input.comment ?? null, // ADICIONAR ESTA LINHA
    });
    
    return updated;
  }),
```

**Validação:**
- Verificar que o input aceita `comment` opcional
- Confirmar que o comentário é passado para o histórico
- Testar atualização de alocação com e sem comentário

---

### 2.4 Atualizar Procedure de Deleção (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.delete` (procurar após `update`)

**Alteração:**
1. Adicionar `comment` opcional no input do Zod
2. Passar `comment` para `createAllocationHistory`

**Código a modificar:**

```typescript
delete: protectedProcedure
  .input(z.object({
    id: z.number(),
    comment: z.string().max(500).optional(), // ADICIONAR ESTA LINHA
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de deleção ...
    
    // Log to history
    await db.createAllocationHistory({
      allocationId: id,
      employeeId: allocation.employeeId,
      projectId: allocation.projectId,
      allocatedHours: allocation.allocatedHours,
      allocatedPercentage: allocation.allocatedPercentage,
      startDate: allocation.startDate,
      endDate: allocation.endDate ?? null,
      action: "deleted",
      changedBy: ctx.user?.id ?? null,
      comment: input.comment ?? null, // ADICIONAR ESTA LINHA
    });
    
    return { success: true };
  }),
```

**Validação:**
- Verificar que o input aceita `comment` opcional
- Confirmar que o comentário é passado para o histórico
- Testar deleção de alocação com e sem comentário

---

## Passo 3: Alterações no Frontend

### 3.1 Adicionar Campo de Comentário no Formulário de Criação (client/src/pages/Allocations.tsx)

**Arquivo:** `client/src/pages/Allocations.tsx`

**Localização:** Dentro do Dialog de criação (procurar por `<DialogContent>`)

**Alteração:**
1. Adicionar estado para comentário no formulário
2. Adicionar campo Textarea no formulário
3. Passar comentário na mutation

**Código a adicionar:**

```typescript
// No estado do componente, adicionar:
const [comment, setComment] = useState("");

// No formulário, após os campos existentes, adicionar:
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

// Na função handleSubmit, passar comment:
await createMutation.mutateAsync({
  ...formData,
  comment: comment || undefined,
});
```

**Import necessário:**
```typescript
import { Textarea } from "@/components/ui/textarea";
```

**Validação:**
- Verificar que o campo aparece no formulário
- Confirmar que o contador de caracteres funciona
- Testar envio com e sem comentário

---

### 3.2 Adicionar Campo de Comentário no Formulário de Edição (client/src/pages/Allocations.tsx)

**Arquivo:** `client/src/pages/Allocations.tsx`

**Localização:** Dentro do Dialog de edição

**Alteração:**
Similar ao passo 3.1, mas para edição:

```typescript
// Adicionar estado para comentário de edição:
const [editComment, setEditComment] = useState("");

// No formulário de edição, adicionar o mesmo campo Textarea

// Na função de atualização, passar comment:
await updateMutation.mutateAsync({
  id: editingId,
  ...formData,
  comment: editComment || undefined,
});
```

**Validação:**
- Verificar que o campo aparece no formulário de edição
- Confirmar que o comentário é enviado corretamente

---

### 3.3 Adicionar Campo de Comentário no Modal de Deleção (client/src/pages/Allocations.tsx)

**Arquivo:** `client/src/pages/Allocations.tsx`

**Localização:** Modal de confirmação de deleção

**Alteração:**
Adicionar campo de comentário no AlertDialog de deleção:

```typescript
// Adicionar estado:
const [deleteComment, setDeleteComment] = useState("");

// No AlertDialog de deleção, adicionar:
<div className="space-y-2">
  <Label htmlFor="delete-comment">Comentário (opcional)</Label>
  <Textarea
    id="delete-comment"
    placeholder="Por que está removendo esta alocação?"
    value={deleteComment}
    onChange={(e) => setDeleteComment(e.target.value)}
    maxLength={500}
    rows={3}
  />
  <p className="text-xs text-muted-foreground">
    {deleteComment.length}/500 caracteres
  </p>
</div>

// Na função de deleção, passar comment:
await deleteMutation.mutateAsync({
  id: allocationId,
  comment: deleteComment || undefined,
});
```

**Validação:**
- Verificar que o campo aparece no modal de deleção
- Confirmar que o comentário é enviado corretamente

---

### 3.4 Adicionar Coluna de Comentário no Histórico (client/src/pages/AllocationHistory.tsx)

**Arquivo:** `client/src/pages/AllocationHistory.tsx`

**Localização:** Dentro da tabela de histórico

**Alteração:**
1. Adicionar `<TableHead>Comentário</TableHead>` no header
2. Adicionar `<TableCell>` com o comentário no body

**Código a adicionar:**

```typescript
// No TableHeader, adicionar:
<TableHead>Comentário</TableHead>

// No TableBody, adicionar após as outras células:
<TableCell className="max-w-xs">
  {record.comment ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate cursor-help block">
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

**Imports necessários:**
```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**Validação:**
- Verificar que a coluna aparece na tabela
- Confirmar que comentários longos são truncados
- Testar tooltip ao passar mouse
- Verificar que comentários vazios mostram "-"

---

### 3.5 Adicionar Filtro de Pesquisa por Comentário (client/src/pages/AllocationHistory.tsx)

**Arquivo:** `client/src/pages/AllocationHistory.tsx`

**Localização:** Seção de filtros

**Alteração:**
Adicionar campo de busca que filtra por comentário:

```typescript
// Adicionar estado:
const [searchComment, setSearchComment] = useState("");

// No filtro, adicionar:
<Input
  placeholder="Buscar por comentário..."
  value={searchComment}
  onChange={(e) => setSearchComment(e.target.value)}
/>

// Na lógica de filtro, adicionar:
if (searchComment) {
  filteredHistory = filteredHistory.filter((h: any) =>
    h.comment?.toLowerCase().includes(searchComment.toLowerCase())
  );
}
```

**Validação:**
- Verificar que o campo de busca aparece
- Confirmar que a busca funciona corretamente
- Testar busca com texto parcial

---

## Passo 4: Testes

### 4.1 Testes de Backend

**Teste 1: Criar alocação com comentário**
```bash
# Via tRPC ou interface
# Criar alocação com comment: "Teste de comentário"
# Verificar no banco que o comentário foi salvo
```

**Teste 2: Criar alocação sem comentário**
```bash
# Criar alocação sem comment
# Verificar no banco que comment é NULL
```

**Teste 3: Atualizar alocação com comentário**
```bash
# Atualizar alocação com comment
# Verificar no histórico que o comentário aparece
```

**Teste 4: Deletar alocação com comentário**
```bash
# Deletar alocação com comment
# Verificar no histórico que o comentário aparece
```

---

### 4.2 Testes de Frontend

**Teste 1: Formulário de criação**
- [ ] Campo de comentário aparece
- [ ] Contador de caracteres funciona (0/500)
- [ ] Limite de 500 caracteres é respeitado
- [ ] Comentário é enviado ao criar alocação

**Teste 2: Formulário de edição**
- [ ] Campo de comentário aparece
- [ ] Comentário é enviado ao atualizar alocação

**Teste 3: Modal de deleção**
- [ ] Campo de comentário aparece
- [ ] Comentário é enviado ao deletar alocação

**Teste 4: Histórico**
- [ ] Coluna "Comentário" aparece na tabela
- [ ] Comentários são exibidos corretamente
- [ ] Comentários longos são truncados
- [ ] Tooltip mostra comentário completo
- [ ] Comentários vazios mostram "-"
- [ ] Busca por comentário funciona

---

## Passo 5: Validação Final

### 5.1 Checklist de Implementação

- [ ] Migração do banco aplicada com sucesso
- [ ] Campo `comment` existe na tabela `allocation_history`
- [ ] Backend aceita `comment` em create, update e delete
- [ ] Frontend tem campo de comentário em todos os formulários
- [ ] Histórico exibe comentários corretamente
- [ ] Busca por comentário funciona
- [ ] Validação de 500 caracteres funciona
- [ ] Testes passaram

---

### 5.2 Validação de Dados

**Verificar no banco de dados:**
```sql
-- Verificar estrutura da tabela
DESCRIBE allocation_history;

-- Verificar alguns registros com comentários
SELECT id, action, comment, createdAt 
FROM allocation_history 
WHERE comment IS NOT NULL 
LIMIT 10;
```

---

## Próximos Passos

Após completar esta etapa, você pode prosseguir para:
- **Etapa 2:** Rastrear Quem Mudou (changedBy obrigatório)
- **Etapa 3:** Reverter Mudanças
- **Etapa 5:** Alertas de Mudanças

---

## Notas Técnicas

### Limitações Conhecidas
- Comentários não são editáveis após criação (apenas visualizáveis)
- Busca por comentário é case-insensitive mas não suporta regex
- Comentários não são exportados em relatórios (pode ser implementado depois)

### Melhorias Futuras
- Suporte a markdown nos comentários
- Anexos/imagens nos comentários
- Histórico de edição de comentários (se permitir edição futura)
- Exportação de comentários em relatórios

---

**Tempo Estimado:** 4-6 horas
**Complexidade:** Média
**Dependências:** Nenhuma (pode ser implementada independentemente)



