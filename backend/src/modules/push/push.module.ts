import { Module, Global } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushNotificationService } from './push.service';

@Global()
@Module({
  controllers: [PushController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushModule {}
