# Configuração de VM para Desenvolvimento - Sistema de Gestão de Times

Este documento descreve a configuração necessária para executar o projeto **Sistema de Gestão de Times** em um ambiente de desenvolvimento local.

## 📋 Requisitos de Sistema

### Hardware Mínimo
- **CPU**: 2 cores (4 cores recomendado)
- **RAM**: 4 GB (8 GB recomendado)
- **Disco**: 20 GB de espaço livre (SSD recomendado)
- **Rede**: Conexão com internet para downloads de dependências

### Sistema Operacional
- **Linux** (Ubuntu 20.04 LTS ou superior) - Recomendado
- **macOS** (Monterey ou superior)
- **Windows** (com WSL2 - Windows Subsystem for Linux)

## 🔧 Instalação de Dependências

### 1. Atualizar Sistema Operacional
```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Instalar Node.js e npm
**Versão necessária**: Node.js 22.x ou superior

```bash
# Usando NodeSource repository (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # v22.x.x
npm --version   # 10.x.x
```

**Alternativa com nvm (Node Version Manager)**:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

### 3. Instalar pnpm (Gerenciador de Pacotes)
**Versão necessária**: pnpm 9.x ou superior

```bash
npm install -g pnpm@latest

# Verificar instalação
pnpm --version  # 9.x.x
```

### 4. Instalar Git
```bash
sudo apt install -y git

# Configurar Git (opcional)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@example.com"
```

### 5. Instalar MySQL Server (ou TiDB)
**Versão necessária**: MySQL 8.0+ ou TiDB 6.0+

#### Opção A: MySQL
```bash
sudo apt install -y mysql-server

# Iniciar serviço
sudo systemctl start mysql
sudo systemctl enable mysql

# Verificar instalação
mysql --version
```

#### Opção B: Docker + MySQL (Recomendado)
```bash
# Instalar Docker
sudo apt install -y docker.io
sudo usermod -aG docker $USER

# Executar MySQL em container
docker run --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=team_management \
  -p 3306:3306 \
  -d mysql:8.0
```

### 6. Instalar Docker (Opcional, mas Recomendado)
```bash
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
sudo systemctl start docker
sudo systemctl enable docker
```

### 7. Instalar Editor de Código (Recomendado)
```bash
# VS Code
sudo snap install code --classic

# Ou Cursor (fork de VS Code com IA)
# Baixar de: https://cursor.com
```

## 📦 Configuração do Projeto

### 1. Clonar Repositório
```bash
git clone https://github.com/mymakecoins/load-cap.git
cd load-cap
```

### 2. Instalar Dependências do Projeto
```bash
pnpm install
```

### 3. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env.local

# Editar arquivo com suas configurações
nano .env.local
```

### 4. Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` com as seguintes variáveis:

```env
# Banco de Dados
DATABASE_URL=mysql://root:root@localhost:3306/team_management

# Autenticação OAuth (Manus)
VITE_APP_ID=seu_app_id_aqui
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
JWT_SECRET=sua_chave_secreta_aqui

# Informações do Proprietário
OWNER_OPEN_ID=seu_open_id
OWNER_NAME=Seu Nome

# APIs Internas (Manus)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_api

# Título e Logo da Aplicação
VITE_APP_TITLE=Sistema de Gestão de Times
VITE_APP_LOGO=https://seu-logo-url.com/logo.png

# Analytics (Opcional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=seu_website_id
```

### 5. Criar Banco de Dados
```bash
# Se usando MySQL localmente
mysql -u root -p -e "CREATE DATABASE team_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 6. Executar Migrações
```bash
pnpm db:push
```

## 🚀 Executar o Projeto

### Modo Desenvolvimento
```bash
# Terminal 1: Inicia servidor backend e frontend
pnpm dev

# A aplicação estará disponível em:
# http://localhost:3000
```

### Modo Produção
```bash
# Build
pnpm build

# Executar
pnpm start
```

## 📊 Estrutura de Pastas do Projeto

```
load-cap/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── lib/           # Utilitários
│   │   └── App.tsx        # Componente raiz
│   └── public/            # Arquivos estáticos
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # Procedimentos tRPC
│   ├── db.ts              # Queries do banco
│   └── _core/             # Configurações internas
├── drizzle/               # ORM e Migrações
│   └── schema.ts          # Schema do banco
├── package.json           # Dependências
├── tsconfig.json          # Configuração TypeScript
└── vite.config.ts         # Configuração Vite
```

## 🔐 Variáveis de Ambiente para Desenvolvimento

Para desenvolvimento local sem OAuth real, você pode usar valores fictícios:

```env
DATABASE_URL=mysql://root:root@localhost:3306/team_management
VITE_APP_ID=dev-app-id
OAUTH_SERVER_URL=http://localhost:3001
VITE_OAUTH_PORTAL_URL=http://localhost:3001
JWT_SECRET=dev-secret-key-change-in-production
OWNER_OPEN_ID=dev-owner-id
OWNER_NAME=Developer
BUILT_IN_FORGE_API_URL=http://localhost:3001
BUILT_IN_FORGE_API_KEY=dev-api-key
VITE_APP_TITLE=Sistema de Gestão de Times (Dev)
VITE_APP_LOGO=/logo.png
```

## 🧪 Testes e Validação

### Verificar Instalação
```bash
# Verificar Node.js
node --version

# Verificar pnpm
pnpm --version

# Verificar Git
git --version

# Verificar MySQL
mysql --version

# Verificar conexão com banco
pnpm db:push --dry-run
```

### Executar Testes
```bash
# Testes unitários (se configurados)
pnpm test

# Verificar tipos TypeScript
pnpm type-check

# Linting
pnpm lint
```

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erro: "Database connection failed"
```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Ou se usando Docker
docker ps | grep mysql

# Testar conexão
mysql -u root -p -h localhost
```

### Erro: "Port 3000 already in use"
```bash
# Encontrar processo usando porta 3000
lsof -i :3000

# Matar processo (substitua PID)
kill -9 <PID>

# Ou usar porta diferente
PORT=3001 pnpm dev
```

### Erro: "Permission denied" no Docker
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Aplicar mudanças (logout e login ou)
newgrp docker
```

## 📚 Recursos Úteis

- **Node.js**: https://nodejs.org
- **pnpm**: https://pnpm.io
- **React**: https://react.dev
- **Express**: https://expressjs.com
- **tRPC**: https://trpc.io
- **Drizzle ORM**: https://orm.drizzle.team
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com

## 🔄 Workflow de Desenvolvimento

### 1. Criar Feature Branch
```bash
git checkout -b feature/nome-da-feature
```

### 2. Fazer Alterações
```bash
# Editar arquivos conforme necessário
```

### 3. Testar Localmente
```bash
pnpm dev
# Testar em http://localhost:3000
```

### 4. Commit e Push
```bash
git add .
git commit -m "Descrição das mudanças"
git push origin feature/nome-da-feature
```

### 5. Pull Request
- Abrir PR no GitHub
- Descrever mudanças
- Aguardar review

## 📝 Notas Importantes

1. **Segurança**: Nunca commitar `.env.local` com valores reais
2. **Banco de Dados**: Usar `.env.local` para configurações locais
3. **Node Modules**: Adicionar `node_modules/` ao `.gitignore`
4. **Porta 3000**: Certifique-se de que não está em uso
5. **MySQL**: Usar senha forte em produção

## ✅ Checklist de Setup

- [ ] Node.js 22+ instalado
- [ ] pnpm 9+ instalado
- [ ] Git instalado e configurado
- [ ] MySQL/TiDB instalado e rodando
- [ ] Repositório clonado
- [ ] Dependências instaladas (`pnpm install`)
- [ ] `.env.local` configurado
- [ ] Migrações executadas (`pnpm db:push`)
- [ ] Servidor rodando (`pnpm dev`)
- [ ] Aplicação acessível em http://localhost:3000

---

**Versão**: 1.0.0  
**Última atualização**: Outubro 2025  
**Compatibilidade**: Node.js 22+, pnpm 9+, MySQL 8.0+

