import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';
import { Throttle } from '@nestjs/throttler';
import { fileTypeFromBuffer } from 'file-type';

type PresignBody = {
  productId: string;
  magicBase64: string;
  mainSize: number;
  cardSize: number;
  thumbSize: number;
};
type FinalizeBody = { sessionId: string };

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return callback(new BadRequestException('Faqat jpg/png/webp formatlari qabul qilinadi'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadLegacy(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: { query?: { productId?: string } },
  ) {
    const productId = req?.query?.productId;
    if (!productId || !productId.trim()) {
      throw new BadRequestException('productId yuborilishi shart');
    }
    if (!file) {
      throw new BadRequestException('Rasm fayli yuborilmadi');
    }
    try {
      const keys = this.uploadService.buildKeys(productId.trim());
      const upload = await this.uploadService.createPresignedUpload(keys.main.key, 'image/jpeg');
      return {
        key: keys.main.key,
        url: keys.main.publicUrl,
        uploadUrl: upload.uploadUrl,
        headers: upload.headers,
      };
    } catch {
      await this.uploadService.recordUploadError();
      throw new BadRequestException("Rasmni yuklashga tayyorlab bo'lmadi");
    } finally {
      if (productId?.trim()) {
        await this.uploadService.logAudit({
          userId: user.sub,
          productId: productId.trim(),
          action: 'LEGACY_UPLOAD',
        });
      }
    }
  }

  @Post('presign')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async presign(@CurrentUser() user: { sub: string }, @Body() body: PresignBody) {
    const { productId, magicBase64, mainSize, cardSize, thumbSize } = body;
    if (!productId?.trim()) {
      throw new BadRequestException('productId yuborilishi shart');
    }
    if (!magicBase64) {
      throw new BadRequestException('Fayl tekshiruvi uchun magicBase64 yuborilishi shart');
    }
    const maxBytes = 5 * 1024 * 1024;
    for (const size of [mainSize, cardSize, thumbSize]) {
      if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
        throw new BadRequestException("Rasm hajmi 5MB dan oshmasligi kerak");
      }
    }
    const magic = Buffer.from(magicBase64, 'base64');
    const detected = await fileTypeFromBuffer(magic);
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!detected || !allowed.has(detected.mime)) {
      throw new BadRequestException("Noto'g'ri fayl turi. Faqat jpg/png/webp mumkin");
    }

    try {
      const keys = this.uploadService.buildKeys(productId.trim());
      const [main, card, thumb] = await Promise.all([
        this.uploadService.createPresignedUpload(keys.main.key, 'image/jpeg'),
        this.uploadService.createPresignedUpload(keys.card.key, 'image/jpeg'),
        this.uploadService.createPresignedUpload(keys.thumb.key, 'image/jpeg'),
      ]);

      return {
        expiresIn: 60,
        main: { ...keys.main, ...main },
        card: { ...keys.card, ...card },
        thumb: { ...keys.thumb, ...thumb },
        sessionId: (
          await this.uploadService.createUploadSession({
            productId: productId.trim(),
            mainUrl: keys.main.publicUrl,
            mainKey: keys.main.key,
            cardUrl: keys.card.publicUrl,
            cardKey: keys.card.key,
            thumbUrl: keys.thumb.publicUrl,
            thumbKey: keys.thumb.key,
            mainSize,
            cardSize,
            thumbSize,
          })
        ).id,
      };
    } catch {
      throw new BadRequestException("Upload URL yaratishda xatolik yuz berdi");
    } finally {
      await this.uploadService.logAudit({
        userId: user.sub,
        productId: productId.trim(),
        action: 'PRESIGN',
      });
    }
  }

  @Post('finalize')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async finalize(@CurrentUser() user: { sub: string }, @Body() body: FinalizeBody) {
    if (!body?.sessionId) {
      throw new BadRequestException('sessionId yuborilishi shart');
    }
    try {
      const product = await this.uploadService.finalizeUpload(body.sessionId);
      return {
        productId: product.id,
        imageUrl: product.imageUrl,
        imageKey: product.imageKey,
        imageCardUrl: product.imageCardUrl,
        imageCardKey: product.imageCardKey,
        imageThumbUrl: product.imageThumbUrl,
        imageThumbKey: product.imageThumbKey,
      };
    } catch (error) {
      await this.uploadService.recordUploadError();
      throw new BadRequestException(error instanceof Error ? error.message : "Finalize xatoligi");
    } finally {
      await this.uploadService.logAudit({
        userId: user.sub,
        action: 'FINALIZE',
      });
    }
  }

  @Delete('*key')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async remove(@CurrentUser() user: { sub: string }, @Param('key') key?: string) {
    if (!key) {
      throw new BadRequestException('Fayl kaliti yuborilmadi');
    }
    await this.uploadService.deleteImage(key);
    await this.uploadService.logAudit({
      userId: user.sub,
      action: 'DELETE',
      objectKey: key,
    });
    return { success: true };
  }

  @Post('metrics/success')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  recordSuccess(@Body() body: { size: number }) {
    if (!Number.isFinite(body?.size) || body.size <= 0) {
      throw new BadRequestException("Noto'g'ri size qiymati");
    }
    this.uploadService.recordUpload(body.size);
    return { success: true };
  }

  @Post('metrics/error')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  recordError() {
    void this.uploadService.recordUploadError();
    return { success: true };
  }

  @Get('metrics')
  async getMetrics() {
    return this.uploadService.getMetrics();
  }

  @Get('sessions')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getSessions() {
    const sessions = await this.uploadService.listUploadSessions();
    const now = Date.now();
    return sessions.map((session) => ({
      ...session,
      isExpired: session.expiresAt.getTime() < now,
    }));
  }

  @Delete('sessions/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async closeSession(@Param('id') id: string) {
    return this.uploadService.forceCloseSession(id);
  }

  @Get('failed-jobs')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async getFailedJobs() {
    return this.uploadService.listFailedJobs();
  }

  @Delete('failed-jobs/:id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async deleteFailedJob(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    const result = await this.uploadService.deleteFailedJob(id);
    await this.uploadService.logAudit({
      userId: user.sub,
      action: 'RETRY',
      objectKey: `job:${id}:deleted`,
    });
    return result;
  }

  @Post('failed-jobs/:id/retry')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async retryFailedJob(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    try {
      const result = await this.uploadService.retryFailedJob(id);
      await this.uploadService.logAudit({
        userId: user.sub,
        action: 'RETRY',
        objectKey: `job:${id}:success`,
      });
      return result;
    } catch (error) {
      await this.uploadService.logAudit({
        userId: user.sub,
        action: 'RETRY',
        objectKey: `job:${id}:failed`,
      });
      throw new BadRequestException(error instanceof Error ? error.message : 'Retry failed');
    }
  }

  @Get('storage')
  async getStorageUsage() {
    return this.uploadService.getStorageUsage();
  }

  @Get('metrics/prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getPrometheusMetrics() {
    return this.uploadService.getPrometheusMetrics();
  }
}
