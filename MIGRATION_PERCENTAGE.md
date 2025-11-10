# Plano de Migração: Horas para Percentual de Alocação

## 📋 Visão Geral

Este documento descreve o plano para migrar o sistema de alocação de colaboradores de **horas absolutas** para **percentual de alocação**.

## 🎯 Objetivo

Permitir que as alocações sejam definidas em **percentual** (0-100%) ao invés de horas fixas, facilitando o planejamento e tornando o sistema mais flexível.

## 📊 Estrutura Atual

### Campos Existentes:
- `allocations.allocatedHours` (int) - Horas alocadas por período
- `employees.monthlyCapacityHours` (int) - Capacidade mensal do colaborador (padrão: 160h)

### Cálculos Atuais:
- Total alocado = soma de `allocatedHours`
- Taxa de utilização = (total alocado / capacidade mensal) × 100

## 🔄 Estrutura Proposta

### Opção 1: Adicionar Percentual (Recomendado - Transição Suave)
- Adicionar `allocatedPercentage` (decimal 0-100) na tabela `allocations`
- Manter `allocatedHours` para compatibilidade e cálculo automático
- Permitir entrada por percentual ou horas (com conversão automática)

### Opção 2: Substituir Completamente
- Remover `allocatedHours`
- Usar apenas `allocatedPercentage`
- Calcular horas automaticamente: `hours = (percentage / 100) × monthlyCapacityHours × (dias_periodo / dias_mês)`

## 🛠️ Plano de Implementação

### Fase 1: Schema e Migração do Banco de Dados

1. **Adicionar campo `allocatedPercentage`**
   ```sql
   ALTER TABLE allocations 
   ADD COLUMN allocatedPercentage DECIMAL(5,2) NULL 
   COMMENT 'Percentual de alocação (0-100)';
   ```

2. **Migrar dados existentes**
   - Calcular percentual baseado em horas existentes
   - Fórmula: `percentage = (allocatedHours / (monthlyCapacityHours / semanas_no_periodo)) × 100`

3. **Adicionar campo no `allocation_history`**
   ```sql
   ALTER TABLE allocation_history 
   ADD COLUMN allocatedPercentage DECIMAL(5,2) NULL;
   ```

### Fase 2: Atualização do Backend

1. **Schema Drizzle** (`drizzle/schema.ts`)
   - Adicionar `allocatedPercentage: decimal("allocatedPercentage", { precision: 5, scale: 2 })`

2. **Validação tRPC** (`server/routers.ts`)
   - Aceitar `allocatedPercentage` (0-100) ou `allocatedHours`
   - Se percentual fornecido, calcular horas automaticamente
   - Se horas fornecidas, calcular percentual automaticamente

3. **Funções de Cálculo** (`server/db.ts`)
   - Criar helper: `calculateHoursFromPercentage(percentage, employee, period)`
   - Criar helper: `calculatePercentageFromHours(hours, employee, period)`

### Fase 3: Atualização do Frontend

1. **Formulário de Alocação** (`client/src/pages/Allocations.tsx`)
   - Adicionar campo de percentual (0-100%)
   - Toggle entre "Horas" e "Percentual"
   - Mostrar conversão em tempo real
   - Validação: soma de percentuais não pode exceder 100% por período

2. **Exibição de Dados**
   - Mostrar percentual e horas calculadas
   - Atualizar tabelas e gráficos
   - Dashboard: mostrar percentual médio de utilização

3. **Páginas Afetadas**:
   - `Allocations.tsx` - Formulário principal
   - `EmployeeAllocations.tsx` - Visualização por colaborador
   - `ProjectCapacity.tsx` - Capacidade por projeto
   - `Dashboard.tsx` - Visão geral

### Fase 4: Scripts e Utilitários

1. **Script de Migração de Dados**
   - Converter alocações existentes para percentual
   - Validar conversões
   - Relatório de migração

2. **Atualizar Scripts de Seed**
   - `seed-allocations-2weeks.mjs` - Usar percentual ao invés de horas

## 📐 Fórmulas de Conversão

### Horas para Percentual:
```
percentage = (allocatedHours / (monthlyCapacityHours × (dias_periodo / dias_mês))) × 100
```

### Percentual para Horas:
```
allocatedHours = (allocatedPercentage / 100) × monthlyCapacityHours × (dias_periodo / dias_mês)
```

### Exemplo:
- Colaborador com 160h/mês (40h/semana)
- Período: 1 semana (5 dias úteis)
- Percentual: 50%
- Horas calculadas: 50% × 40h = 20h

## ✅ Vantagens do Modelo Percentual

1. **Flexibilidade**: Fácil ajustar alocação sem calcular horas
2. **Clareza**: Percentual é mais intuitivo (50% = meio período)
3. **Validação**: Soma de percentuais não pode exceder 100%
4. **Escalabilidade**: Funciona independente da capacidade do colaborador

## ⚠️ Considerações

1. **Compatibilidade**: Manter suporte a horas durante período de transição
2. **Validação**: Garantir que soma de percentuais não exceda 100% por período
3. **Histórico**: Manter ambos os valores no `allocation_history`
4. **Performance**: Cálculos podem ser feitos em tempo real ou armazenados

## 🚀 Ordem de Implementação Recomendada

1. ✅ Adicionar campo no schema (migração)
2. ✅ Atualizar backend (validação e cálculos)
3. ✅ Criar script de migração de dados existentes
4. ✅ Atualizar formulário de alocação
5. ✅ Atualizar visualizações e relatórios
6. ✅ Testes e validação
7. ✅ Documentação para usuários

## 📝 Notas de Implementação

- **Período de Transição**: Permitir entrada por horas ou percentual
- **Validação**: Backend sempre valida ambos os campos
- **Padrão**: Se apenas um campo fornecido, calcular o outro automaticamente
- **UI**: Mostrar ambos os valores (percentual e horas calculadas)

