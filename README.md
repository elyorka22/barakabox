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

Important: production startup no longer runs `prisma seed` automatically.
This prevents accidental product data overwrite on restart/redeploy.
If you need demo data in a fresh local environment, run seed manually:

```bash
docker compose exec backend npm run prisma:seed
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

## SEO va Google Indexing (Production)

Frontend production SEO sozlamalari tayyor:
- `frontend/public/robots.txt` (`Sitemap` bilan)
- dynamic `frontend/src/app/sitemap.ts` (`/sitemap.xml`)
- `frontend/public/manifest.json`
- global metadata va JSON-LD `frontend/src/app/layout.tsx`
- category/product metadata (`generateMetadata`) va `generateStaticParams`
- Open Graph fallback image route: `/og-image.png`

Google Search Console ulash:
1. Search Console oching: [https://search.google.com/search-console](https://search.google.com/search-console)
2. `https://chust-online-bozor.uz` ni **Domain property** sifatida qo'shing.
3. DNS TXT verification yozuvini domen DNS'iga kiriting va verify qiling.
4. Search Console ichida **Sitemaps** bo'limiga o'ting.
5. `https://chust-online-bozor.uz/sitemap.xml` ni submit qiling.
6. `URL Inspection` orqali asosiy URL'larni (`/`, `/categories`, `/products/:id`) request indexing qiling.

Production tekshiruv checklist:
- `https://chust-online-bozor.uz/robots.txt` ochiladi
- `https://chust-online-bozor.uz/sitemap.xml` ochiladi
- sayt faqat HTTPS'da ishlaydi
- browser console’da mixed-content xatolari yo'q
