export function getDefaultVariant<T extends { variants?: Array<{ id?: string; isActive?: boolean }> }>(product: T) {
  const defaultVariant =
    product.variants?.find((v) => Boolean((v as { isActive?: boolean }).isActive)) ??
    product.variants?.[0];

  return defaultVariant ?? null;
}

