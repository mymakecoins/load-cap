# Release Notes - Versão 1.1.0

**Data de Release**: 08 de Janeiro de 2025

## 🎯 Resumo

Esta release traz mudanças significativas no sistema de autenticação, migrando de OAuth Manus para autenticação local, além de implementar a funcionalidade de edição de entradas do diário de bordo e suporte aprimorado para imagens.

## 🎉 Principais Funcionalidades

### Autenticação Local
- **Migração completa de OAuth para autenticação local**
  - Login com email e senha
  - Gerenciamento de sessão via cookies seguros
  - Remoção completa da dependência do Manus OAuth

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

- Integração com Manus OAuth
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
- **OAuth Manus removido**: Todos os usuários precisarão fazer login com email/senha
- **Registro público removido**: Apenas administradores podem criar usuários

### Banco de Dados
- **Migração obrigatória**: Execute `pnpm db:push` para aplicar as mudanças no schema

## 🐛 Problemas Conhecidos

Nenhum problema conhecido nesta versão.

## 🙏 Agradecimentos

Agradecemos a todos os colaboradores e usuários pelo feedback e suporte.

---

**Para mais informações, consulte o [CHANGELOG.md](./CHANGELOG.md)**

