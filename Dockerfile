FROM node:20-alpine AS base
WORKDIR /app

# Database connection URLs - MUST be overridden at build time with --build-arg
# Do NOT use these placeholder values in production!
ARG jacxi_DATABASE_URL="postgres://user:password@host:5432/database"
ARG jacxi_POSTGRES_URL="postgres://user:password@host:5432/database"
ARG jacxi_PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY_HERE"

ENV jacxi_DATABASE_URL=${jacxi_DATABASE_URL}
ENV jacxi_POSTGRES_URL=${jacxi_POSTGRES_URL}
ENV jacxi_PRISMA_DATABASE_URL=${jacxi_PRISMA_DATABASE_URL}

# Install dependencies with Prisma schema and postinstall scripts available
COPY package*.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci

# Build the application
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Database URLs should be provided at runtime via:
# - Docker: docker run -e jacxi_DATABASE_URL=... -e jacxi_POSTGRES_URL=...
# - Docker Compose: environment section in docker-compose.yml
# - Kubernetes: ConfigMap or Secret
# Required variables:
#   - jacxi_DATABASE_URL
#   - jacxi_POSTGRES_URL
#   - jacxi_PRISMA_DATABASE_URL (optional, for Prisma Accelerate)

COPY package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.* ./
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/prisma ./prisma

EXPOSE 3000

# Run migrations on container start, then start the app
# Requires: jacxi_DATABASE_URL and jacxi_POSTGRES_URL environment variables
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]


