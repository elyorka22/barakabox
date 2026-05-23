/**
 * Stage 4: migrate legacy Product / BusinessProfile into marketplace tables.
 *
 * Usage:
 *   npx ts-node prisma/marketplace-migrate.ts           # apply
 *   npx ts-node prisma/marketplace-migrate.ts --dry-run  # preview counts
 *
 * Or after build:
 *   npm run marketplace:migrate
 *   npm run marketplace:migrate:dry
 */
import { MarketplaceMigrationService } from '../src/modules/marketplace/marketplace-migration.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

const prisma = new PrismaService();

async function main() {
  await prisma.$connect();
  const dryRun = process.argv.includes('--dry-run') || process.env.MARKETPLACE_MIGRATE_DRY === '1';
  const migration = new MarketplaceMigrationService(prisma);
  const stats = await migration.run(dryRun);

  console.log(JSON.stringify(stats, null, 2));

  if (stats.errors.length > 0) {
    console.error(`Completed with ${stats.errors.length} error(s).`);
    if (!dryRun) process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
