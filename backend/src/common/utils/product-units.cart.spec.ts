import {
  calculateSellingModeLineTotal,
  deductStockForMode,
  fallbackSellingModeFromUnit,
  formatSellingModeQuantity,
  getSellingModeDecreaseDelta,
  getSellingModeMin,
  getSellingModeStep,
  hasEnoughStockForMode,
  normalizeSellingMode,
  resolveSellingMode,
} from './product-units';

describe('SellingMode core', () => {
  it('exposes the right step / min per mode', () => {
    expect(getSellingModeStep('piece')).toBe(1);
    expect(getSellingModeMin('piece')).toBe(1);
    expect(getSellingModeStep('gram_step')).toBe(100);
    expect(getSellingModeMin('gram_step')).toBe(100);
    expect(getSellingModeStep('kilogram_step')).toBe(1);
    expect(getSellingModeMin('kilogram_step')).toBe(1);
  });

  it('normalizes user-facing string values', () => {
    expect(normalizeSellingMode('PIECE')).toBe('piece');
    expect(normalizeSellingMode('gram_step')).toBe('gram_step');
    expect(normalizeSellingMode('KILOGRAM_STEP')).toBe('kilogram_step');
    expect(normalizeSellingMode('garbage')).toBeNull();
    expect(normalizeSellingMode(null)).toBeNull();
  });

  it('falls back to a safe mode when a product has no explicit field', () => {
    expect(fallbackSellingModeFromUnit('kg')).toBe('kilogram_step');
    expect(fallbackSellingModeFromUnit('gramm')).toBe('gram_step');
    expect(fallbackSellingModeFromUnit('dona')).toBe('piece');
    expect(fallbackSellingModeFromUnit('litr')).toBe('piece');
  });

  it('prefers explicit sellingMode over unit-based guess', () => {
    expect(resolveSellingMode({ sellingMode: 'GRAM_STEP', unit: 'kg' })).toBe('gram_step');
    expect(resolveSellingMode({ sellingMode: null, unit: 'kg' })).toBe('kilogram_step');
    expect(resolveSellingMode({ sellingMode: undefined, unit: 'gramm' })).toBe('gram_step');
    expect(resolveSellingMode({ unit: 'dona' })).toBe('piece');
  });
});

describe('SellingMode formatting', () => {
  it('formats piece quantities with the product unit label', () => {
    expect(formatSellingModeQuantity(1, 'piece', 'dona')).toBe('1 dona');
    expect(formatSellingModeQuantity(3, 'piece', 'litr')).toBe('3 litr');
  });

  it('formats gram-step quantities, switching to kg after 1000g', () => {
    expect(formatSellingModeQuantity(100, 'gram_step')).toBe('100 gramm');
    expect(formatSellingModeQuantity(900, 'gram_step')).toBe('900 gramm');
    expect(formatSellingModeQuantity(1000, 'gram_step')).toBe('1 kg');
    expect(formatSellingModeQuantity(1100, 'gram_step')).toBe('1.1 kg');
    expect(formatSellingModeQuantity(2500, 'gram_step')).toBe('2.5 kg');
  });

  it('formats kilogram-step quantities as whole kilos', () => {
    expect(formatSellingModeQuantity(1, 'kilogram_step')).toBe('1 kg');
    expect(formatSellingModeQuantity(2, 'kilogram_step')).toBe('2 kg');
  });
});

describe('SellingMode totals and stock', () => {
  it('calculates totals without float drift', () => {
    expect(calculateSellingModeLineTotal(7000, 3, 'piece')).toBe(21_000);
    expect(calculateSellingModeLineTotal(150_000, 200, 'gram_step')).toBe(30_000);
    expect(calculateSellingModeLineTotal(150_000, 1100, 'gram_step')).toBe(165_000);
    expect(calculateSellingModeLineTotal(6_000, 2, 'kilogram_step')).toBe(12_000);
  });

  it('decreases by step except at minimum', () => {
    expect(getSellingModeDecreaseDelta(100, 'gram_step')).toBe(-100);
    expect(getSellingModeDecreaseDelta(300, 'gram_step')).toBe(-100);
    expect(getSellingModeDecreaseDelta(1, 'piece')).toBe(-1);
    expect(getSellingModeDecreaseDelta(1, 'kilogram_step')).toBe(-1);
    expect(getSellingModeDecreaseDelta(3, 'kilogram_step')).toBe(-1);
  });

  it('handles stock for gram-step vs piece/kilogram products', () => {
    expect(hasEnoughStockForMode(2, 200, 'gram_step')).toBe(true);
    expect(hasEnoughStockForMode(2, 2500, 'gram_step')).toBe(false);
    expect(deductStockForMode(2, 200, 'gram_step')).toBe(1);
    expect(deductStockForMode(2, 2000, 'gram_step')).toBe(0);
    expect(hasEnoughStockForMode(5, 3, 'kilogram_step')).toBe(true);
    expect(deductStockForMode(5, 3, 'kilogram_step')).toBe(2);
    expect(hasEnoughStockForMode(10, 3, 'piece')).toBe(true);
    expect(deductStockForMode(10, 3, 'piece')).toBe(7);
  });
});
