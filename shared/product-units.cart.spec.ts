import {
  calculateCartLineTotal,
  formatCartQuantityDisplay,
  getCartDecreaseDelta,
  getCartMinQuantity,
  getCartQuantityStep,
} from './product-units';

describe('cart quantity (weight vs piece)', () => {
  it('uses 100g steps for kg/gramm', () => {
    expect(getCartQuantityStep('kg')).toBe(100);
    expect(getCartMinQuantity('kg')).toBe(100);
    expect(getCartQuantityStep('gramm')).toBe(100);
  });

  it('uses 1 step for piece units', () => {
    expect(getCartQuantityStep('dona')).toBe(1);
    expect(getCartMinQuantity('dona')).toBe(1);
  });

  it('formats grams and kg display', () => {
    expect(formatCartQuantityDisplay(100, 'kg')).toBe('100 gramm');
    expect(formatCartQuantityDisplay(200, 'kg')).toBe('200 gramm');
    expect(formatCartQuantityDisplay(1000, 'kg')).toBe('1 kg');
    expect(formatCartQuantityDisplay(1100, 'kg')).toBe('1.1 kg');
    expect(formatCartQuantityDisplay(2, 'dona')).toBe('2 dona');
  });

  it('calculates line totals without float drift', () => {
    expect(calculateCartLineTotal(10_000, 100, 'kg')).toBe(1_000);
    expect(calculateCartLineTotal(10_000, 200, 'kg')).toBe(2_000);
    expect(calculateCartLineTotal(10_000, 500, 'kg')).toBe(5_000);
    expect(calculateCartLineTotal(10_000, 1000, 'kg')).toBe(10_000);
    expect(calculateCartLineTotal(7000, 3, 'dona')).toBe(21_000);
  });

  it('decrease removes at minimum weight', () => {
    expect(getCartDecreaseDelta(100, 'kg')).toBe(-100);
    expect(getCartDecreaseDelta(300, 'kg')).toBe(-100);
    expect(getCartDecreaseDelta(1, 'dona')).toBe(-1);
  });
});
