# Exemplo de Implementação: Migração para Percentual

Este documento mostra exemplos práticos de código para implementar a migração de horas para percentual.

## 1. Atualização do Schema (drizzle/schema.ts)

```typescript
import { decimal } from "drizzle-orm/mysql-core";

export const allocations = mysqlTable("allocations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  
  // Manter allocatedHours para compatibilidade
  allocatedHours: int("allocatedHours").notNull(),
  
  // Novo campo: percentual de alocação (0-100)
  allocatedPercentage: decimal("allocatedPercentage", { 
    precision: 5, 
    scale: 2 
  }), // Ex: 50.00 = 50%
  
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

## 2. Funções Helper para Cálculo (server/utils/allocations.ts)

```typescript
/**
 * Calcula horas baseado em percentual de alocação
 */
export function calculateHoursFromPercentage(
  percentage: number,
  monthlyCapacityHours: number,
  startDate: Date,
  endDate: Date | null
): number {
  if (!endDate) {
    // Se não há data fim, assumir 1 semana
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }
  
  // Calcular dias úteis no período
  const daysInPeriod = getBusinessDays(startDate, endDate);
  const daysInMonth = 22; // Aproximação: ~22 dias úteis por mês
  
  // Horas disponíveis no período
  const availableHoursInPeriod = (monthlyCapacityHours / daysInMonth) * daysInPeriod;
  
  // Horas alocadas = percentual × horas disponíveis
  return Math.round((percentage / 100) * availableHoursInPeriod);
}

/**
 * Calcula percentual baseado em horas alocadas
 */
export function calculatePercentageFromHours(
  hours: number,
  monthlyCapacityHours: number,
  startDate: Date,
  endDate: Date | null
): number {
  if (!endDate) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }
  
  const daysInPeriod = getBusinessDays(startDate, endDate);
  const daysInMonth = 22;
  const availableHoursInPeriod = (monthlyCapacityHours / daysInMonth) * daysInPeriod;
  
  if (availableHoursInPeriod === 0) return 0;
  
  return parseFloat(((hours / availableHoursInPeriod) * 100).toFixed(2));
}

/**
 * Calcula dias úteis entre duas datas
 */
function getBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
```

## 3. Atualização do Router (server/routers.ts)

```typescript
allocations: router({
  create: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      projectId: z.number().int().positive(),
      // Aceitar horas OU percentual
      allocatedHours: z.number().int().positive().optional(),
      allocatedPercentage: z.number().min(0).max(100).optional(),
      startDate: z.date(),
      endDate: z.date().optional(),
    })
    .refine(
      (data) => data.allocatedHours !== undefined || data.allocatedPercentage !== undefined,
      { message: "Forneça allocatedHours ou allocatedPercentage" }
    ))
    .mutation(async ({ input, ctx }) => {
      if (!isCoordinator(ctx.user?.role || "")) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Apenas coordenadores podem criar alocações" 
        });
      }
      
      // Buscar colaborador para obter capacidade mensal
      const employee = await db.getEmployeeById(input.employeeId);
      if (!employee) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
      }
      
      let allocatedHours = input.allocatedHours;
      let allocatedPercentage = input.allocatedPercentage;
      
      // Se forneceu percentual, calcular horas
      if (allocatedPercentage !== undefined && allocatedHours === undefined) {
        allocatedHours = calculateHoursFromPercentage(
          allocatedPercentage,
          employee.monthlyCapacityHours,
          input.startDate,
          input.endDate || null
        );
      }
      
      // Se forneceu horas, calcular percentual
      if (allocatedHours !== undefined && allocatedPercentage === undefined) {
        allocatedPercentage = calculatePercentageFromHours(
          allocatedHours,
          employee.monthlyCapacityHours,
          input.startDate,
          input.endDate || null
        );
      }
      
      // Validar que soma de percentuais não exceda 100% no período
      const existingAllocations = await db.getAllocationsByEmployee(input.employeeId);
      const overlappingAllocations = existingAllocations.filter(alloc => {
        // Verificar sobreposição de períodos
        return datesOverlap(
          input.startDate,
          input.endDate || new Date(),
          alloc.startDate,
          alloc.endDate || new Date()
        );
      });
      
      const totalPercentage = overlappingAllocations.reduce(
        (sum, alloc) => sum + (alloc.allocatedPercentage || 0),
        0
      );
      
      if (totalPercentage + (allocatedPercentage || 0) > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Alocação excede 100% do tempo disponível. Total atual: ${totalPercentage.toFixed(2)}%`
        });
      }
      
      const allocation = await db.createAllocation({
        employeeId: input.employeeId,
        projectId: input.projectId,
        allocatedHours: allocatedHours!,
        allocatedPercentage: allocatedPercentage!,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: true,
      });
      
      // Criar histórico
      await db.createAllocationHistory({
        allocationId: allocation.insertId,
        employeeId: input.employeeId,
        projectId: input.projectId,
        allocatedHours: allocatedHours!,
        allocatedPercentage: allocatedPercentage!,
        startDate: input.startDate,
        endDate: input.endDate,
        action: "created",
        changedBy: ctx.user!.id,
      });
      
      return allocation;
    }),
});
```

## 4. Atualização do Formulário (client/src/pages/Allocations.tsx)

```typescript
const [inputMode, setInputMode] = useState<"hours" | "percentage">("percentage");
const [formData, setFormData] = useState({
  employeeId: 0,
  projectId: 0,
  allocatedHours: 0,
  allocatedPercentage: 0,
  startDate: "",
  endDate: "",
});

// Calcular conversão em tempo real
const calculatedValue = useMemo(() => {
  if (!formData.employeeId || !formData.startDate) return null;
  
  const employee = employees?.find(e => e.id === formData.employeeId);
  if (!employee) return null;
  
  const start = new Date(formData.startDate);
  const end = formData.endDate ? new Date(formData.endDate) : null;
  
  if (inputMode === "percentage") {
    // Calcular horas a partir do percentual
    const hours = calculateHoursFromPercentage(
      formData.allocatedPercentage,
      employee.monthlyCapacityHours,
      start,
      end
    );
    return { hours, percentage: formData.allocatedPercentage };
  } else {
    // Calcular percentual a partir das horas
    const percentage = calculatePercentageFromHours(
      formData.allocatedHours,
      employee.monthlyCapacityHours,
      start,
      end
    );
    return { hours: formData.allocatedHours, percentage };
  }
}, [formData, inputMode, employees]);

// No JSX:
<div className="space-y-4">
  {/* Toggle entre Horas e Percentual */}
  <div className="flex gap-2">
    <Button
      type="button"
      variant={inputMode === "percentage" ? "default" : "outline"}
      onClick={() => setInputMode("percentage")}
    >
      Percentual
    </Button>
    <Button
      type="button"
      variant={inputMode === "hours" ? "default" : "outline"}
      onClick={() => setInputMode("hours")}
    >
      Horas
    </Button>
  </div>
  
  {/* Campo de entrada baseado no modo */}
  {inputMode === "percentage" ? (
    <div className="space-y-2">
      <Label htmlFor="allocatedPercentage">
        Percentual de Alocação (%) *
      </Label>
      <Input
        id="allocatedPercentage"
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={formData.allocatedPercentage}
        onChange={(e) => setFormData({
          ...formData,
          allocatedPercentage: parseFloat(e.target.value) || 0
        })}
      />
      {calculatedValue && (
        <p className="text-sm text-muted-foreground">
          ≈ {calculatedValue.hours} horas
        </p>
      )}
    </div>
  ) : (
    <div className="space-y-2">
      <Label htmlFor="allocatedHours">Horas Alocadas *</Label>
      <Input
        id="allocatedHours"
        type="number"
        min="0"
        value={formData.allocatedHours}
        onChange={(e) => setFormData({
          ...formData,
          allocatedHours: parseInt(e.target.value) || 0
        })}
      />
      {calculatedValue && (
        <p className="text-sm text-muted-foreground">
          ≈ {calculatedValue.percentage.toFixed(2)}% da capacidade
        </p>
      )}
    </div>
  )}
</div>
```

## 5. Script de Migração de Dados

```javascript
// migrate-to-percentage.mjs
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrateAllocations() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Buscar todas as alocações ativas
    const [allocations] = await connection.execute(
      `SELECT a.*, e.monthlyCapacityHours 
       FROM allocations a
       JOIN employees e ON a.employeeId = e.id
       WHERE a.isActive = 1 AND a.allocatedPercentage IS NULL`
    );
    
    console.log(`Migrando ${allocations.length} alocações...`);
    
    for (const alloc of allocations) {
      const startDate = new Date(alloc.startDate);
      const endDate = alloc.endDate ? new Date(alloc.endDate) : null;
      
      // Calcular percentual
      const percentage = calculatePercentageFromHours(
        alloc.allocatedHours,
        alloc.monthlyCapacityHours,
        startDate,
        endDate
      );
      
      // Atualizar registro
      await connection.execute(
        `UPDATE allocations 
         SET allocatedPercentage = ? 
         WHERE id = ?`,
        [percentage, alloc.id]
      );
      
      console.log(`✓ Alocação ${alloc.id}: ${alloc.allocatedHours}h → ${percentage}%`);
    }
    
    console.log('✅ Migração concluída!');
  } finally {
    await connection.end();
  }
}

migrateAllocations();
```

## 6. Migração SQL

```sql
-- Adicionar coluna allocatedPercentage
ALTER TABLE allocations 
ADD COLUMN allocatedPercentage DECIMAL(5,2) NULL 
COMMENT 'Percentual de alocação (0-100)';

-- Adicionar no histórico também
ALTER TABLE allocation_history 
ADD COLUMN allocatedPercentage DECIMAL(5,2) NULL;

-- Criar índice para melhor performance em consultas
CREATE INDEX idx_allocations_percentage ON allocations(allocatedPercentage);
```

## 7. Validação no Frontend

```typescript
// Validar soma de percentuais não exceda 100%
const validateAllocationPercentage = async (
  employeeId: number,
  percentage: number,
  startDate: Date,
  endDate: Date | null,
  excludeAllocationId?: number
) => {
  const existingAllocations = await trpc.allocations.getByEmployee.query({
    employeeId
  });
  
  const overlapping = existingAllocations.filter(alloc => {
    if (excludeAllocationId && alloc.id === excludeAllocationId) return false;
    return datesOverlap(startDate, endDate, alloc.startDate, alloc.endDate);
  });
  
  const totalPercentage = overlapping.reduce(
    (sum, alloc) => sum + (alloc.allocatedPercentage || 0),
    0
  );
  
  if (totalPercentage + percentage > 100) {
    throw new Error(
      `A soma das alocações (${totalPercentage.toFixed(2)}% + ${percentage}%) excede 100%`
    );
  }
};
```

## Ordem de Execução

1. **Criar migração SQL** e executar `pnpm db:push`
2. **Atualizar schema TypeScript** (drizzle/schema.ts)
3. **Criar funções helper** (server/utils/allocations.ts)
4. **Atualizar routers** (server/routers.ts)
5. **Executar script de migração** de dados existentes
6. **Atualizar frontend** (formulários e visualizações)
7. **Testar e validar**

