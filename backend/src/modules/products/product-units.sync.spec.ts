import { ProductUnit } from '@prisma/client';
import { PRODUCT_UNIT_CODES } from '../../common/utils/product-units';

describe('product-units vs Prisma ProductUnit', () => {
  it('shared codes match Prisma enum exactly', () => {
    expect(new Set(PRODUCT_UNIT_CODES)).toEqual(new Set(Object.values(ProductUnit)));
  });
});
