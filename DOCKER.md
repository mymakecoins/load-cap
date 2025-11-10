# 🐳 Guia de Docker

Este guia explica como executar a aplicação usando Docker e Docker Compose.

## 📋 Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+

Para verificar se estão instalados:
```bash
docker --version
docker compose version
```

## 🚀 Início Rápido

### Usando Makefile (Recomendado)

Se você tem `make` instalado, pode usar os comandos simplificados:

```bash
# Ver todos os comandos disponíveis
make help

# Build e iniciar
make build
make up

# Executar migrações
make migrate

# Ver logs
make logs
```

### Usando Docker Compose Diretamente

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e ajuste conforme necessário:
```bash
cp .env.docker.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=team_management
MYSQL_USER=team_management
MYSQL_PASSWORD=team_management_password
JWT_SECRET=sua-chave-secreta-forte-aqui
VITE_APP_TITLE=Sistema de Gestão de Times
VITE_APP_LOGO=/logo.jpeg
```

### 2. Executar em Produção

```bash
# Build e iniciar todos os serviços
docker compose up -d

# Ver logs
docker compose logs -f

# Parar serviços
docker compose down
```

A aplicação estará disponível em `http://localhost:3000`

### 3. Executar Migrações do Banco de Dados

Após iniciar os containers, execute as migrações:

```bash
# Entrar no container da aplicação
docker compose exec app sh

# Dentro do container, executar migrações
pnpm db:push

# Ou executar diretamente
docker compose exec app pnpm db:push
```

### 4. Popular Banco de Dados (Opcional)

```bash
# Executar seed
docker compose exec app pnpm db:seed

# Ou limpar e popular
docker compose exec app pnpm db:seed:clear
```

## 🔧 Comandos Úteis

### Gerenciamento de Containers

```bash
# Ver status dos containers
docker compose ps

# Ver logs da aplicação
docker compose logs app -f

# Ver logs do banco de dados
docker compose logs db -f

# Reiniciar um serviço específico
docker compose restart app

# Parar todos os serviços
docker compose stop

# Parar e remover containers (mantém volumes)
docker compose down

# Parar e remover containers e volumes
docker compose down -v
```

### Acesso aos Containers

```bash
# Acessar shell do container da aplicação
docker compose exec app sh

# Acessar MySQL
docker compose exec db mysql -u root -p

# Executar comandos dentro do container
docker compose exec app pnpm db:push
```

### Rebuild da Imagem

```bash
# Rebuild forçado (sem cache)
docker compose build --no-cache

# Rebuild e reiniciar
docker compose up -d --build
```

## 🛠️ Desenvolvimento com Docker

Para desenvolvimento, você pode usar apenas o MySQL em Docker e executar a aplicação localmente:

### 1. Iniciar apenas o MySQL

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Configurar `.env.local` para desenvolvimento

```env
DATABASE_URL=mysql://team_management:team_management_password@localhost:3306/team_management
```

### 3. Executar aplicação localmente

```bash
pnpm install
pnpm dev
```

## 📦 Build Manual da Imagem

Se preferir construir a imagem manualmente:

```bash
# Build
docker build -t load-cap:latest .

# Executar container
docker run -d \
  --name load-cap-app \
  -p 3000:3000 \
  -e DATABASE_URL=mysql://user:pass@host:3306/db \
  -e JWT_SECRET=your-secret \
  load-cap:latest
```

## 🔍 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker compose logs app

# Verificar se o banco está saudável
docker compose ps
```

### Erro de conexão com banco de dados

1. Verifique se o MySQL está rodando:
   ```bash
   docker compose ps db
   ```

2. Verifique as variáveis de ambiente:
   ```bash
   docker compose exec app env | grep DATABASE
   ```

3. Teste conexão manual:
   ```bash
   docker compose exec db mysql -u team_management -p
   ```

### Porta já em uso

Se a porta 3000 ou 3306 já estiver em uso, altere no arquivo `.env`:
```env
APP_PORT=3001
MYSQL_PORT=3307
```

### Limpar tudo e começar do zero

```bash
# Parar e remover tudo
docker compose down -v

# Remover imagens
docker rmi load-cap-app

# Limpar cache do Docker (cuidado!)
docker system prune -a
```

## 🔒 Segurança em Produção

### Checklist de Segurança

- [ ] Alterar `JWT_SECRET` para uma chave forte e aleatória
- [ ] Alterar senhas padrão do MySQL
- [ ] Usar variáveis de ambiente seguras (não commitar `.env`)
- [ ] Configurar firewall adequadamente
- [ ] Usar HTTPS em produção
- [ ] Revisar permissões de volumes
- [ ] Configurar backups do banco de dados

### Exemplo de `.env` para Produção

```env
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
MYSQL_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
```

## 📊 Monitoramento

### Ver uso de recursos

```bash
docker stats
```

### Ver logs em tempo real

```bash
docker compose logs -f app db
```

## 🚢 Deploy em Produção

### Opção 1: Docker Compose em Servidor

1. Clone o repositório no servidor
2. Configure `.env` com valores de produção
3. Execute `docker compose up -d`
4. Configure reverse proxy (nginx/traefik) se necessário

### Opção 2: Docker Swarm

```bash
docker stack deploy -c docker-compose.yml load-cap
```

### Opção 3: Kubernetes

Adapte o `docker-compose.yml` para Kubernetes manifests ou use ferramentas como Kompose.

## 📝 Notas Importantes

- **Volumes**: O MySQL usa um volume nomeado para persistir dados. Use `docker compose down -v` com cuidado!
- **Migrações**: Execute migrações após cada deploy que alterar o schema
- **Backups**: Configure backups regulares do volume do MySQL
- **Logs**: Logs são salvos em `./logs` (se montado como volume)

## 🔗 Referências

- [Documentação Docker](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [MySQL Docker Hub](https://hub.docker.com/_/mysql)

