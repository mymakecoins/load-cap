# Dockerfile multi-stage para otimizar o tamanho da imagem final

# Stage 1: Build
FROM node:22-alpine AS builder

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instalar dependências (incluindo devDependencies para build)
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build da aplicação (frontend + backend)
RUN pnpm build

# Stage 2: Produção
FROM node:22-alpine AS production

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar apenas dependências de produção
RUN pnpm install --prod --frozen-lockfile

# Copiar arquivos buildados do stage anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/client/public ./client/public

# Criar diretório para logs e garantir permissões
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck (verifica se o servidor está respondendo)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]

