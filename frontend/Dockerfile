# Compose: build.context "." (repo root) and dockerfile "frontend/Dockerfile"
#
# Uses `next start` (not standalone) — reliable on 2GB VPS and with next-pwa.
# Monorepo layout: /repo/frontend + /repo/shared for webpack alias.

FROM node:22-alpine AS deps
WORKDIR /repo/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend
COPY shared ./shared
WORKDIR /repo/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /repo/frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /repo/frontend/package.json /repo/frontend/package-lock.json ./
COPY --from=build /repo/frontend/node_modules ./node_modules
COPY --from=build /repo/frontend/.next ./.next
COPY --from=build /repo/frontend/public ./public
COPY --from=build /repo/frontend/next.config.ts ./next.config.ts

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
  CMD ["node", "-e", "const p=+(process.env.PORT||3000);fetch('http://127.0.0.1:'+p+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["npm", "run", "start"]
