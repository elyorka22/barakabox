import { buildPickerItemSubtitle, mapPickerOrderItem } from './picker-order.mapper';

describe('picker-order.mapper', () => {
  it('builds product name and variant subtitle', () => {
    const mapped = mapPickerOrderItem({
      id: 'i1',
      title: 'Whitening',
      quantity: 2,
      unitType: 'dona',
      sellingMode: 'PIECE',
      price: 12000,
      variantSnapshotTitle: 'Whitening',
      variantSnapshotFlavor: null,
      variantSnapshotSize: '192gr',
      variantSnapshotSku: 'COL-192',
      product: {
        name: 'Colgate Total',
        description: null,
        imageUrl: null,
        imageCardUrl: 'https://cdn/card.jpg',
        imageThumbUrl: null,
      },
      variant: {
        title: 'Whitening',
        flavor: null,
        size: '192gr',
        sku: 'COL-192',
        barcode: '860123',
        description: null,
        imageUrl: null,
      },
    });

    expect(mapped.productName).toBe('Colgate Total');
    expect(mapped.subtitle).toBe('Whitening — 192gr');
    expect(mapped.sku).toBe('COL-192');
    expect(mapped.barcode).toBe('860123');
    expect(mapped.imageUrl).toBe('https://cdn/card.jpg');
  });

  it('deduplicates repeated subtitle parts', () => {
    const subtitle = buildPickerItemSubtitle(
      {
        id: 'i2',
        title: 'Spiral',
        quantity: 1,
        unitType: 'dona',
        sellingMode: 'PIECE',
        price: 5000,
        variantSnapshotTitle: 'Spiral Pasta',
        variantSnapshotFlavor: 'Spiral Pasta',
        variantSnapshotSize: '400gr',
        variantSnapshotSku: null,
        product: { name: 'Makfa', description: null, imageUrl: null, imageCardUrl: null, imageThumbUrl: null },
        variant: {
          title: 'Spiral Pasta',
          flavor: 'Spiral Pasta',
          size: '400gr',
          sku: null,
          barcode: null,
          description: null,
          imageUrl: null,
        },
      },
      'Makfa',
    );

    expect(subtitle).toBe('Spiral Pasta — 400gr');
  });
});
