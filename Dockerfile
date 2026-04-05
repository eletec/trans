# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built client + server
COPY --from=build /app/dist ./dist
COPY server ./server

# Data volume for SQLite persistence
RUN mkdir -p /data
ENV DATABASE_PATH=/data/adctrans.db

EXPOSE 3001

CMD ["node", "server/index.js"]
