# Etapa 2: Rastrear Quem Mudou (changedBy)

## Visão Geral
Esta etapa implementa o rastreamento obrigatório de qual usuário realizou cada mudança no histórico de alocações, criando uma trilha de auditoria completa.

## Objetivos
- Tornar o campo `changedBy` obrigatório no banco de dados
- Garantir que sempre seja preenchido automaticamente com o ID do usuário autenticado
- Exibir o nome do usuário no histórico (não apenas o ID)
- Adicionar filtro por usuário no histórico

## Pré-requisitos
- Etapa 1 concluída (comentários implementados)
- Acesso ao banco de dados MySQL
- Conhecimento do sistema de migrações Drizzle
- Ambiente de desenvolvimento configurado

---

## Passo 1: Alterações no Schema do Banco de Dados

### 1.1 Atualizar Schema (drizzle/schema.ts)

**Arquivo:** `drizzle/schema.ts`

**Localização:** Linha ~116-128 (tabela `allocationHistory`)

**Alteração:**
Modificar o campo `changedBy` para ser obrigatório (`.notNull()`) e adicionar relação com a tabela `users`:

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
  changedBy: int("changedBy").notNull(), // MODIFICADO: agora obrigatório
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Adicionar relação com users (se ainda não existir)
export const allocationHistoryRelations = relations(allocationHistory, ({ one }) => ({
  changedByUser: one(users, {
    fields: [allocationHistory.changedBy],
    references: [users.id],
  }),
}));
```

**Validação:**
- Verificar que `changedBy` tem `.notNull()`
- Confirmar que a relação foi adicionada corretamente

---

### 1.2 Criar Migração do Banco de Dados

**IMPORTANTE:** Antes de criar a migração, precisamos preencher valores NULL existentes.

**Passo 1: Verificar registros com changedBy NULL**
```sql
SELECT COUNT(*) FROM allocation_history WHERE changedBy IS NULL;
```

**Passo 2: Preencher valores NULL (se houver)**
```sql
-- Obter o ID do primeiro usuário admin ou coordenador
-- Substituir 1 pelo ID real de um usuário válido
UPDATE allocation_history 
SET changedBy = 1 
WHERE changedBy IS NULL;
```

**Passo 3: Gerar migração**
```bash
cd /home/mymakecoins/_code/gteam/load-cap
pnpm drizzle-kit generate
```

**Arquivo gerado:** `drizzle/XXXX_description.sql`

**Conteúdo esperado da migração:**
```sql
ALTER TABLE `allocation_history` 
MODIFY COLUMN `changedBy` INT NOT NULL;
```

**Validação:**
- Verificar que não há registros com `changedBy IS NULL`
- Confirmar que a migração foi gerada corretamente

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
- Confirmar no banco de dados:
  ```sql
  DESCRIBE allocation_history;
  -- changedBy deve ser INT NOT NULL
  ```

---

### 1.4 (Opcional) Adicionar Foreign Key

**Nota:** Adicionar foreign key é opcional, mas recomendado para integridade referencial.

**Migração manual:**
```sql
ALTER TABLE allocation_history 
ADD CONSTRAINT fk_allocation_history_user 
FOREIGN KEY (changedBy) REFERENCES users(id);
```

**Validação:**
- Verificar que a constraint foi criada
- Testar que não é possível criar histórico com `changedBy` inexistente

---

## Passo 2: Alterações no Backend

### 2.1 Atualizar Função de Criação de Histórico (server/db.ts)

**Arquivo:** `server/db.ts`

**Localização:** Função `createAllocationHistory` (linha ~243)

**Alteração:**
Adicionar validação para garantir que `changedBy` está presente:

```typescript
export async function createAllocationHistory(data: Omit<AllocationHistory, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validação: changedBy é obrigatório
  if (!data.changedBy) {
    throw new Error("changedBy é obrigatório para criar histórico de alocação");
  }
  
  return db.insert(allocationHistory).values(data);
}
```

**Validação:**
- Verificar que a validação funciona
- Testar erro quando `changedBy` não é fornecido

---

### 2.2 Atualizar Procedure de Criação (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.create` (linha ~254)

**Alteração:**
Garantir que `ctx.user?.id` está presente antes de criar histórico:

```typescript
create: protectedProcedure
  .input(z.object({
    // ... inputs existentes ...
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de criação ...
    
    // Validação: usuário deve estar autenticado
    if (!ctx.user?.id) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "Usuário não autenticado" 
      });
    }
    
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
      changedBy: ctx.user.id, // MODIFICADO: não usa ?? null, já validado acima
      comment: input.comment ?? null,
    });
    
    return allocation;
  }),
```

**Validação:**
- Verificar que erro é lançado se usuário não estiver autenticado
- Confirmar que `changedBy` sempre é preenchido

---

### 2.3 Atualizar Procedure de Atualização (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.update` (linha ~367)

**Alteração:**
Similar ao passo 2.2:

```typescript
update: protectedProcedure
  .input(z.object({
    // ... inputs existentes ...
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de atualização ...
    
    // Validação: usuário deve estar autenticado
    if (!ctx.user?.id) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "Usuário não autenticado" 
      });
    }
    
    // Log to history
    await db.createAllocationHistory({
      // ... dados existentes ...
      changedBy: ctx.user.id, // MODIFICADO: não usa ?? null
      comment: input.comment ?? null,
    });
    
    return updated;
  }),
```

**Validação:**
- Verificar que erro é lançado se usuário não estiver autenticado
- Confirmar que `changedBy` sempre é preenchido

---

### 2.4 Atualizar Procedure de Deleção (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.delete`

**Alteração:**
Similar aos passos anteriores:

```typescript
delete: protectedProcedure
  .input(z.object({
    id: z.number(),
    comment: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // ... código existente de deleção ...
    
    // Validação: usuário deve estar autenticado
    if (!ctx.user?.id) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "Usuário não autenticado" 
      });
    }
    
    // Log to history
    await db.createAllocationHistory({
      // ... dados existentes ...
      changedBy: ctx.user.id, // MODIFICADO: não usa ?? null
      comment: input.comment ?? null,
    });
    
    return { success: true };
  }),
```

**Validação:**
- Verificar que erro é lançado se usuário não estiver autenticado
- Confirmar que `changedBy` sempre é preenchido

---

### 2.5 Atualizar Procedure de Histórico para Incluir Dados do Usuário (server/routers.ts)

**Arquivo:** `server/routers.ts`

**Localização:** `allocations.getHistory` (procurar após outras procedures)

**Alteração:**
Enriquecer o histórico com dados do usuário:

```typescript
getHistory: protectedProcedure
  .input(z.object({
    employeeId: z.number().optional(),
    projectId: z.number().optional(),
  }).optional())
  .query(async ({ input }) => {
    const history = await db.getAllocationHistory(
      input?.employeeId,
      input?.projectId
    );
    
    // Enriquecer com dados do usuário
    const enrichedHistory = await Promise.all(
      history.map(async (record) => {
        try {
          const user = await db.getUserById(record.changedBy);
          return {
            ...record,
            changedByName: user?.name || "Usuário deletado",
            changedByEmail: user?.email || "-",
          };
        } catch (error) {
          // Se usuário não existir, usar valores padrão
          return {
            ...record,
            changedByName: "Usuário deletado",
            changedByEmail: "-",
          };
        }
      })
    );
    
    return enrichedHistory;
  }),
```

**Nota:** Verificar se `getUserById` existe em `server/db.ts`. Se não existir, criar:

```typescript
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}
```

**Validação:**
- Verificar que o histórico retorna `changedByName` e `changedByEmail`
- Testar com usuário deletado (deve mostrar "Usuário deletado")

---

## Passo 3: Alterações no Frontend

### 3.1 Adicionar Coluna "Modificado por" no Histórico (client/src/pages/AllocationHistory.tsx)

**Arquivo:** `client/src/pages/AllocationHistory.tsx`

**Localização:** Dentro da tabela de histórico

**Alteração:**
1. Adicionar `<TableHead>Modificado por</TableHead>` no header
2. Adicionar `<TableCell>` com o nome do usuário no body

**Código a adicionar:**

```typescript
// No TableHeader, adicionar após "Tipo de Mudança":
<TableHead>Modificado por</TableHead>

// No TableBody, adicionar após a célula de tipo:
<TableCell>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help">
        {record.changedByName || "Usuário deletado"}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <p>{record.changedByEmail || "-"}</p>
    </TooltipContent>
  </Tooltip>
</TableCell>
```

**Validação:**
- Verificar que a coluna aparece na tabela
- Confirmar que o nome do usuário é exibido
- Testar tooltip com email
- Verificar que "Usuário deletado" aparece quando apropriado

---

### 3.2 Adicionar Filtro por Usuário (client/src/pages/AllocationHistory.tsx)

**Arquivo:** `client/src/pages/AllocationHistory.tsx`

**Localização:** Seção de filtros

**Alteração:**
1. Adicionar estado para filtro de usuário
2. Adicionar Select para filtrar por usuário
3. Aplicar filtro na lógica

**Código a adicionar:**

```typescript
// Adicionar estado:
const [filterChangedBy, setFilterChangedBy] = useState<number | null>(null);

// Obter lista de usuários únicos que fizeram mudanças
const changedByUsers = Array.from(
  new Map(
    (history || []).map((h: any) => [
      h.changedBy, 
      { 
        id: h.changedBy, 
        name: h.changedByName,
        email: h.changedByEmail 
      }
    ])
  ).values()
).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

// No filtro, adicionar:
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
      <SelectItem value="">Todos</SelectItem>
      {changedByUsers.map((user) => (
        <SelectItem key={user.id} value={user.id.toString()}>
          {user.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

// Na lógica de filtro, adicionar:
if (filterChangedBy) {
  filteredHistory = filteredHistory.filter(
    (h: any) => h.changedBy === filterChangedBy
  );
}
```

**Validação:**
- Verificar que o filtro aparece
- Confirmar que a lista de usuários é populada corretamente
- Testar filtro por usuário específico
- Verificar que funciona em combinação com outros filtros

---

## Passo 4: Testes

### 4.1 Testes de Backend

**Teste 1: Criar alocação sem usuário autenticado**
```bash
# Tentar criar alocação sem autenticação
# Deve retornar erro UNAUTHORIZED
```

**Teste 2: Verificar changedBy sempre preenchido**
```sql
-- Verificar que todos os registros têm changedBy
SELECT COUNT(*) FROM allocation_history WHERE changedBy IS NULL;
-- Deve retornar 0
```

**Teste 3: Histórico com dados do usuário**
```bash
# Buscar histórico via tRPC
# Verificar que changedByName e changedByEmail estão presentes
```

**Teste 4: Usuário deletado**
```bash
# Deletar um usuário que tem histórico
# Buscar histórico
# Verificar que mostra "Usuário deletado"
```

---

### 4.2 Testes de Frontend

**Teste 1: Coluna "Modificado por"**
- [ ] Coluna aparece na tabela
- [ ] Nome do usuário é exibido corretamente
- [ ] Tooltip mostra email ao passar mouse
- [ ] "Usuário deletado" aparece quando apropriado

**Teste 2: Filtro por usuário**
- [ ] Filtro aparece na seção de filtros
- [ ] Lista de usuários é populada corretamente
- [ ] Filtro funciona ao selecionar usuário
- [ ] Filtro funciona em combinação com outros filtros
- [ ] Opção "Todos" limpa o filtro

---

## Passo 5: Validação Final

### 5.1 Checklist de Implementação

- [ ] Migração do banco aplicada com sucesso
- [ ] Campo `changedBy` é NOT NULL no banco
- [ ] Backend valida que `changedBy` está presente
- [ ] Backend sempre preenche `changedBy` com usuário autenticado
- [ ] Histórico retorna dados do usuário (nome e email)
- [ ] Frontend exibe coluna "Modificado por"
- [ ] Filtro por usuário funciona
- [ ] Testes passaram

---

### 5.2 Validação de Dados

**Verificar no banco de dados:**
```sql
-- Verificar estrutura da tabela
DESCRIBE allocation_history;
-- changedBy deve ser INT NOT NULL

-- Verificar que não há NULLs
SELECT COUNT(*) FROM allocation_history WHERE changedBy IS NULL;
-- Deve retornar 0

-- Ver distribuição de mudanças por usuário
SELECT 
  changedBy,
  COUNT(*) as total_mudancas,
  COUNT(CASE WHEN action = 'created' THEN 1 END) as criacoes,
  COUNT(CASE WHEN action = 'updated' THEN 1 END) as atualizacoes,
  COUNT(CASE WHEN action = 'deleted' THEN 1 END) as delecoes
FROM allocation_history
GROUP BY changedBy
ORDER BY total_mudancas DESC;
```

---

## Próximos Passos

Após completar esta etapa, você pode prosseguir para:
- **Etapa 3:** Reverter Mudanças (depende desta etapa)
- **Etapa 5:** Alertas de Mudanças (depende desta etapa)

---

## Notas Técnicas

### Limitações Conhecidas
- Se um usuário for deletado, o histórico mantém a referência mas mostra "Usuário deletado"
- Foreign key é opcional (pode ser adicionada depois se necessário)
- Não há histórico de mudanças de permissões de usuário

### Melhorias Futuras
- Adicionar foreign key constraint
- Página de auditoria mostrando todas as ações de um usuário
- Exportação de relatórios de auditoria
- Notificações quando usuário deletado tem histórico (para migração de dados)

---

**Tempo Estimado:** 3-5 horas
**Complexidade:** Média
**Dependências:** Etapa 1 (recomendado, mas não obrigatório)



