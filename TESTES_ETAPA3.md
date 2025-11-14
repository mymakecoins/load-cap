# Testes da Etapa 3: Reverter Mudanças

## ✅ Testes Automatizados - Banco de Dados

### Script de Teste
**Arquivo:** `test-etapa3-reverter.mjs`

### Resultados dos Testes

#### ✅ Teste 1: Estrutura da Tabela
- ✅ Campo `previousAllocatedHours` existe
- ✅ Campo `previousAllocatedPercentage` existe
- ✅ Campo `previousEndDate` existe
- ✅ Campo `revertedHistoryId` existe

#### ✅ Teste 2: Enum de Action
- ✅ Enum `action` contém `reverted_creation`
- ✅ Enum `action` contém `reverted_update`
- ✅ Enum `action` contém `reverted_deletion`

#### ✅ Teste 3: Preparação de Dados
- ✅ Coordenador de teste disponível
- ✅ Colaborador disponível
- ✅ Projeto disponível

#### ✅ Teste 4: Snapshot em Atualização
- ✅ Snapshot de valores anteriores foi armazenado corretamente

#### ✅ Teste 5: Reversão de Atualização
- ✅ Reversão de atualização foi criada
- ✅ Valores foram restaurados corretamente

#### ✅ Teste 6: Validação de Reversão Duplicada
- ✅ Não há reversões duplicadas

**Total:** 11 testes passaram, 0 falharam ✅

---

## 🧪 Testes Manuais - Interface Web

### Pré-requisitos
1. Servidor de desenvolvimento rodando
2. Usuário coordenador ou admin logado
3. Dados de teste disponíveis (colaboradores, projetos, alocações)

### Teste 1: Botão de Reverter

**Objetivo:** Verificar que o botão aparece apenas para coordenadores

**Passos:**
1. Acesse a página "Histórico de Alocações"
2. Verifique se a coluna "Ações" está visível
3. Verifique se o botão de reverter (ícone RotateCcw) aparece nas linhas de histórico
4. Faça logout e faça login com um usuário não-coordenador
5. Verifique que o botão de reverter NÃO aparece

**Resultado Esperado:**
- ✅ Botão aparece apenas para coordenadores/admins
- ✅ Botão não aparece para usuários comuns

---

### Teste 2: Dialog de Confirmação

**Objetivo:** Verificar funcionamento do dialog de reversão

**Passos:**
1. Clique no botão de reverter em uma linha do histórico
2. Verifique que o dialog abre
3. Digite um comentário no campo de texto
4. Verifique o contador de caracteres (máx. 500)
5. Clique em "Cancelar" - dialog deve fechar
6. Abra o dialog novamente e clique em "Reverter"

**Resultado Esperado:**
- ✅ Dialog abre ao clicar em reverter
- ✅ Campo de comentário funciona
- ✅ Contador de caracteres funciona
- ✅ Botão cancelar fecha dialog
- ✅ Botão reverter executa ação

---

### Teste 3: Reverter Criação de Alocação

**Objetivo:** Verificar que reverter uma criação remove a alocação

**Passos:**
1. Crie uma nova alocação (com comentário opcional)
2. Vá para "Histórico de Alocações"
3. Encontre o registro de criação da alocação
4. Clique no botão de reverter
5. Adicione um comentário (opcional) e confirme
6. Verifique que:
   - A alocação foi removida da lista de alocações
   - Um novo registro aparece no histórico com ação "Revertido: Criação"
   - O registro original não pode mais ser revertido

**Resultado Esperado:**
- ✅ Alocação foi removida
- ✅ Novo registro de histórico criado
- ✅ Tipo de ação mostra "Revertido: Criação"
- ✅ Botão de reverter não aparece mais no registro original

---

### Teste 4: Reverter Atualização de Alocação

**Objetivo:** Verificar que reverter uma atualização restaura valores anteriores

**Passos:**
1. Crie uma alocação com 40 horas
2. Atualize a alocação para 60 horas (com comentário)
3. Vá para "Histórico de Alocações"
4. Encontre o registro de atualização
5. Clique no botão de reverter
6. Confirme a reversão
7. Verifique que:
   - A alocação voltou para 40 horas
   - Um novo registro aparece no histórico com ação "Revertido: Atualização"
   - Os valores foram restaurados corretamente

**Resultado Esperado:**
- ✅ Valores foram restaurados (40 horas)
- ✅ Novo registro de histórico criado
- ✅ Tipo de ação mostra "Revertido: Atualização"
- ✅ Snapshot de valores anteriores foi usado corretamente

---

### Teste 5: Reverter Deleção de Alocação

**Objetivo:** Verificar que reverter uma deleção restaura a alocação

**Passos:**
1. Crie uma alocação
2. Delete a alocação (com comentário)
3. Vá para "Histórico de Alocações"
4. Encontre o registro de deleção
5. Clique no botão de reverter
6. Confirme a reversão
7. Verifique que:
   - A alocação foi restaurada na lista de alocações
   - Um novo registro aparece no histórico com ação "Revertido: Deleção"
   - A alocação está ativa novamente

**Resultado Esperado:**
- ✅ Alocação foi restaurada
- ✅ Novo registro de histórico criado
- ✅ Tipo de ação mostra "Revertido: Deleção"
- ✅ Alocação está ativa e visível

---

### Teste 6: Validação de Permissões

**Objetivo:** Verificar que apenas coordenadores podem reverter

**Passos:**
1. Faça login como usuário não-coordenador
2. Tente acessar a página "Histórico de Alocações"
3. Verifique que o botão de reverter não aparece
4. (Opcional) Tente chamar a API diretamente - deve retornar erro FORBIDDEN

**Resultado Esperado:**
- ✅ Botão não aparece para não-coordenadores
- ✅ API retorna erro FORBIDDEN para não-coordenadores

---

### Teste 7: Reverter Duas Vezes

**Objetivo:** Verificar que não é possível reverter duas vezes

**Passos:**
1. Reverta uma mudança (criação, atualização ou deleção)
2. Vá para "Histórico de Alocações"
3. Tente reverter o mesmo registro novamente
4. Verifique que:
   - O botão de reverter não aparece mais no registro original
   - Se tentar via API, deve retornar erro "já foi revertida"

**Resultado Esperado:**
- ✅ Botão não aparece em registros já revertidos
- ✅ API retorna erro ao tentar reverter duas vezes

---

### Teste 8: Exibição de Tipos de Ação

**Objetivo:** Verificar que todos os tipos de ação são exibidos corretamente

**Passos:**
1. Crie registros de histórico com diferentes ações:
   - Criação
   - Atualização
   - Deleção
   - Reversão de criação
   - Reversão de atualização
   - Reversão de deleção
2. Verifique a coluna "Tipo de Mudança" no histórico

**Resultado Esperado:**
- ✅ "Alocação" para criação
- ✅ "Atualização" para atualização
- ✅ "Remoção" para deleção
- ✅ "Revertido: Criação" para reversão de criação
- ✅ "Revertido: Atualização" para reversão de atualização
- ✅ "Revertido: Deleção" para reversão de deleção

---

## 📋 Checklist de Validação

### Backend
- [x] Migração aplicada com sucesso
- [x] Novos campos existem na tabela
- [x] Enum de action inclui novos valores
- [x] Backend armazena snapshot em atualizações
- [x] Procedure de reversão funciona para todos os tipos
- [x] Validação de permissões funciona
- [x] Validação de reversão duplicada funciona

### Frontend
- [x] Botão de reverter aparece apenas para coordenadores
- [x] Botão não aparece em reversões já revertidas
- [x] Dialog de confirmação funciona
- [x] Campo de comentário funciona
- [x] Exibição de tipos de ação atualizada
- [x] Histórico é recarregado após reversão

---

## 🐛 Problemas Conhecidos

Nenhum problema conhecido no momento.

---

## 📝 Notas

- Os snapshots são armazenados apenas para atualizações (não para criações/deleções)
- Não é possível reverter uma reversão (apenas uma vez)
- Se alocação foi deletada e depois projeto/colaborador foi deletado, reversão pode falhar

---

## 🎯 Próximos Passos

Após completar os testes manuais:
1. Documentar quaisquer problemas encontrados
2. Corrigir bugs se necessário
3. Prosseguir para Etapa 5: Alertas de Mudanças

