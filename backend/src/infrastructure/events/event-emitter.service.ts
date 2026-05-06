import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  emit(eventName: string, payload: unknown): void {
    this.logger.debug(`Event placeholder emitted: ${eventName}`);
    void payload;
  }
}
