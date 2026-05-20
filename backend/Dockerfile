# Slim install: prod deps only, then minimal tooling to compile (not full devDependencies).
# On very small disks, use Dockerfile.prebuilt + scripts/deploy-vps.sh instead.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./

RUN npm ci --omit=dev --no-audit --no-fund \
  && npm install --no-save --no-audit --no-fund \
    prisma \
    typescript \
    @nestjs/cli \
    @nestjs/schematics \
    ts-node \
    tsconfig-paths \
  && npm cache clean --force

COPY prisma ./prisma
COPY . .
RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev \
  && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
