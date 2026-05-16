# ── Stage 1 : build du frontend ────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2 : image de production ───────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Dépendances serveur uniquement
COPY package*.json ./
RUN npm ci --omit=dev

# Code serveur + frontend buildé
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

# Dossier persistant pour la base SQLite
RUN mkdir -p /data
ENV DATABASE_PATH=/data/adctrans.db
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "server/index.js"]
