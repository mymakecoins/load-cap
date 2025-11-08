# Sistema de Gestão de Times - Fábrica de Software

Uma aplicação web completa para gerenciar times, projetos e alocações de colaboradores em uma fábrica de software.

## 📋 Funcionalidades

### Cadastros Principais
- **Clientes**: Gerenciar clientes e informações de contato
- **Colaboradores**: Cadastro de desenvolvedores (Frontend, Mobile, Backend), QAs e gerentes de projeto
- **Projetos**: Criar e gerenciar projetos com tipos (Sustentação, Escopo Fechado, Squad Gerenciada)
- **Alocações**: Alocar colaboradores em projetos com controle de horas

### Visões e Relatórios
- **Dashboard Principal**: Visão global com KPIs de capacidade, alocação e utilização
- **Alocação por Desenvolvedor**: Visualizar alocação individual de cada colaborador
- **Capacidade por Projeto**: Análise de capacidade e andamento (previsto vs realizado)
- **Histórico de Alocações**: Rastreamento completo de mudanças com filtros e gráficos temporais

### Controle de Acesso
- **Autenticação Local**: Login com email e senha
- **RBAC (Role-Based Access Control)**:
  - **Admin**: Acesso completo a todos os cadastros
  - **Coordenador**: Acesso completo a todos os cadastros
  - **Gerente de Projeto**: Pode editar apenas projetos alocados
  - **Developer**: Acesso apenas de visualização

## 🚀 Tecnologias

- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui, Recharts
- **Backend**: Express 4, tRPC 11, Node.js
- **Banco de Dados**: MySQL/TiDB com Drizzle ORM
- **Autenticação**: Local (email/senha)
- **Build**: Vite, TypeScript

## 📦 Instalação

### Pré-requisitos
- Node.js 22+
- pnpm 9+
- Acesso a banco de dados MySQL/TiDB

### Setup

1. **Clone o repositório**
```bash
git clone https://github.com/mymakecoins/load-cap.git
cd load-cap
```

2. **Instale as dependências**
```bash
pnpm install
```

3. **Configure variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
DATABASE_URL=mysql://root:root@localhost:3306/team_management
JWT_SECRET=your-secret-key-change-in-production
VITE_APP_TITLE=Sistema de Gestão de Times
VITE_APP_LOGO=/logo.jpeg
```

> **📖 Para mais detalhes sobre configuração**, consulte [SETUP_LOCAL.md](./SETUP_LOCAL.md)

4. **Execute as migrações do banco de dados**
```bash
pnpm db:push
```

5. **Popule o banco de dados com dados de exemplo (opcional)**
```bash
# Primeira vez - limpa e insere dados
pnpm db:seed:clear

# Ou apenas insere/atualiza dados
pnpm db:seed
```

6. **Inicie o servidor de desenvolvimento**
```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`

> **📖 Para mais detalhes sobre configuração local**, consulte [SETUP_LOCAL.md](./SETUP_LOCAL.md)

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- **users**: Usuários do sistema com autenticação local (email/senha)
- **clients**: Clientes da fábrica
- **employees**: Colaboradores com tipos de especialidade
- **projects**: Projetos com tipos e gerentes alocados
- **allocations**: Alocações de colaboradores em projetos
- **allocation_history**: Histórico de mudanças em alocações

## 🔐 Autenticação

O sistema utiliza autenticação local com email e senha. Após o login, o usuário recebe um cookie de sessão seguro.

### Login
- Os usuários fazem login com email e senha
- Apenas administradores podem criar novos usuários através da interface de gerenciamento

### Papéis de Usuário
- **admin**: Acesso completo (geralmente o dono da aplicação)
- **coordinator**: Pode gerenciar todos os cadastros
- **manager**: Pode editar projetos alocados
- **developer**: Acesso apenas de visualização

## 📈 Uso

### Criar um Novo Projeto
1. Acesse **Projetos** no menu lateral
2. Clique em **Novo Projeto**
3. Preencha os dados: nome, cliente, tipo, gerente
4. Defina datas e andamento previsto
5. Salve o projeto

### Alocar um Colaborador
1. Acesse **Alocações** no menu lateral
2. Clique em **Nova Alocação**
3. Selecione o colaborador e projeto
4. Defina as horas alocadas e período
5. Salve a alocação

### Visualizar Relatórios
- **Dashboard**: Visão geral em tempo real
- **Alocação Dev**: Detalhes de cada colaborador
- **Capacidade**: Análise por projeto
- **Histórico**: Rastreamento de mudanças

## 🛠️ Desenvolvimento

### Estrutura de Pastas
```
client/
  src/
    pages/        # Páginas da aplicação
    components/   # Componentes reutilizáveis
    lib/          # Utilitários e configurações
server/
  routers.ts      # Procedimentos tRPC
  db.ts           # Queries do banco de dados
drizzle/
  schema.ts       # Schema do banco de dados
```

### Adicionar Nova Funcionalidade

1. **Defina o schema** em `drizzle/schema.ts`
2. **Execute a migração**: `pnpm db:push`
3. **Crie queries** em `server/db.ts`
4. **Adicione procedimentos** em `server/routers.ts`
5. **Desenvolva a UI** em `client/src/pages/`

## 📝 Licença

Proprietary - Todos os direitos reservados

## 👤 Autor

Desenvolvido para a fábrica de software

## 📞 Suporte

Para suporte, entre em contato através do email ou abra uma issue no repositório.

---

**Versão**: 1.0.0  
**Última atualização**: Outubro 2025

