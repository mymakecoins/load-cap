# Configuração do Ambiente Local

Este guia explica como configurar e executar a aplicação localmente com dados de exemplo.

## 📋 Pré-requisitos

- Node.js 22+ instalado
- pnpm 9+ instalado
- MySQL 8.0+ ou TiDB instalado e rodando
- Arquivo de dump do banco de dados: `tmp/database-dump-2025-11-08.json`

## 🚀 Passo a Passo

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Banco de Dados
DATABASE_URL=mysql://root:root@localhost:3306/team_management

# Autenticação JWT (usado para cookies de sessão)
JWT_SECRET=your-secret-key-change-in-production

# Configurações da Aplicação
VITE_APP_TITLE=Sistema de Gestão de Times
VITE_APP_LOGO=/logo.jpeg

# Ambiente
NODE_ENV=development
PORT=3000
```

**Nota**: Ajuste `DATABASE_URL` de acordo com suas credenciais do MySQL.

### 3. Criar Banco de Dados

```bash
# Conecte ao MySQL
mysql -u root -p

# Crie o banco de dados
CREATE DATABASE team_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Saia do MySQL
EXIT;
```

### 4. Executar Migrações

```bash
pnpm db:push
```

Este comando cria as tabelas no banco de dados baseado no schema definido em `drizzle/schema.ts`.

### 5. Popular Banco de Dados com Dados de Exemplo

```bash
# Usar o arquivo padrão (tmp/database-dump-2025-11-08.json)
pnpm db:seed

# Limpar tabelas antes de inserir (recomendado na primeira vez)
pnpm db:seed:clear

# Ou especificar outro arquivo
node seed-database.mjs /caminho/para/seu/arquivo.json

# Limpar e inserir de um arquivo específico
node seed-database.mjs /caminho/para/seu/arquivo.json --clear
```

O script irá:
- Ler o arquivo JSON de dump
- Inserir os dados nas tabelas na ordem correta (respeitando foreign keys)
- Manter os IDs originais dos registros
- Atualizar registros existentes se já existirem

### 6. Iniciar Aplicação

```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📊 Estrutura dos Dados

O arquivo de dump contém os seguintes dados:

- **users**: Usuários do sistema (admin, coordenadores, gerentes, etc.)
- **clients**: Clientes da fábrica
- **employees**: Colaboradores (desenvolvedores, QAs, gerentes)
- **projects**: Projetos ativos e concluídos
- **allocations**: Alocações de colaboradores em projetos
- **projectLogEntries**: Entradas de diário dos projetos

## 🔧 Troubleshooting

### Erro: "DATABASE_URL não configurado"

Certifique-se de que o arquivo `.env.local` existe e contém a variável `DATABASE_URL` corretamente configurada.

### Erro: "Cannot connect to database"

1. Verifique se o MySQL está rodando:
   ```bash
   sudo systemctl status mysql
   # ou
   docker ps | grep mysql
   ```

2. Teste a conexão:
   ```bash
   mysql -u root -p -h localhost
   ```

3. Verifique se a URL está correta no `.env.local`

### Erro: "Access denied for user 'root'@'localhost'" (ER_ACCESS_DENIED_NO_PASSWORD_ERROR)

Este erro ocorre quando o MySQL está configurado para usar autenticação via socket (`auth_socket`) ao invés de senha. 

**Solução rápida:**

1. Conecte ao MySQL:
   ```bash
   sudo mysql
   ```

2. Execute os comandos SQL:
   ```sql
   -- Opção 1: Criar novo usuário (recomendado)
   CREATE DATABASE IF NOT EXISTS team_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'team_management'@'localhost' IDENTIFIED BY 'team_management_password';
   GRANT ALL PRIVILEGES ON team_management.* TO 'team_management'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. Atualize o `.env.local`:
   ```env
   DATABASE_URL=mysql://team_management:team_management_password@localhost:3306/team_management
   ```

   **Ou Opção 2: Alterar root para usar senha:**
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
   FLUSH PRIVILEGES;
   EXIT;
   ```

> **📖 Para mais detalhes**, consulte [SETUP_MYSQL.md](./SETUP_MYSQL.md)

### Erro: "Table doesn't exist"

Execute as migrações primeiro:
```bash
pnpm db:push
```

### Erro: "Foreign key constraint fails"

O script de seed já insere os dados na ordem correta. Se ainda assim ocorrer erro:
1. Verifique se todas as dependências existem (ex: se um projeto referencia um cliente, o cliente deve existir)
2. Verifique se os IDs no arquivo JSON estão corretos

### Limpar e Recriar Banco de Dados

Se precisar começar do zero:

```bash
# 1. Conecte ao MySQL
mysql -u root -p

# 2. Remova o banco
DROP DATABASE team_management;

# 3. Crie novamente
CREATE DATABASE team_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. Saia
EXIT;

# 5. Execute as migrações
pnpm db:push

# 6. Execute o seed
pnpm db:seed
```

## 📝 Notas Importantes

1. **IDs Preservados**: O script preserva os IDs originais do dump. Isso é importante para manter a consistência dos dados.

2. **Atualização de Dados**: Se um registro já existir (mesmo ID), ele será atualizado ao invés de duplicado.

3. **Ordem de Inserção**: Os dados são inseridos na ordem correta para respeitar foreign keys:
   - users → clients → employees → projects → allocations → projectLogEntries

4. **Arquivo de Dump**: O arquivo padrão é `tmp/database-dump-2025-11-08.json`. Você pode especificar outro arquivo passando como argumento.

## 🔐 Atualizar Senhas dos Usuários

Para definir uma senha padrão para todos os usuários:

```bash
node update-passwords.mjs
```

Este script atualiza a senha de todos os usuários no banco de dados. A senha padrão está configurada no script.

**⚠️ IMPORTANTE**: Altere a senha padrão após o primeiro login!

## 🎯 Próximos Passos

Após configurar o ambiente local:

1. Acesse `http://localhost:3000`
2. Faça login com um dos usuários do dump (senha configurada pelo script)
3. Explore a aplicação com os dados de exemplo

## 📞 Suporte

Se encontrar problemas durante a configuração, verifique:
- [README.md](./README.md) - Documentação geral
- [SETUP_VM.md](./SETUP_VM.md) - Configuração de VM
- Issues no repositório GitHub

---

**Última atualização**: Novembro 2025

