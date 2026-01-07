import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { PricingService } from './pricing.service';
import { GoogleMapsService } from './google-maps.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [NotificationsModule, WebSocketModule],
  controllers: [RidesController],
  providers: [RidesService, PricingService, GoogleMapsService],
  exports: [RidesService],
})
export class RidesModule {}
