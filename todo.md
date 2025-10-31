# Sistema de Gestão de Times - Fábrica de Software

## Requisitos Funcionais

### Autenticação e Autorização
- [ ] Sistema de autenticação com OAuth Manus
- [ ] Papéis de usuário: Coordenador Operacional, Gerente de Projeto, Desenvolvedor
- [ ] Controle de acesso baseado em papéis (RBAC)

### Cadastro de Clientes
- [ ] Criar novo cliente
- [ ] Editar dados do cliente
- [ ] Listar clientes
- [ ] Deletar cliente (soft delete)
- [ ] Campos: nome, email, telefone, empresa, data de cadastro

### Cadastro de Colaboradores
- [ ] Criar novo colaborador
- [ ] Editar dados do colaborador
- [ ] Listar colaboradores
- [ ] Deletar colaborador (soft delete)
- [ ] Campos: nome, email, tipo (Frontend, Mobile, Backend, QA, Gerente de Projeto), data de cadastro
- [ ] Capacidade mensal em horas (padrão: 160 horas)

### Cadastro de Projetos
- [ ] Criar novo projeto
- [ ] Editar projeto (apenas Coordenador e Gerente alocado)
- [ ] Listar projetos
- [ ] Deletar projeto (soft delete)
- [ ] Campos: nome, cliente, tipo (Sustentação, Escopo Fechado, Squad Gerenciada)
- [ ] Campos: data de início, data de fim prevista, data de fim realizada
- [ ] Campos: andamento previsto (%), andamento realizado (%)
- [ ] Campos: gerente de projeto alocado, status (Planejamento, Em Andamento, Concluído, Pausado)

### Alocação de Colaboradores
- [ ] Alocar colaborador a projeto
- [ ] Definir horas alocadas por mês
- [ ] Editar alocação (apenas Coordenador e Gerente do projeto)
- [ ] Remover alocação
- [ ] Histórico de alocações

### Visões e Relatórios
- [ ] Visão global de uso do time (dashboard principal)
  - [ ] Total de horas alocadas vs disponíveis
  - [ ] Distribuição por projeto
  - [ ] Distribuição por tipo de profissional
  - [ ] Taxa de utilização geral
- [ ] Visão de alocação por desenvolvedor
  - [ ] Projetos alocados
  - [ ] Horas alocadas vs disponíveis
  - [ ] Histórico de alocações
  - [ ] Taxa de utilização individual
- [ ] Visão de capacidade por projeto
  - [ ] Total de horas alocadas
  - [ ] Distribuição por tipo de profissional
  - [ ] Comparação: previsto vs realizado
  - [ ] Andamento do projeto (previsto vs realizado)
  - [ ] Gráfico de Gantt ou timeline

### Controle de Permissões
- [ ] Apenas Coordenador pode criar/editar/deletar clientes
- [ ] Apenas Coordenador pode criar/editar/deletar colaboradores
- [ ] Apenas Coordenador e Gerente alocado podem editar projeto
- [ ] Apenas Coordenador pode criar projetos
- [ ] Apenas Coordenador pode gerenciar alocações
- [ ] Desenvolvedores podem visualizar suas próprias alocações

## Requisitos Técnicos

### Banco de Dados
- [ ] Tabela: users (autenticação)
- [ ] Tabela: clients (clientes)
- [ ] Tabela: employees (colaboradores)
- [ ] Tabela: projects (projetos)
- [ ] Tabela: allocations (alocações)
- [ ] Tabela: allocation_history (histórico de alocações)
- [ ] Índices para performance
- [ ] Soft deletes para auditoria

### Backend (tRPC)
- [ ] Procedures para CRUD de clientes
- [ ] Procedures para CRUD de colaboradores
- [ ] Procedures para CRUD de projetos
- [ ] Procedures para gerenciar alocações
- [ ] Procedures para relatórios e visões
- [ ] Validação de permissões em todas as procedures
- [ ] Tratamento de erros

### Frontend
- [ ] Layout de dashboard com sidebar
- [ ] Página de login
- [ ] Página de clientes (listagem e CRUD)
- [ ] Página de colaboradores (listagem e CRUD)
- [ ] Página de projetos (listagem e CRUD)
- [ ] Página de alocações (gerenciamento)
- [ ] Dashboard de visão global
- [ ] Dashboard de alocação por desenvolvedor
- [ ] Dashboard de capacidade por projeto
- [ ] Navegação responsiva
- [ ] Tratamento de loading e erros

### Design
- [ ] Escolher paleta de cores
- [ ] Escolher tipografia
- [ ] Componentes reutilizáveis
- [ ] Temas (claro/escuro)
- [ ] Responsividade mobile

## Fases de Implementação

### Fase 1: Estrutura Base
- [ ] Definir schema do banco de dados
- [ ] Criar migrations
- [ ] Implementar autenticação e RBAC
- [ ] Criar layout base do dashboard

### Fase 2: Cadastros Básicos
- [ ] CRUD de clientes
- [ ] CRUD de colaboradores
- [ ] CRUD de projetos
- [ ] Interface de gerenciamento de alocações

### Fase 3: Visões e Relatórios
- [ ] Dashboard de visão global
- [ ] Dashboard de alocação por desenvolvedor
- [ ] Dashboard de capacidade por projeto
- [ ] Gráficos e visualizações

### Fase 4: Testes e Refinamento
- [x] Testes de funcionalidade básica
- [x] Testes de permissões (RBAC)
- [x] Otimização de performance
- [x] Ajustes de UX/UI

## Status de Conclusão

### Fase 1: Estrutura Base
- [x] Definir schema do banco de dados
- [x] Criar migrations
- [x] Implementar autenticação e RBAC
- [x] Criar layout base do dashboard

### Fase 2: Cadastros Básicos
- [x] CRUD de clientes
- [x] CRUD de colaboradores
- [x] CRUD de projetos
- [x] Interface de gerenciamento de alocações

### Fase 3: Visões e Relatórios
- [x] Dashboard de visão global
- [x] Dashboard de alocação por desenvolvedor
- [x] Dashboard de capacidade por projeto
- [x] Gráficos e visualizações
- [x] Página de histórico de alocações

### Fase 4: Testes e Refinamento
- [x] Testes de funcionalidade básica
- [x] Testes de permissões (RBAC)
- [x] Otimização de performance
- [x] Ajustes de UX/UI




## Bugs Reportados

- [x] Erro no Select da página de Alocações - SelectItem com value vazio


- [x] Erro no Select da página de Histórico de Alocações - SelectItem com value vazio


- [ ] Adicionar campo "realizado" no cadastro de projeto
- [ ] Validar que campos "previsto" e "realizado" não aceitem números negativos


- [x] Incluir "Fullstack" no enum de stacks dos desenvolvedores


- [x] Erro ao salvar colaborador com tipo Fullstack - investigar causa


- [x] Erro "require is not defined" na página de usuários - corrigir import de crypto


- [x] Remover campo "Andamento Previsto" do cadastro de projeto
- [x] Usar "Progresso Previsto" para cálculo do gráfico no lugar de "Andamento Previsto"
- [x] Adicionar dropdown de status do projeto no cadastro (planejamento, em_andamento, concluido, pausado)
- [x] Incluir filtro por data início e fim na página de Alocação por Desenvolvedor
- [x] Adicionar presets para Semana Atual (seg-sex) na página de Alocação por Desenvolvedor
- [x] Adicionar presets para Semana Seguinte (seg-sex) na página de Alocação por Desenvolvedor


- [x] Carregar página de Histórico de Alocações com datas pré-definidas (primeiro e último dia do mês atual)


- [x] Alterar título do sistema para "GTeam"
- [x] Incluir logo da empresa (gsys.jpeg) no layout


- [x] Adicionar filtro por tipo de colaborador na página de Alocação por Desenvolvedor
- [x] Incluir tabela prévia com nome e taxa de utilização para seleção do desenvolvedor


- [x] Erro no Select da página de Alocação por Desenvolvedor - SelectItem com value vazio


- [x] Alterar texto do menu de "Sistema de Gestão de Times - Fábrica de Software" para "GTeam"
- [x] Trocar imagem do logo pela nova (gsys.jpeg)


- [x] Logo antiga continua aparecendo - investigar VITE_APP_LOGO env var (CORRIGIDO: usar sempre /logo.jpeg local)

