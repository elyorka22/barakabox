# Multi-store marketplace migration

Incremental, backward-compatible migration. **Legacy `Product` and `BusinessProfile` stay live** until each stage is complete.

## Principles

1. Never break the current API or storefront.
2. Add tables and features gradually; do not drop legacy tables early.
3. **Global catalog** is the single source of truth for name, images, description, category, brand.
4. **Stores** only manage price, stock, cashback, visibility, and top placement.
5. Pickers belong to a **store** (Stage 2), not the platform globally.
6. Keep the NestJS monolith; use Redis for hot paths (Stage 10).

## Stage status

| Stage | Topic | Status |
|-------|--------|--------|
| 0 | Safety rules | Ongoing |
| 1 | Global catalog tables | **Done** (schema + migration) |
| 2 | Roles (`STORE_OWNER`, store-scoped pickers) | **Done** |
| 3 | Store “add from catalog” flow | **Done** |
| 4 | Data migration scripts | **Done** |
| 5 | Store panel UI | **Done** |
| 6 | Top products per store | **Done** (panel + `PATCH /businesses/panel/top`) |
| 7 | Homepage refactor | **Done** |
| 8 | Search (Meilisearch later) | **Done** |
| 9 | Analytics per store | **Done** |
| 10 | Redis + R2/S3 | **Done** |
| 11 | Order flow (picker → courier) | **Done** |
| 12 | Frontend migration | **Done** (phase 1) |
| 13 | Order store attribution | **Done** |
| 14 | Future features | Roadmap |

## Stage 1 — database (deployed via Prisma)

New models (see `backend/prisma/schema.prisma`):

- **`GlobalProduct`** — catalog master (slug, images, category, brand).
- **`GlobalVariant`** — e.g. `type=volume`, `value=1L`.
- **`Store`** — storefront entity; optional `businessProfileId` bridge.
- **`StoreProduct`** — store listing (price, stock, cashback, `isVisible`, `isTop`, `topOrder`).

Bridge fields for Stage 4:

- `GlobalProduct.legacyProductId`
- `GlobalVariant.legacyVariantId`
- `Store.businessProfileId`
- `StoreProduct.legacyProductId`

### Deploy

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Listing uniqueness

PostgreSQL partial unique indexes enforce:

- one base listing per `(storeId, globalProductId)` when `globalVariantId` is null;
- one listing per `(storeId, globalProductId, globalVariantId)` when variant is set.

## Stage 4 — data migration (deployed)

Idempotent backfill from legacy tables (does **not** delete `Product` / `BusinessProfile`).

| Legacy | Target |
|--------|--------|
| `BusinessProfile` | `Store` (+ `businessProfileId` link) |
| `Product` | `GlobalProduct` (images, category, description) |
| `ProductVariant` | `GlobalVariant` (`type`/`value` from size, flavor, or title) |
| `Product` price/stock | `StoreProduct` per store |

**Dedupe:** same normalized `name + categoryId` → one `GlobalProduct`; each legacy row still gets a `StoreProduct` where applicable.

### CLI (recommended on VPS)

```bash
cd backend
npm run build
npm run marketplace:migrate:dry   # preview counts
npm run marketplace:migrate       # apply
```

### Admin API

`POST /admin/marketplace/migrate` with body `{ "dryRun": true }` — `SYSTEM_ADMIN` only (SUPER_ADMIN / ADMIN).

Returns stats: `storesCreated`, `globalProductsCreated`, `globalProductsReused`, `storeListingsCreated`, `errors`, etc.

## Stage 2 — roles (deployed)

| Role | Scope |
|------|--------|
| `SUPER_ADMIN` | Full platform |
| `STORE_OWNER` | Own store (`Store.ownerUserId`), `/business` panel, team API |
| `MANAGER` | Orders, products, stats, cashback, customers (no settings) |
| `COURIER` | Delivery |
| `PICKER` | Single store (`User.storeScopeId`; legacy `businessScopeId` still accepted) |

Legacy `BUSINESS` remains; `@Roles('BUSINESS')` also allows `STORE_OWNER`.

### Deploy

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

Migration: `20260527120000_store_owner_and_store_scope`

### APIs

- `GET /admin/marketplace/stores` — store list for admin staff UI
- `GET|POST|PATCH /businesses/team` — store owner manages pickers/couriers (`@Roles('STORE_OWNER')`)

### Seed logins

- `storeowner` / `password123` — `STORE_OWNER` (linked store `baraka-fresh`)
- `picker` — scoped to marketplace store

## Stage 3 — store catalog connection (deployed)

Stores pick from the **global catalog** and set only price, stock, cashback, visibility.

### Store operator APIs (`@Roles('BUSINESS')` — includes `STORE_OWNER`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/businesses/catalog/browse` | Search global products + variants (`alreadyListed` flags) |
| GET | `/businesses/catalog/listings` | Current store listings |
| POST | `/businesses/catalog/listings` | Add listing from catalog |
| PATCH | `/businesses/catalog/listings/:id` | Update price, stock, visibility, top flags |

### Admin APIs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PATCH | `/admin/marketplace/global-products` | Manage platform catalog |
| POST | `/admin/marketplace/global-products/:id/variants` | Add variant |
| GET/POST/PATCH | `/admin/marketplace/stores/:storeId/listings` | Manage any store’s listings |

### UI

- Business app → **Mahsulotlar** tab → **Global katalog** section (legacy products below).

### Seed samples

- `Coca Cola` with 0.5L / 1L / 1.5L variants; `baraka-fresh` has 0.5L listing.
- `Apple` global product (no variants).

Legacy storefront still uses `Product` — `StoreProduct` is not on the homepage yet (Stage 7/12).

## Stage 5 — store panel (deployed)

Route: `/store` → `/business` (do‘kon paneli).

### Bottom navigation

| Tab | Content |
|-----|---------|
| Bosh | Marketplace KPIs + legacy stats, charts, inventory preview |
| Buyurtma | Legacy orders |
| Katalog | Global catalog browse + store listings |
| Ombor | Listing stock (marketplace) |
| Top | Toggle / save top listings per store |
| Jamoa | Pickers & couriers (`STORE_OWNER` only) |

### APIs

| Method | Path |
|--------|------|
| GET | `/businesses/panel/dashboard` |
| GET | `/businesses/panel/listings` |
| GET | `/businesses/panel/inventory` |
| GET/PATCH | `/businesses/panel/top` |

Legacy mahsulotlar collapsible on **Bosh** tab.

## Stage 7 — homepage (deployed)

Homepage order (additive — legacy catalog grid remains):

1. Banners + categories (unchanged)
2. **Top mahsulotlar** — legacy `Product.isTop` + marketplace `StoreProduct.isTop` merged
3. **Do‘konlar** — featured stores carousel → `/stores/[slug]`
4. **Aksiyalar** — legacy promos, fallback to marketplace `oldPrice` listings
5. **Do‘kon bo‘limlari** — horizontal product rows per store
6. **Barcha mahsulotlar** — legacy infinite catalog

### Public APIs

| Method | Path |
|--------|------|
| GET | `/marketplace/home` |
| GET | `/stores` — list (optional `section`, `page`, `limit`) |
| GET | `/stores/featured` |
| GET | `/stores/:slug` — detail + categories |
| GET | `/stores/:slug/products` — paginated (`q`, `categoryId`, `promo`) |
| GET | `/marketplace/stores` |
| GET | `/marketplace/stores/:slug` |

### Deploy

```bash
npx prisma migrate deploy   # Store.isFeatured, sortOrder
```

Set `Store.isFeatured = true` for homepage store carousel (seed: `baraka-fresh`).

Listings with `legacyProductId` are purchasable in the product sheet; others show as disabled / “Tez orada” on store page.

## Stage 8 — search (deployed)

Unified PostgreSQL search (Meilisearch optional later via `SEARCH_PROVIDER`).

| Method | Path |
|--------|------|
| GET | `/marketplace/search?q=&page=&limit=` |

Returns legacy catalog (`ProductsService.listPaginated`), marketplace listings, stores, and categories. Cached 60s (`storefront:marketplace:search:v1:…`).

Frontend: `/search?q=` — homepage search bar links here; fires `search_used` analytics.

Legacy `GET /products?search=` unchanged.

## Stage 9 — analytics per store (deployed)

Tracks visitors, product views, add-to-cart, checkout, orders, conversion, and top products **scoped to a store**. Store owners/operators only see their own store (`resolveStoreForOperator`).

Events include `storeId` / `storeSlug` on `product_viewed`, `store_viewed`, and store page paths.

### Store panel

| Method | Path |
|--------|------|
| GET | `/businesses/panel/analytics?period=day\|week\|month` |

UI: **Stat** tab in do‘kon paneli (period selector, KPIs, funnel, daily sales, top products).

### Admin

| Method | Path |
|--------|------|
| GET | `/admin/marketplace/analytics?period=` |
| GET | `/admin/marketplace/stores/:storeId/analytics?period=` |

Orders/revenue use legacy `BusinessProfile` linked on `Store.businessProfileId` until multi-store checkout (Stage 12).

## Stage 10 — performance + store media (deployed)

### Redis storefront cache

| Key | TTL | Endpoint |
|-----|-----|----------|
| `storefront:marketplace:home:v1` | 120s | `GET /marketplace/home` |
| `storefront:marketplace:stores:v1:*` | 300s | `GET /marketplace/stores` |
| `storefront:marketplace:store:v1:{slug}` | 120s | `GET /marketplace/stores/:slug` |
| `storefront:products:top:v1:*` | 120s | `GET /products/top` |
| `storefront:categories:v1:*` | 300s | `GET /categories` |
| `storefront:marketplace:search:v1:*` | 60s | `GET /marketplace/search` |

Invalidation: `CacheService.invalidateMarketplaceStorefront(slug?)` on listing/store/global catalog changes; `invalidateStorefrontCatalog()` also clears marketplace keys.

### Store images (S3-compatible)

Objects under `stores/{storeId}/logo-*` and `stores/{storeId}/banner-*` (Spaces, **Cloudflare R2**, or AWS S3 via same `SPACES_*` env vars + optional `SPACES_CDN_URL`).

| Method | Path |
|--------|------|
| GET | `/admin/marketplace/stores/:storeId` |
| PATCH | `/admin/marketplace/stores/:storeId` |
| POST | `/admin/marketplace/stores/:storeId/image?kind=logo\|banner` (multipart `file`) |

## Stage 11 — order flow (deployed)

Client → store → **picker** (yig‘ish) → **courier** (yetkazish). Store panel tracks status timeline.

### Store-scoped staff

Pickers/couriers with `User.storeScopeId` only see and act on orders for that store (via linked `BusinessProfile` + listing `legacyProductId`). Unscoped pickers keep platform-wide queue (backward compatible).

Status transitions unchanged: `NEW` → `PICKING` → `READY` → `DELIVERING` → `DELIVERED`.

### Store panel APIs

| Method | Path |
|--------|------|
| GET | `/businesses/panel/orders/summary` |
| GET | `/businesses/panel/orders?status=&q=` |
| GET | `/businesses/panel/orders/:orderId` |

UI: **Buyurtma** tab shows KPI chips, filter, picker/courier names, expandable status timeline.

Legacy `GET /orders` for `BUSINESS` / `STORE_OWNER` still works.

## Stage 12 — safe frontend migration (phase 1, deployed)

Gradual storefront switch; legacy `Product` cart/checkout unchanged.

| Area | Behavior |
|------|----------|
| Store pages | `ProductCard` grid + product sheet with add-to-cart |
| Listing hydration | `GET /marketplace/listings/:listingId/product` loads legacy variants + listing price |
| Purchasable | Only listings with `legacyProductId` can enter cart |
| Store-aware cart | Session tracks one `storeId` per cart; blocks mixing stores with a toast |
| Cart / checkout | “Do‘kon” banner when store context is set |

Not in phase 1: multi-store cart split, checkout per store, pure marketplace cart without legacy `Product`.

## Stage 13 — order store attribution (deployed)

Links checkout orders to the active marketplace store for analytics and store-scoped staff queues.

| Area | Behavior |
|------|----------|
| Schema | `Order.storeId` optional FK → `Store` |
| Checkout | `POST /orders` accepts optional `storeId` from storefront session |
| Analytics | Store KPIs count orders by `storeId` and/or legacy `businessProfileId` |
| Staff queues | `OrderScopeService` includes `storeId` on store-scoped orders |

### Deploy

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run build
```

## Code layout

- `backend/src/modules/marketplace/` — catalog, storefront, search, analytics.
- Existing: `products`, `businesses`, `orders` — unchanged for clients.

## Environment

No feature flag required for empty catalog tables. When admin APIs ship, use `MARKETPLACE_CATALOG_ENABLED=true` on the backend only.
