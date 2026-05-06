# BarakaBox MVP

BarakaBox is a minimal but production-minded grocery delivery MVP.

## Tech Stack

- Backend: NestJS + Prisma + PostgreSQL + JWT (access/refresh)
- Frontend: Next.js (App Router) + TailwindCSS
- Infra: Docker, Docker Compose, Nginx

## Backend Architecture

```
backend/src/
  modules/
    auth/
    users/
    products/
    cart/
    orders/
    businesses/
    boxes/
    admin/
  common/
    guards/
    decorators/
    interceptors/
  infrastructure/
    database/
    config/
    cache/   (placeholder)
    queue/   (placeholder)
    events/  (placeholder)
```

`orders` uses `QueueService` and `EventEmitterService` placeholder boundaries so order processing can be moved to workers later without refactoring controllers/services.

## Features

- Client: register/login, browse products and boxes, cart, place order
- Business: create products, manage/list orders
- Moderator: approve businesses, view admin stats
- Orders: transaction-safe creation, idempotency window, delivery fee threshold logic

## Run with Docker

```bash
docker compose up --build
```

Then open [http://localhost](http://localhost).

Nginx routes:
- `/api` -> backend
- `/` -> frontend

## Seeded Accounts

- Moderator: `moderator@barakabox.local` / `password123`
- Business: `business@barakabox.local` / `password123`
- Client: `client@barakabox.local` / `password123`

Seed creates:
- 1 moderator
- 1 business
- 1 client
- 5 products
- 3 boxes (Weekly Box, Family Box, Plov Box)

## Local Dev (without Docker)

Backend:
```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run prisma:seed
npm run start:dev
```

Frontend:
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
