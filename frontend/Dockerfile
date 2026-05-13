# Build from repository root: docker build -f frontend/Dockerfile .
FROM node:20-alpine AS deps
WORKDIR /repo/frontend
COPY frontend/package*.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /repo
COPY shared ./shared
COPY --from=deps /repo/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend
WORKDIR /repo/frontend
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/frontend/.next ./.next
COPY --from=build /repo/frontend/public ./public
COPY --from=build /repo/frontend/package.json ./package.json
COPY --from=build /repo/frontend/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
