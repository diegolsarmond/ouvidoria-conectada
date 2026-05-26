# ─── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Copiar o restante do código fonte
COPY . .

# Rodar o build de produção
RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────
FROM nginx:alpine AS production

# Copiar configuração customizada do Nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos gerados pelo build para o subdiretório /ouvidoria
COPY --from=build /app/dist /usr/share/nginx/html/ouvidoria

# Expor a porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
