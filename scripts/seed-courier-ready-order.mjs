#!/usr/bin/env node
/** Creates one READY order for courier smoke tests. Run after prisma seed. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({ where: { isActive: true } });
  if (!product) {
    console.error('No products — run prisma seed first');
    process.exit(1);
  }

  const order = await prisma.order.create({
    data: {
      customerName: 'Smoke Test Mijoz',
      customerPhone: '+998901112233',
      deliveryAddress: 'Chust, Navoiy ko\'chasi 12',
      latitude: 41.0,
      longitude: 71.07,
      formattedAddress: 'Chust, Navoiy ko\'chasi 12',
      status: 'READY',
      readyAt: new Date(),
      idempotencyKey: `smoke-${Date.now()}`,
      subtotalAmount: 50000,
      deliveryFee: 3000,
      totalAmount: 53000,
      items: {
        create: {
          productId: product.id,
          quantity: 2,
          price: 25000,
          title: product.name,
          unitType: 'dona',
        },
      },
    },
  });

  console.log('READY order created:', order.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
