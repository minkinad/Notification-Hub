# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

FROM base AS deps
ENV NODE_ENV=development
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS builder
COPY tsconfig*.json ./
COPY src ./src
RUN npm run prisma:generate
RUN npm run build

FROM base AS runner
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
