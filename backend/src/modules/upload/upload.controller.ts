import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';
import { Throttle } from '@nestjs/throttler';
import { fileTypeFromBuffer } from 'file-type';
import { FinalizeUploadDto, PresignUploadDto } from './dto/upload.dto';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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
      const uploaded = await this.uploadService.uploadProductImage(productId.trim(), file);
      this.logger.log(
        JSON.stringify({
          event: 'upload_legacy_success',
          productId: productId.trim(),
          key: uploaded.key,
          size: file.size,
          mime: file.mimetype,
        }),
      );
      return {
        key: uploaded.key,
        url: uploaded.url,
        uploadUrl: null,
        headers: {},
      };
    } catch (error) {
      await this.uploadService.recordUploadError();
      this.logger.error(
        JSON.stringify({
          event: 'upload_legacy_failed',
          productId: productId.trim(),
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      throw new InternalServerErrorException("Rasmni Spaces'ga yuklashda xatolik yuz berdi");
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

  @Post('image')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return callback(new BadRequestException('Faqat jpg/jpeg/png/webp formatlari qabul qilinadi'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: { query?: { folder?: string } },
  ) {
    this.logger.log(
      JSON.stringify({
        event: 'upload_image_request_received',
        hasFile: Boolean(file),
      }),
    );
    if (!file) {
      throw new BadRequestException('Rasm fayli yuborilmadi');
    }
    this.logger.log(
      JSON.stringify({
        event: 'upload_image_file_meta',
        fieldName: file.fieldname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        hasBuffer: Boolean(file.buffer?.length),
      }),
    );
    const detected = await fileTypeFromBuffer(file.buffer);
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!detected || !allowed.has(detected.mime)) {
      throw new BadRequestException("Noto'g'ri fayl turi. Faqat jpg/png/webp mumkin");
    }
    const folderRaw = req?.query?.folder?.trim().toLowerCase();
    const allowedFolders = new Set(['products', 'categories', 'banners', 'users', 'stores']);
    const folder =
      folderRaw && allowedFolders.has(folderRaw)
        ? (folderRaw as 'products' | 'categories' | 'banners' | 'users' | 'stores')
        : 'products';

    try {
      const uploaded = await this.uploadService.uploadImageForForm(file, folder);
      this.logger.log(
        JSON.stringify({
          event: 'upload_image_success',
          key: uploaded.key,
          url: uploaded.url,
        }),
      );
      await this.uploadService.logAudit({
        userId: user.sub,
        action: 'LEGACY_UPLOAD',
        objectKey: uploaded.key,
      });
      return {
        success: true,
        url: uploaded.url,
        key: uploaded.key,
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : 'unknown';
      this.logger.error(
        JSON.stringify({
          event: 'upload_image_failed',
          error: details,
        }),
      );
      throw new InternalServerErrorException({
        success: false,
        message: "Rasmni yuklashda xatolik yuz berdi",
        details,
      });
    }
  }

  @Post('image/debug-test')
  async debugUpload() {
    try {
      const result = await this.uploadService.runSpacesDebugUpload();
      this.logger.log(
        JSON.stringify({
          event: 'upload_debug_success',
          ...result,
        }),
      );
      return result;
    } catch (error) {
      const details = error instanceof Error ? error.message : 'unknown';
      this.logger.error(
        JSON.stringify({
          event: 'upload_debug_failed',
          details,
        }),
      );
      throw new InternalServerErrorException({
        success: false,
        message: 'Spaces debug upload failed',
        details,
      });
    }
  }

  @Post('presign')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async presign(@CurrentUser() user: { sub: string }, @Body() body: PresignUploadDto) {
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
  async finalize(@CurrentUser() user: { sub: string }, @Body() body: FinalizeUploadDto) {
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
