# Marketplace roadmap (Elyor spec ↔ implementation)

Incremental migration. **Legacy `Product` / `BusinessProfile` remain** until validation completes.

## Phase status

| Phase | Topic | Status | Notes |
|-------|--------|--------|--------|
| 1 | DB: `GlobalProduct`, `StoreProduct`, `Store` | **Done** | + `defaultPrice`, `defaultStock`, `isPopular`, `StoreType` |
| 2 | Admin Global Catalog | **Done** | `/admin/global-catalog` — image, category, defaults |
| 3 | Store onboarding: Import UI | **Done** | Business → Katalog → Import tab |
| 4 | Auto `StoreProduct` on Done | **Done** | `POST /businesses/catalog/listings/bulk` |
| 5 | My Products (store panel) | **Done** | `StoreListingsPanel` — price/stock/visibility/top |
| 6 | Storefront from `StoreProduct` | **Done** | Home catalog prefers `/marketplace/catalog`; legacy fallback |
| 7 | Store pages `/store/:slug` | **Done** | Banner, categories, search, paginated products |
| 8 | Homepage store types + promotions | **Done** | Types, featured stores, popular/top, promo carousel |
| 9 | Performance | **Ongoing** | `StoreProduct(isVisible, oldPrice)` index; Redis cache |
| 10 | Safe migration | **Ongoing** | See `MARKETPLACE_MIGRATION.md` |

## Field mapping (spec → schema)

| Spec | Implementation |
|------|----------------|
| `GlobalProduct.image` | `imageUrl` (+ card/thumb variants) |
| `StoreProduct.isActive` | `isVisible` |
| `StoreProduct.isFeatured` | `isTop` |
| `defaultPrice` / `defaultStock` | On `GlobalProduct`; copied on bulk import |

## Key APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH | `/admin/marketplace/global-products` | Global catalog CRUD |
| POST | `/businesses/catalog/listings/bulk` | Onboarding import |
| GET/PATCH | `/businesses/catalog/listings` | Per-store listings |
| GET | `/stores?type=GROCERY` | Stores by vertical |
| GET | `/stores/:slug/products` | Paginated store catalog |
| GET | `/marketplace/catalog` | Global marketplace grid (StoreProduct) |
| GET | `/marketplace/catalog/popular` | `isPopular` global products |
| GET | `/marketplace/catalog/promotions` | Listings with promo price |

## Deploy after schema change

```bash
cd backend && npx prisma migrate deploy && npx prisma generate && npm run build
```

## Phase 7 — onboarding & search (done)

| Item | Status |
|------|--------|
| `/business/onboarding` wizard (profile → logo/banner → import) | **Done** |
| `PATCH /businesses/panel/store`, `POST .../store/image` | **Done** |
| Auto-redirect from `/business` if onboarding incomplete | **Done** |
| Search prefers marketplace listings; store links `/store/:slug` | **Done** |

## Phase 8 — promotions on home (done)

| Item | Status |
|------|--------|
| `marketplacePromotions` in `GET /marketplace/home` | **Done** |
| `HomePromotionsCarousel` → `/discounts` | **Done** |
| `NEXT_PUBLIC_MARKETPLACE_CATALOG_ONLY` (skip legacy `/products` SSR) | **Done** |

## Next (safe)

1. Meilisearch on `GlobalProduct` + listings (`SEARCH_PROVIDER=meilisearch`).
2. Remove legacy `Product` grid when marketplace coverage is 100% (or set catalog-only env).
3. `/discounts` page: prefer `/marketplace/catalog/promotions` with legacy fallback.
