import { Controller, Get } from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('health')
export class UploadHealthController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('upload')
  async health() {
    return this.uploadService.checkHealth();
  }
}
