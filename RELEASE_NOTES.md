# Release Notes

## Versão 2.0.0

**Data de Release**: Janeiro de 2025

## 🎯 Resumo

Esta release traz melhorias significativas no sistema de histórico de alocações, implementando rastreabilidade completa, funcionalidade de reversão de mudanças e sistema completo de notificações. Todas as mudanças visam melhorar a auditoria, transparência e comunicação entre os membros da equipe.

## 🎉 Principais Funcionalidades

### Histórico de Alocações Aprimorado

#### Comentários nas Mudanças (Etapa 1)
- **Campo de comentário opcional** em todas as operações de alocação
  - Comentários podem ser adicionados ao criar, atualizar ou deletar alocações
  - Limite de 500 caracteres por comentário
  - Comentários são exibidos no histórico com tooltip para textos longos
  - Busca por comentário no histórico de alocações

#### Rastreamento de Usuário (Etapa 2)
- **Campo `changedBy` obrigatório** em todas as mudanças
  - Garantia de que todas as mudanças são rastreadas até o usuário responsável
  - Exibição do nome e email do usuário no histórico (não apenas ID)
  - Tratamento especial para usuários deletados ("Usuário deletado")
  - Filtro por usuário no histórico de alocações
  - Validação no backend para garantir que usuário está autenticado

#### Reversão de Mudanças (Etapa 3)
- **Sistema completo de reversão** para coordenadores e administradores
  - Reverter criações: remove a alocação criada
  - Reverter atualizações: restaura valores anteriores usando snapshot
  - Reverter deleções: restaura alocação deletada
  - Proteção contra reversões duplicadas
  - Comentário opcional ao reverter mudanças
  - Novos tipos de ação no histórico: `reverted_creation`, `reverted_update`, `reverted_deletion`
  - Snapshot automático de valores anteriores em atualizações

#### Sistema de Notificações (Etapa 5)
- **Centro de notificações completo** com sino no header
  - Notificações automáticas para gerentes quando alocações são criadas, atualizadas ou deletadas em seus projetos
  - Contador de notificações não lidas
  - Dropdown com lista de notificações recentes (últimas 20)
  - Marcar notificações como lidas individualmente ou ao clicar
  - Deletar notificações
  - Navegação direta para a página relacionada ao clicar na notificação
  - Ícones visuais por tipo de notificação (➕ criação, ✏️ atualização, 🗑️ deleção, ↩️ reversão)

#### Preferências de Notificação
- **Página de configurações** para personalizar notificações
  - Ativar/desativar notificações por tipo (criação, atualização, deleção, reversão)
  - Preferências são respeitadas pelo sistema (notificações não são criadas se desativadas)
  - Preparado para notificações por email (estrutura criada, funcionalidade futura)

## 🔧 Melhorias

### Banco de Dados
- **Tabela `allocation_history` expandida**
  - Campo `comment` (TEXT) para comentários opcionais
  - Campo `changedBy` agora é NOT NULL (obrigatório)
  - Novos campos de snapshot: `previousAllocatedHours`, `previousAllocatedPercentage`, `previousEndDate`
  - Campo `revertedHistoryId` para rastrear reversões
  - Enum `action` expandido com tipos de reversão

- **Novas tabelas criadas**
  - `notifications`: Armazena notificações dos usuários
  - `notification_preferences`: Armazena preferências de notificação por usuário

### Backend
- **Funções de histórico aprimoradas**
  - Validação obrigatória de `changedBy` em todas as operações
  - Enriquecimento do histórico com dados do usuário (nome e email)
  - Função `getAllocationHistoryById` para buscar histórico específico
  - Snapshot automático de valores anteriores em atualizações

- **Novo router de notificações**
  - `notifications.list`: Lista notificações do usuário
  - `notifications.unreadCount`: Contador de não lidas
  - `notifications.markAsRead`: Marcar como lida
  - `notifications.delete`: Deletar notificação
  - `notifications.preferences`: Obter preferências
  - `notifications.updatePreferences`: Atualizar preferências

- **Integração de notificações**
  - Notificações criadas automaticamente em `allocations.create`
  - Notificações criadas automaticamente em `allocations.update`
  - Notificações criadas automaticamente em `allocations.delete`
  - Respeito às preferências do usuário antes de criar notificação
  - Não notifica se o gerente é quem fez a mudança

- **Nova procedure de reversão**
  - `allocations.revert`: Reverte mudanças no histórico
  - Validação de permissões (apenas coordenadores)
  - Proteção contra reversões duplicadas
  - Suporte a comentários opcionais

### Frontend
- **Página de Histórico de Alocações aprimorada**
  - Coluna de comentários com tooltip para textos longos
  - Coluna "Modificado por" com nome do usuário e tooltip com email
  - Filtro por usuário no histórico
  - Busca por comentário
  - Botão de reverter para coordenadores (com ícone de seta circular)
  - Dialog de confirmação para reversão com campo de comentário
  - Labels melhorados para tipos de ação (incluindo reversões)

- **Formulários de Alocação atualizados**
  - Campo de comentário opcional em criação de alocação
  - Campo de comentário opcional em edição de alocação
  - Campo de comentário opcional em deleção de alocação
  - Contador de caracteres (0/500) em todos os campos de comentário

- **Novo componente NotificationBell**
  - Sino de notificações no header do dashboard
  - Badge com contador de não lidas
  - Dropdown com lista de notificações
  - Ações rápidas (marcar como lida, deletar)
  - Link para preferências de notificação

- **Nova página NotificationPreferences**
  - Interface completa para gerenciar preferências
  - Switches para cada tipo de notificação
  - Preparado para notificações por email (desabilitado por enquanto)

## 🐛 Correções

- Validação de autenticação aprimorada em todas as operações de histórico
- Tratamento de usuários deletados no histórico (exibe "Usuário deletado")
- Prevenção de reversões duplicadas
- Notificações não são criadas se o gerente é quem fez a mudança

## 📝 Instruções de Atualização

### Para Desenvolvedores

1. **Atualize o repositório local:**
   ```bash
   git pull origin main
   ```

2. **Instale/atualize dependências:**
   ```bash
   pnpm install
   ```

3. **Execute as migrações do banco de dados:**
   ```bash
   pnpm db:push
   ```
   ⚠️ **Importante**: As migrações incluem:
   - Adição do campo `comment` na tabela `allocation_history`
   - Modificação de `changedBy` para NOT NULL (valores NULL devem ser preenchidos primeiro)
   - Adição de campos de snapshot e reversão
   - Criação das tabelas `notifications` e `notification_preferences`

4. **Preencha valores NULL de `changedBy` (se necessário):**
   ```sql
   -- Verificar registros com changedBy NULL
   SELECT COUNT(*) FROM allocation_history WHERE changedBy IS NULL;
   
   -- Preencher com ID de um usuário válido (substituir 1 pelo ID real)
   UPDATE allocation_history SET changedBy = 1 WHERE changedBy IS NULL;
   ```

5. **Reinicie o servidor:**
   ```bash
   pnpm dev
   ```

### Para Usuários

- **Histórico de Alocações**: Agora você pode ver quem fez cada mudança e adicionar comentários explicativos
- **Reversão de Mudanças**: Coordenadores podem reverter mudanças acidentais através do botão de reversão no histórico
- **Notificações**: Gerentes recebem notificações automáticas quando alocações de seus projetos são alteradas
- **Preferências**: Configure quais notificações você deseja receber em Configurações > Notificações

## 🔒 Segurança

- Validação obrigatória de autenticação em todas as operações de histórico
- Permissões restritas para reversão (apenas coordenadores e administradores)
- Proteção contra reversões duplicadas
- Validação de propriedade de notificações (usuários só podem ver/gerenciar suas próprias notificações)

## 📚 Documentação

Consulte os seguintes arquivos para mais detalhes:
- `CHANGELOG.md`: Histórico completo de mudanças
- `ETAPA_1_COMENTARIOS.md`: Documentação da Etapa 1 - Comentários
- `ETAPA_2_RASTREAR_USUARIO.md`: Documentação da Etapa 2 - Rastrear Usuário
- `ETAPA_3_REVERTER_MUDANCAS.md`: Documentação da Etapa 3 - Reverter Mudanças
- `ETAPA_5_ALERTAS_MUDANCAS.md`: Documentação da Etapa 5 - Alertas de Mudanças
- `RESUMO_ETAPAS_IMPLEMENTACAO.md`: Visão geral de todas as etapas
- `README.md`: Documentação geral do projeto

## ⚠️ Breaking Changes

### Banco de Dados
- **Campo `changedBy` obrigatório**: Todos os registros de histórico devem ter `changedBy` preenchido
  - Migração falhará se houver valores NULL
  - Execute script de preenchimento antes de aplicar migração

### API
- **Procedures de alocação agora requerem autenticação obrigatória** para criar histórico
- **Novo campo opcional `comment`** em `allocations.create`, `allocations.update` e `allocations.delete`
- **Nova procedure `allocations.revert`** disponível apenas para coordenadores

## 🐛 Problemas Conhecidos

- **Notificações de reversão**: O tipo `allocation_reverted` existe no schema, mas notificações não são criadas automaticamente quando uma reversão acontece (funcionalidade parcial)
- **Notificações por email**: Estrutura criada, mas funcionalidade não implementada (requer configuração SMTP)
- **Notificações em tempo real**: Sistema usa polling manual, WebSockets não implementados

## 🚀 Melhorias Futuras Planejadas

- Implementar notificações de reversão automaticamente
- Adicionar notificações por email (requer SMTP)
- Implementar WebSockets para notificações em tempo real
- Adicionar paginação infinita no centro de notificações
- Limpeza automática de notificações antigas (> 30 dias)
- Agrupamento de notificações similares
- Notificações push no navegador (Service Workers)

## 🙏 Agradecimentos

Agradecemos a todos os colaboradores e usuários pelo feedback e suporte.

---

## Versão 1.1.0

**Data de Release**: 08 de Janeiro de 2025

## 🎯 Resumo

Esta release traz mudanças significativas no sistema de autenticação, migrando de OAuth para autenticação local, além de implementar a funcionalidade de edição de entradas do diário de bordo e suporte aprimorado para imagens.

## 🎉 Principais Funcionalidades

### Autenticação Local
- **Migração completa de OAuth para autenticação local**
  - Login com email e senha
  - Gerenciamento de sessão via cookies seguros
  - Remoção completa da dependência de OAuth externo

### Diário de Bordo
- **Edição de entradas**
  - Criadores podem editar suas próprias entradas
  - Interface de edição completa com editor rico
  - Validação de permissões no backend e frontend

- **Suporte aprimorado para imagens**
  - Campo de conteúdo expandido para MEDIUMTEXT (até 16MB)
  - Suporte para imagens em base64 no editor Quill
  - Tratamento robusto de erros para conteúdo grande

## 🔧 Melhorias

### Configuração e Setup
- Scripts auxiliares para configuração local
- Documentação completa de setup (SETUP_LOCAL.md, SETUP_MYSQL.md, SETUP_NODE.md)
- Wrapper script para drizzle-kit com suporte a variáveis de ambiente

### Editor Quill
- Personalização visual dos botões (cor preta)
- Melhor visibilidade dos controles

### Logs e Debugging
- Logs detalhados em todas as operações críticas
- Mensagens de erro mais informativas
- Tratamento robusto de erros

## 🐛 Correções

- Redirecionamento após login corrigido
- Carregamento de variáveis de ambiente corrigido
- Erro ao salvar entradas com imagens corrigido
- Configuração de cookies para desenvolvimento local

## 🗑️ Removido

- Integração com OAuth externo
- Registro público de usuários
- Rotas e componentes relacionados ao OAuth

## 📝 Instruções de Atualização

### Para Desenvolvedores

1. **Atualize o repositório local:**
   ```bash
   git pull origin main
   ```

2. **Instale/atualize dependências:**
   ```bash
   pnpm install
   ```

3. **Execute as migrações do banco de dados:**
   ```bash
   pnpm db:push
   ```
   ⚠️ **Importante**: A migração alterará o tipo do campo `content` na tabela `project_log_entries` para `MEDIUMTEXT`.

4. **Atualize variáveis de ambiente:**
   - Remova variáveis relacionadas ao OAuth (se existirem)
   - Certifique-se de que `DATABASE_URL` está configurado corretamente no `.env.local`

5. **Reinicie o servidor:**
   ```bash
   pnpm dev
   ```

### Para Usuários

- **Login**: Agora use email e senha ao invés de OAuth
- **Registro**: Não é mais possível criar conta publicamente. Contate um administrador.
- **Diário de Bordo**: Você pode editar suas próprias entradas através do botão "Editar"

## 🔒 Segurança

- Cookies de sessão configurados com `httpOnly: true`
- Configuração de `sameSite` ajustada para desenvolvimento e produção
- Validação de permissões para edição de entradas

## 📚 Documentação

Consulte os seguintes arquivos para mais detalhes:
- `CHANGELOG.md`: Histórico completo de mudanças
- `SETUP_LOCAL.md`: Guia de configuração local
- `SETUP_MYSQL.md`: Troubleshooting do MySQL
- `SETUP_NODE.md`: Configuração do Node.js
- `README.md`: Documentação geral do projeto

## ⚠️ Breaking Changes

### Autenticação
- **OAuth externo removido**: Todos os usuários precisarão fazer login com email/senha
- **Registro público removido**: Apenas administradores podem criar usuários

### Banco de Dados
- **Migração obrigatória**: Execute `pnpm db:push` para aplicar as mudanças no schema

## 🐛 Problemas Conhecidos

Nenhum problema conhecido nesta versão.

## 🙏 Agradecimentos

Agradecemos a todos os colaboradores e usuários pelo feedback e suporte.

---

**Para mais informações, consulte o [CHANGELOG.md](./CHANGELOG.md)**

