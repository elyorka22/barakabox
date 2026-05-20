# Two-stage build: one npm ci, prune dev deps before runtime (less disk during build).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY . .
RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
