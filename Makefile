# Makefile para facilitar comandos Docker

.PHONY: help build up down logs restart clean migrate seed

help: ## Mostra esta mensagem de ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build da imagem Docker
	docker compose build

up: ## Inicia os containers
	docker compose up -d

down: ## Para os containers
	docker compose down

logs: ## Mostra logs dos containers
	docker compose logs -f

restart: ## Reinicia os containers
	docker compose restart

clean: ## Para e remove containers e volumes
	docker compose down -v

migrate: ## Executa migrações do banco de dados
	docker compose exec app pnpm db:push

seed: ## Popula o banco com dados de exemplo
	docker compose exec app pnpm db:seed

seed-clear: ## Limpa e popula o banco com dados de exemplo
	docker compose exec app pnpm db:seed:clear

shell: ## Acessa o shell do container da aplicação
	docker compose exec app sh

db-shell: ## Acessa o MySQL
	docker compose exec db mysql -u root -p

dev-db: ## Inicia apenas o MySQL para desenvolvimento
	docker compose -f docker-compose.dev.yml up -d

dev-db-down: ## Para o MySQL de desenvolvimento
	docker compose -f docker-compose.dev.yml down

