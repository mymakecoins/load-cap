# Testes da Etapa 5: Sistema de Notificações

## ✅ Status dos Testes Automatizados

### Teste 1: Estrutura do Banco de Dados
- ✅ **Tabela `notifications` existe** - 11 colunas criadas corretamente
- ✅ **Tabela `notification_preferences` existe** - 9 colunas criadas corretamente

### Teste 2: Notificações Criadas
- ⚠️ **Pendente** - Requer dados de teste (alocações criadas)

### Teste 3: Preferências de Notificação
- ⚠️ **Pendente** - Requer acesso à página de preferências

### Teste 4: Contador de Não Lidas
- ⚠️ **Pendente** - Requer notificações criadas

---

## 🧪 Como Executar os Testes Automatizados

```bash
cd /home/mymakecoins/_code/gteam/load-cap
node test-etapa5-notifications.mjs
```

---

## 📋 Checklist de Testes Manuais

### Backend - Criação de Notificações

#### Teste 1: Criar Notificação ao Criar Alocação
- [ ] Fazer login como **coordenador**
- [ ] Criar uma nova alocação em um projeto que tenha um gerente
- [ ] Verificar no banco de dados que notificação foi criada:
  ```sql
  SELECT * FROM notifications 
  WHERE type = 'allocation_created' 
  ORDER BY createdAt DESC LIMIT 1;
  ```
- [ ] Verificar que o gerente do projeto recebeu a notificação
- [ ] Verificar que o coordenador NÃO recebeu notificação (quem criou)

#### Teste 2: Criar Notificação ao Atualizar Alocação
- [ ] Fazer login como **coordenador**
- [ ] Atualizar uma alocação existente (alterar horas ou data fim)
- [ ] Verificar no banco que notificação foi criada:
  ```sql
  SELECT * FROM notifications 
  WHERE type = 'allocation_updated' 
  ORDER BY createdAt DESC LIMIT 1;
  ```
- [ ] Verificar mensagem de mudança na notificação

#### Teste 3: Criar Notificação ao Deletar Alocação
- [ ] Fazer login como **coordenador**
- [ ] Deletar uma alocação existente
- [ ] Verificar no banco que notificação foi criada:
  ```sql
  SELECT * FROM notifications 
  WHERE type = 'allocation_deleted' 
  ORDER BY createdAt DESC LIMIT 1;
  ```

### Backend - Preferências de Notificação

#### Teste 4: Preferências Bloqueiam Notificações
- [ ] Fazer login como **gerente**
- [ ] Acessar `/configuracoes/notificacoes`
- [ ] Desativar "Novo Colaborador Alocado"
- [ ] Salvar preferências
- [ ] Fazer login como **coordenador**
- [ ] Criar uma nova alocação em projeto deste gerente
- [ ] Verificar que NOTIFICAÇÃO NÃO foi criada (preferência bloqueou)
- [ ] Verificar no banco:
  ```sql
  SELECT * FROM notification_preferences WHERE userId = [ID_DO_GERENTE];
  ```

#### Teste 5: Contador de Não Lidas
- [ ] Criar várias alocações em projetos diferentes
- [ ] Verificar contador via API:
  ```bash
  # Via tRPC ou interface
  ```
- [ ] Marcar uma notificação como lida
- [ ] Verificar que contador diminuiu

### Frontend - Componente NotificationBell

#### Teste 6: Exibição do Sino
- [ ] Verificar que sino aparece no header (desktop e mobile)
- [ ] Verificar que contador de não lidas aparece quando há notificações
- [ ] Verificar que contador mostra "9+" quando há mais de 9 não lidas

#### Teste 7: Dropdown de Notificações
- [ ] Clicar no sino
- [ ] Verificar que dropdown abre
- [ ] Verificar que notificações são exibidas
- [ ] Verificar que notificações não lidas têm fundo destacado
- [ ] Verificar ícones por tipo de notificação:
  - ➕ allocation_created
  - ✏️ allocation_updated
  - 🗑️ allocation_deleted
  - ↩️ allocation_reverted

#### Teste 8: Interações com Notificações
- [ ] Clicar em uma notificação não lida
  - [ ] Verificar que marca como lida automaticamente
  - [ ] Verificar que navega para URL de ação
- [ ] Clicar no botão "✓" (marcar como lida)
  - [ ] Verificar que notificação é marcada como lida
  - [ ] Verificar que contador diminui
- [ ] Clicar no botão "✕" (deletar)
  - [ ] Verificar que notificação é removida
  - [ ] Verificar toast de sucesso

### Frontend - Página de Preferências

#### Teste 9: Página de Preferências
- [ ] Acessar `/configuracoes/notificacoes`
- [ ] Verificar que página carrega
- [ ] Verificar que switches mostram estado atual
- [ ] Alterar alguns switches
- [ ] Clicar em "Salvar Preferências"
- [ ] Verificar toast de sucesso
- [ ] Verificar que preferências foram salvas no banco

#### Teste 10: Navegação para Preferências
- [ ] Clicar no sino de notificações
- [ ] Clicar em "⚙️ Preferências" no dropdown
- [ ] Verificar que navega para `/configuracoes/notificacoes`

---

## 🔍 Validações no Banco de Dados

### Verificar Notificações Criadas
```sql
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
```

### Verificar Preferências
```sql
SELECT 
  userId,
  allocationCreated,
  allocationUpdated,
  allocationDeleted,
  allocationReverted,
  emailNotifications
FROM notification_preferences;
```

### Verificar Distribuição de Tipos
```sql
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN isRead = false THEN 1 ELSE 0 END) as nao_lidas
FROM notifications
GROUP BY type;
```

### Verificar Contador por Usuário
```sql
SELECT 
  userId,
  COUNT(*) as total,
  SUM(CASE WHEN isRead = false THEN 1 ELSE 0 END) as nao_lidas
FROM notifications
GROUP BY userId
ORDER BY nao_lidas DESC;
```

---

## 🐛 Problemas Conhecidos e Soluções

### Problema: Notificações não aparecem
**Solução:**
1. Verificar se projeto tem gerente atribuído
2. Verificar se gerente não é quem criou a alocação
3. Verificar preferências do usuário
4. Verificar logs do servidor para erros

### Problema: Contador não atualiza
**Solução:**
1. Verificar se query está sendo executada
2. Verificar cache do React Query
3. Recarregar página

### Problema: Preferências não salvam
**Solução:**
1. Verificar console do navegador para erros
2. Verificar logs do servidor
3. Verificar se usuário está autenticado

---

## 📊 Estatísticas Esperadas

Após criar algumas alocações, você deve ver:

- **Notificações criadas:** Uma para cada ação (create/update/delete) em projetos com gerentes
- **Tipos de notificação:** 
  - `allocation_created` - quando alocação é criada
  - `allocation_updated` - quando alocação é atualizada
  - `allocation_deleted` - quando alocação é deletada
- **Status:** Notificações começam como `isRead = false`

---

## ✅ Critérios de Sucesso

### Backend
- ✅ Notificações são criadas automaticamente em create/update/delete
- ✅ Preferências bloqueiam notificações quando desativadas
- ✅ Contador de não lidas funciona corretamente
- ✅ Marcar como lida atualiza `isRead` e `readAt`

### Frontend
- ✅ Sino aparece no header
- ✅ Contador mostra número correto
- ✅ Dropdown exibe notificações
- ✅ Interações funcionam (marcar como lida, deletar, navegar)
- ✅ Página de preferências funciona
- ✅ Preferências são salvas e aplicadas

---

## 🎯 Próximos Passos Após Testes

1. **Se todos os testes passarem:**
   - ✅ Sistema está pronto para uso
   - ✅ Documentar funcionalidades para usuários
   - ✅ Considerar melhorias futuras (email, WebSockets)

2. **Se algum teste falhar:**
   - 🔍 Verificar logs do servidor
   - 🔍 Verificar console do navegador
   - 🔍 Verificar banco de dados
   - 🔍 Reportar problema com detalhes

---

## 📝 Notas de Teste

- **Data:** [Preencher data dos testes]
- **Testador:** [Preencher nome]
- **Ambiente:** [Dev/Test/Prod]
- **Observações:** [Preencher observações]

---

**Última atualização:** $(date)

