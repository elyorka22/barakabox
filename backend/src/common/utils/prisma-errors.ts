import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const logger = new Logger('PrismaError');

function isRoleEnumError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('enum') &&
    (lower.includes('role') || lower.includes('invalid input value'))
  );
}

function isSchemaDriftError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes('column') && lower.includes('does not exist')) ||
    lower.includes('relation') && lower.includes('does not exist') ||
    lower.includes('globalproduct') && lower.includes('migrate')
  );
}

/** Map Prisma failures to client-safe messages; log full detail server-side. */
export function throwMappedPrismaError(error: unknown, context: string): never {
  const label = context ? `[${context}] ` : '';

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error(`${label}Prisma ${error.code}`, JSON.stringify({ meta: error.meta, message: error.message }));
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : String(target ?? '');
      if (field.includes('slug')) {
        throw new BadRequestException('Bu slug allaqachon band. Boshqa slug tanlang.');
      }
      throw new BadRequestException('Bu ma’lumot allaqachon mavjud');
    }
    if (error.code === 'P2003') {
      throw new BadRequestException('Bog‘liq yozuv topilmadi (masalan, kategoriya)');
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Yozuv topilmadi');
    }
    if (isSchemaDriftError(error.message)) {
      throw new BadRequestException(
        'Marketplace bazasi yangilanmagan. Serverda `npx prisma migrate deploy` buyrug‘ini ishga tushiring.',
      );
    }
    throw new BadRequestException(`So‘rovni bajarib bo‘lmadi (${error.code}). Ma’lumotlarni tekshiring.`);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error(`${label}Prisma validation`, error.message);
    if (isSchemaDriftError(error.message)) {
      throw new BadRequestException(
        'Marketplace sxemasi mos emas. `npx prisma migrate deploy` va `npx prisma generate` ni ishga tushiring.',
      );
    }
    throw new BadRequestException('Noto‘g‘ri so‘rov parametrlari');
  }

  if (error instanceof Error) {
    logger.error(`${label}${error.message}`, error.stack);
    if (isRoleEnumError(error.message)) {
      throw new BadRequestException(
        'Rollar bazasi yangilanmagan. Serverda `npx prisma migrate deploy` buyrug‘ini ishga tushiring.',
      );
    }
    if (isSchemaDriftError(error.message)) {
      throw new BadRequestException(
        'Marketplace jadvallari yangilanmagan. Serverda `npx prisma migrate deploy` buyrug‘ini ishga tushiring.',
      );
    }
  } else {
    logger.error(`${label}${String(error)}`);
  }

  throw new BadRequestException('Ma’lumotlarni yuklab bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.');
}
