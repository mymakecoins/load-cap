# Migração de Dados de Alocações

Este documento descreve o script de migração que converte dados existentes de alocações para incluir tanto horas quanto percentual.

## 📋 O que o script faz?

O script `migrate-allocations-data.mjs` percorre todas as alocações e registros de histórico no banco de dados e:

1. **Para alocações que têm apenas horas**: Calcula e salva o percentual correspondente
2. **Para alocações que têm apenas percentual**: Calcula e salva as horas correspondentes
3. **Para alocações que já têm ambos**: Mantém os valores existentes (pula)
4. **Para alocações sem nenhum valor**: Registra erro e pula

O mesmo processo é aplicado ao histórico de alocações (`allocation_history`).

## 🚀 Como executar

### Opção 1: Usando npm/pnpm

```bash
pnpm db:migrate:allocations
```

### Opção 2: Executar diretamente

```bash
node migrate-allocations-data.mjs
```

## ⚙️ Pré-requisitos

1. **Variáveis de ambiente configuradas**: O script precisa de `DATABASE_URL` configurado no arquivo `.env.local` ou `.env`

2. **Banco de dados acessível**: Certifique-se de que o banco de dados está rodando e acessível

3. **Backup recomendado**: Antes de executar a migração em produção, faça um backup do banco de dados

## 📊 O que o script exibe?

O script fornece feedback detalhado durante a execução:

```
🚀 Iniciando migração de dados de alocações

============================================================

🔄 Iniciando migração de dados de alocações...

📊 Buscando alocações...
✅ Encontradas 150 alocações ativas

👥 Buscando colaboradores...
✅ Encontrados 25 colaboradores

  📝 Alocação 1: Calculando percentual (45.50%) a partir de 80h
  ✅ Alocação 1 atualizada com sucesso
  📝 Alocação 2: Calculando horas (120h) a partir de 60.00%
  ✅ Alocação 2 atualizada com sucesso
  ...

✅ Migração de alocações concluída:
   - Atualizadas: 120
   - Já completas (puladas): 30
   - Erros: 0
```

## 🔍 Como funciona o cálculo?

### Cálculo de Percentual a partir de Horas

O script usa a seguinte fórmula:

```
Percentual = (Horas Alocadas / Horas Disponíveis no Período) × 100
```

Onde:
- **Horas Disponíveis no Período** = (Capacidade Mensal / 22 dias úteis) × Dias Úteis no Período
- **Dias Úteis** = Dias entre início e fim, excluindo sábados e domingos

### Cálculo de Horas a partir de Percentual

O script usa a seguinte fórmula:

```
Horas = (Percentual / 100) × Horas Disponíveis no Período
```

## ⚠️ Observações Importantes

1. **Dias úteis**: O script assume ~22 dias úteis por mês (excluindo sábados e domingos)

2. **Arredondamento**: 
   - Horas são arredondadas para o inteiro mais próximo
   - Percentuais são arredondados para 2 casas decimais

3. **Alocações sem data de fim**: Se uma alocação não tiver data de fim, o script assume um período de 7 dias

4. **Colaboradores não encontrados**: Se um colaborador não for encontrado, a alocação será pulada e um aviso será exibido

5. **Transações**: O script não usa transações. Se ocorrer um erro, algumas atualizações podem já ter sido aplicadas. Por isso, é recomendado fazer backup antes.

## 🔄 Reversão

Se precisar reverter a migração, você pode:

1. Restaurar o backup do banco de dados, ou
2. Executar manualmente SQL para limpar os campos calculados:

```sql
-- Limpar percentuais calculados (se necessário)
UPDATE allocations SET allocatedPercentage = NULL WHERE ...;

-- Limpar horas calculadas (se necessário)
UPDATE allocations SET allocatedHours = NULL WHERE ...;
```

## ✅ Verificação pós-migração

Após executar a migração, você pode verificar se tudo está correto:

```sql
-- Verificar alocações sem percentual
SELECT COUNT(*) FROM allocations 
WHERE isActive = 1 
AND allocatedPercentage IS NULL;

-- Verificar alocações sem horas
SELECT COUNT(*) FROM allocations 
WHERE isActive = 1 
AND allocatedHours IS NULL;

-- Verificar histórico sem percentual
SELECT COUNT(*) FROM allocation_history 
WHERE allocatedPercentage IS NULL;

-- Verificar histórico sem horas
SELECT COUNT(*) FROM allocation_history 
WHERE allocatedHours IS NULL;
```

Todos os resultados devem ser 0 após uma migração bem-sucedida.

## 🐛 Troubleshooting

### Erro: "DATABASE_URL não configurado"

**Solução**: Configure a variável `DATABASE_URL` no arquivo `.env.local` ou `.env`:

```env
DATABASE_URL=mysql://usuario:senha@host:porta/banco
```

### Erro: "Colaborador não encontrado"

**Causa**: A alocação referencia um colaborador que não existe ou foi deletado.

**Solução**: Verifique se há alocações órfãs no banco de dados e limpe-as se necessário.

### Valores calculados parecem incorretos

**Causa**: Pode haver diferenças na capacidade mensal do colaborador ou nas datas.

**Solução**: Verifique:
1. Se a capacidade mensal do colaborador está correta
2. Se as datas de início e fim estão corretas
3. Se o período de alocação está dentro do esperado

## 📝 Notas

- O script é **idempotente**: pode ser executado múltiplas vezes sem causar problemas
- Alocações que já têm ambos os campos serão puladas
- O script processa tanto `allocations` quanto `allocation_history`
- Logs detalhados são exibidos para facilitar o acompanhamento

