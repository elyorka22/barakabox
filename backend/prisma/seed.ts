import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser(
  email: string,
  fullName: string,
  role: Role,
  options?: { staffLogin?: string | null },
) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const staffLogin = options?.staffLogin?.trim().toLowerCase() ?? null;
  return prisma.user.upsert({
    where: { email },
    update: { fullName, role, passwordHash, staffLogin, isActive: true },
    create: { email, fullName, role, passwordHash, staffLogin, isActive: true },
  });
}

async function main() {
  const admin = await createUser('admin@barakabox.local', 'Admin', Role.SUPER_ADMIN, { staffLogin: 'admin' });
  const manager = await createUser('manager@barakabox.local', 'Manager', Role.MANAGER, { staffLogin: 'manager' });
  const businessUser = await createUser('business@barakabox.local', 'Business Owner', Role.BUSINESS, {
    staffLogin: 'business',
  });
  const courier = await createUser('courier@barakabox.local', 'Courier', Role.COURIER, { staffLogin: 'courier' });
  const picker = await createUser('picker@barakabox.local', 'Picker', Role.PICKER, { staffLogin: 'picker' });
  const client = await createUser('client@barakabox.local', 'Client User', Role.CLIENT);

  const businessProfile = await prisma.businessProfile.upsert({
    where: { userId: businessUser.id },
    update: { displayName: 'Baraka Fresh Store', status: 'APPROVED' },
    create: { userId: businessUser.id, displayName: 'Baraka Fresh Store', status: 'APPROVED' },
  });

  const categories = [
    { name: 'All', slug: 'all', imageUrl: '/categories/all.svg' },
    { name: 'Fruits', slug: 'fruits', imageUrl: '/categories/fruits.svg' },
    { name: 'Vegetables', slug: 'vegetables', imageUrl: '/categories/vegetables.svg' },
    { name: 'Dairy', slug: 'dairy', imageUrl: '/categories/dairy.svg' },
    { name: 'Bakery', slug: 'bakery', imageUrl: '/categories/bakery.svg' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, imageUrl: category.imageUrl, isActive: true },
      create: category,
    });
  }

  const categoryMap = {
    fruits: (await prisma.category.findUniqueOrThrow({ where: { slug: 'fruits' } })).id,
    vegetables: (await prisma.category.findUniqueOrThrow({ where: { slug: 'vegetables' } })).id,
    dairy: (await prisma.category.findUniqueOrThrow({ where: { slug: 'dairy' } })).id,
    bakery: (await prisma.category.findUniqueOrThrow({ where: { slug: 'bakery' } })).id,
  };

  const products = [
    { name: 'Apple', price: 12000, stockQuantity: 100, categoryId: categoryMap.fruits, unit: 'dona' as const },
    { name: 'Banana', price: 8000, stockQuantity: 120, categoryId: categoryMap.fruits, unit: 'dona' as const },
    { name: 'Tomato', price: 15000, stockQuantity: 80, categoryId: categoryMap.vegetables, unit: 'kg' as const },
    { name: 'Potato', price: 9000, stockQuantity: 150, categoryId: categoryMap.vegetables, unit: 'kg' as const },
    { name: 'Milk 1L', price: 21000, stockQuantity: 60, categoryId: categoryMap.dairy, unit: 'litr' as const },
  ];

  const createdProducts: Record<string, { id: string; price: number }> = {};
  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { businessId: businessProfile.id, name: product.name },
      include: { variants: true },
    });

    const resolved =
      existing ??
      (await prisma.product.create({
        data: {
          businessId: businessProfile.id,
          name: product.name,
          price: product.price,
          stockQuantity: product.stockQuantity,
          categoryId: product.categoryId,
          unit: product.unit,
        },
      }));

    const hasVariants =
      existing?.variants?.length ??
      (await prisma.productVariant.count({ where: { productId: resolved.id } }));

    if (!hasVariants) {
      await prisma.productVariant.create({
        data: {
          productId: resolved.id,
          title: product.name,
          description: `${product.name} default variant`,
          price: product.price,
          stock: product.stockQuantity,
          sortOrder: 0,
          isActive: true,
        },
      });
    }

    createdProducts[product.name] = { id: resolved.id, price: product.price };
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
      price: weeklyPrice - 2000,
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
      price: familyPrice - 3500,
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
      price: plovPrice - 1500,
      items: [
        { productName: 'Tomato', quantity: 2 },
        { productName: 'Potato', quantity: 6 },
        { productName: 'Milk 1L', quantity: 1 },
      ],
    },
  ];

  for (const box of boxes) {
    const existingBox = await prisma.box.findFirst({
      where: { name: box.name },
      include: { items: true },
    });
    if (existingBox) {
      continue;
    }

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
    adminLogin: admin.staffLogin,
    business: businessUser.email,
    courier: courier.email,
    courierLogin: courier.staffLogin,
    picker: picker.email,
    pickerLogin: picker.staffLogin,
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
