import { Prisma } from '@prisma/client';

export const pickerOrderItemSelect = {
  id: true,
  title: true,
  quantity: true,
  unitType: true,
  sellingMode: true,
  price: true,
  variantSnapshotTitle: true,
  variantSnapshotFlavor: true,
  variantSnapshotSize: true,
  variantSnapshotSku: true,
  product: {
    select: {
      name: true,
      description: true,
      imageUrl: true,
      imageCardUrl: true,
      imageThumbUrl: true,
    },
  },
  variant: {
    select: {
      title: true,
      flavor: true,
      size: true,
      sku: true,
      barcode: true,
      description: true,
      imageUrl: true,
    },
  },
} satisfies Prisma.OrderItemSelect;

export type PickerOrderItemRow = Prisma.OrderItemGetPayload<{
  select: typeof pickerOrderItemSelect;
}>;

function uniqueParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Subtitle: variant · flavor · size (e.g. Whitening — 192gr) */
export function buildPickerItemSubtitle(row: PickerOrderItemRow, productName: string): string {
  const variantTitle = row.variantSnapshotTitle?.trim() || row.variant?.title?.trim() || null;
  const flavor = row.variantSnapshotFlavor?.trim() || row.variant?.flavor?.trim() || null;
  const size = row.variantSnapshotSize?.trim() || row.variant?.size?.trim() || null;
  const variantDesc = row.variant?.description?.trim() || null;
  const productDesc = row.product?.description?.trim() || null;

  const detailParts = uniqueParts([
    variantTitle && variantTitle.toLowerCase() !== productName.toLowerCase() ? variantTitle : null,
    flavor,
    size,
    variantDesc && variantDesc.length <= 72 ? variantDesc : null,
  ]);

  if (detailParts.length > 0) {
    return detailParts.join(' — ');
  }

  if (productDesc) {
    return productDesc.length > 80 ? `${productDesc.slice(0, 77)}...` : productDesc;
  }

  return '';
}

export function mapPickerOrderItem(row: PickerOrderItemRow) {
  const productName = row.product?.name?.trim() || row.title?.trim() || 'Mahsulot';
  const variantName = row.variantSnapshotTitle?.trim() || row.variant?.title?.trim() || null;
  const subtitle = buildPickerItemSubtitle(row, productName);
  const sku = row.variantSnapshotSku?.trim() || row.variant?.sku?.trim() || null;
  const barcode = row.variant?.barcode?.trim() || null;
  const imageUrl =
    row.variant?.imageUrl?.trim() ||
    row.product?.imageCardUrl?.trim() ||
    row.product?.imageThumbUrl?.trim() ||
    row.product?.imageUrl?.trim() ||
    null;

  return {
    id: row.id,
    title: productName,
    productName,
    variantName,
    subtitle,
    quantity: row.quantity,
    unitType: row.unitType,
    sellingMode: row.sellingMode,
    price: row.price,
    imageUrl,
    sku,
    barcode,
  };
}

export function mapPickerOrderItems(rows: PickerOrderItemRow[]) {
  return rows.map(mapPickerOrderItem);
}
