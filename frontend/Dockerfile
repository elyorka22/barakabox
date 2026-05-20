# Compose: build.context "." (repo root) and dockerfile "frontend/Dockerfile"
#
# Layout must match monorepo: repo/frontend + repo/shared so outputFileTracingRoot works
# and Next.js emits repo/frontend/.next/standalone

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
RUN npm run build && test -f .next/standalone/server.js

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /repo/frontend/public ./public
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./.next/static

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
  CMD ["node", "-e", "const p=+(process.env.PORT||3000);fetch('http://127.0.0.1:'+p+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
