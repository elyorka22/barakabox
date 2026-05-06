import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser(email: string, fullName: string, role: Role) {
  const passwordHash = await bcrypt.hash('password123', 10);
  return prisma.user.upsert({
    where: { email },
    update: { fullName, role, passwordHash },
    create: { email, fullName, role, passwordHash },
  });
}

async function main() {
  const admin = await createUser('admin@barakabox.local', 'Admin', Role.ADMIN);
  const businessUser = await createUser('business@barakabox.local', 'Business Owner', Role.BUSINESS);
  const courier = await createUser('courier@barakabox.local', 'Courier', Role.COURIER);
  const client = await createUser('client@barakabox.local', 'Client User', Role.CLIENT);

  const businessProfile = await prisma.businessProfile.upsert({
    where: { userId: businessUser.id },
    update: { displayName: 'Baraka Fresh Store', status: 'APPROVED' },
    create: { userId: businessUser.id, displayName: 'Baraka Fresh Store', status: 'APPROVED' },
  });

  const products = [
    { name: 'Apple', price: 1.2, stock: 100 },
    { name: 'Banana', price: 0.8, stock: 120 },
    { name: 'Tomato', price: 1.5, stock: 80 },
    { name: 'Potato', price: 0.9, stock: 150 },
    { name: 'Milk 1L', price: 2.1, stock: 60 },
  ];

  await prisma.boxItem.deleteMany();
  await prisma.box.deleteMany();
  await prisma.product.deleteMany({ where: { businessId: businessProfile.id } });

  const createdProducts: Record<string, { id: string; price: number }> = {};
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        businessId: businessProfile.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
      },
    });
    createdProducts[product.name] = { id: created.id, price: product.price };
  }

  const weeklyPrice =
    createdProducts['Apple'].price * 4 +
    createdProducts['Banana'].price * 6 +
    createdProducts['Tomato'].price * 4 +
    createdProducts['Potato'].price * 4;
  const familyPrice =
    createdProducts['Apple'].price * 8 +
    createdProducts['Banana'].price * 8 +
    createdProducts['Milk 1L'].price * 3 +
    createdProducts['Potato'].price * 8;
  const plovPrice =
    createdProducts['Tomato'].price * 2 +
    createdProducts['Potato'].price * 6 +
    createdProducts['Milk 1L'].price * 1;

  const boxes = [
    {
      name: 'Weekly Box',
      description: 'Fresh essentials for the week',
      price: Number((weeklyPrice - 2).toFixed(2)),
      items: [
        { productName: 'Apple', quantity: 4 },
        { productName: 'Banana', quantity: 6 },
        { productName: 'Tomato', quantity: 4 },
        { productName: 'Potato', quantity: 4 },
      ],
    },
    {
      name: 'Family Box',
      description: 'Bigger bundle for family needs',
      price: Number((familyPrice - 3.5).toFixed(2)),
      items: [
        { productName: 'Apple', quantity: 8 },
        { productName: 'Banana', quantity: 8 },
        { productName: 'Milk 1L', quantity: 3 },
        { productName: 'Potato', quantity: 8 },
      ],
    },
    {
      name: 'Plov Box',
      description: 'Ingredients for a great plov dinner',
      price: Number((plovPrice - 1.5).toFixed(2)),
      items: [
        { productName: 'Tomato', quantity: 2 },
        { productName: 'Potato', quantity: 6 },
        { productName: 'Milk 1L', quantity: 1 },
      ],
    },
  ];

  for (const box of boxes) {
    await prisma.box.create({
      data: {
        name: box.name,
        description: box.description,
        price: box.price,
        items: {
          create: box.items.map((item) => ({
            productId: createdProducts[item.productName].id,
            quantity: item.quantity,
          })),
        },
      },
    });
  }

  console.log({
    admin: admin.email,
    business: businessUser.email,
    courier: courier.email,
    client: client.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
