# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.1.0] - 2025-01-08

### 🎉 Novas Funcionalidades

#### Diário de Bordo
- **Edição de Entradas**: Implementada funcionalidade para editar entradas do diário de bordo
  - Apenas o criador da entrada pode editá-la (regra de negócio RN1)
  - Botão "Editar" visível apenas para o criador da entrada
  - Suporte completo para edição de conteúdo rico com imagens

#### Autenticação Local
- **Migração de OAuth para Autenticação Local**: Sistema migrado de Manus OAuth para autenticação local
  - Login com email e senha
  - Gerenciamento de sessão via cookies seguros
  - Redirecionamento automático para dashboard após login

### 🔧 Melhorias

#### Diário de Bordo
- **Suporte a Imagens**: Campo `content` alterado de `TEXT` para `MEDIUMTEXT` (até 16MB)
  - Suporte para imagens em base64 no editor Quill
  - Tratamento de erros para conteúdo muito grande
  - Mensagens de erro mais claras e informativas

#### Editor Quill
- **Personalização Visual**: Cores dos botões da barra de ferramentas ajustadas
  - Ícones e botões em preto para melhor visibilidade
  - Mantida cor de fundo padrão da barra de ferramentas

#### Configuração e Desenvolvimento
- **Scripts de Setup**: Novos scripts e documentação para facilitar configuração local
  - `scripts/drizzle-with-env.mjs`: Wrapper para executar drizzle-kit com variáveis de ambiente
  - `scripts/setup-mysql-user.mjs`: Script auxiliar para configuração do MySQL
  - `update-passwords.mjs`: Script para atualizar senhas dos usuários
  - `SETUP_LOCAL.md`: Documentação completa para configuração local
  - `SETUP_MYSQL.md`: Guia de troubleshooting para MySQL
  - `SETUP_NODE.md`: Documentação para configuração do Node.js

#### Logs e Debug
- **Logging Detalhado**: Adicionados logs detalhados para facilitar debugging
  - Logs de autenticação (login, verificação de senha)
  - Logs de banco de dados (conexão, queries)
  - Logs de criação e edição de entradas do diário
  - Tratamento de erros mais robusto com mensagens detalhadas

### 🐛 Correções

#### Autenticação
- **Redirecionamento após Login**: Corrigido redirecionamento para dashboard após login bem-sucedido
  - Uso de `window.location.href` para garantir atualização completa do estado
  - Invalidação e refetch do cache de autenticação
  - Configuração de cookies ajustada para desenvolvimento local (`sameSite: "lax"`)

#### Banco de Dados
- **Carregamento de Variáveis de Ambiente**: Corrigido carregamento de `.env.local` em scripts e servidor
  - Configuração explícita de `dotenv` para carregar `.env.local` primeiro
  - Wrapper script para `drizzle-kit` garantir carregamento correto de variáveis
  - Correção de erros "DATABASE_URL is required" e "require is not defined"

#### Diário de Bordo
- **Edição de Entradas com Imagens**: Corrigido erro ao salvar entradas com imagens
  - Campo `content` alterado para `MEDIUMTEXT` no banco de dados
  - Migração de banco de dados aplicada automaticamente
  - Tratamento de erros de tamanho de payload

### 🗑️ Removido

#### Autenticação
- **Manus OAuth**: Removida integração com Manus OAuth
  - Removido `server/_core/oauth.ts`
  - Removido `server/_core/sdk.ts`
  - Removidas rotas OAuth (`/api/oauth/callback`)
  - Removidas variáveis de ambiente relacionadas a OAuth

#### Registro Público
- **Página de Registro**: Removida funcionalidade de registro público
  - Removida rota `/register`
  - Removido componente `Register.tsx`
  - Removido procedimento `auth.register` do backend
  - Apenas administradores podem criar usuários através da interface de gerenciamento

### 📝 Mudanças Técnicas

#### Backend
- **Autenticação**: Migrado de OAuth SDK para autenticação baseada em cookies
  - Leitura de user ID do cookie de sessão
  - Verificação de usuário no contexto do tRPC
  - Suporte a autenticação opcional para procedures públicas

#### Frontend
- **Roteamento**: Removida rota de registro
- **Componentes**: Removido componente `Register.tsx`
- **Hooks**: Removido código relacionado a localStorage do Manus OAuth

#### Banco de Dados
- **Schema**: Campo `content` da tabela `project_log_entries` alterado para `MEDIUMTEXT`
- **Migrações**: Nova migração `0007_cute_sunset_bain.sql` para alterar tipo do campo

### 📚 Documentação

- Adicionado `SETUP_LOCAL.md`: Guia completo de configuração local
- Adicionado `SETUP_MYSQL.md`: Guia de troubleshooting para MySQL
- Adicionado `SETUP_NODE.md`: Guia de configuração do Node.js
- Atualizado `README.md`: Documentação atualizada com novas instruções de setup
- Removidas referências a OAuth e registro público

### 🔒 Segurança

- Cookies de sessão configurados com `httpOnly: true`
- `sameSite: "lax"` em desenvolvimento local, `sameSite: "none"` em produção com HTTPS
- Validação de permissões para edição de entradas do diário (apenas criador)

---

## [1.0.0] - Versão Anterior

### Funcionalidades Iniciais
- Sistema de autenticação com OAuth Manus
- CRUD de clientes, colaboradores e projetos
- Sistema de alocações com histórico
- Dashboard com visões e relatórios
- Diário de bordo com editor Quill
- Controle de acesso baseado em papéis (RBAC)

