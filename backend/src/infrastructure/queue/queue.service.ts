import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  async enqueue(taskName: string, payload: unknown): Promise<void> {
    this.logger.debug(`Queue placeholder - task: ${taskName}`);
    void payload;
  }
}
