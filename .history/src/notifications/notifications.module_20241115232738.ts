import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';

@Module({
  controllers: [NotificationsController],
  imports: [TypeOrmModule.forFeature(Notification)],
  providers: [NotificationsService],
})
export class NotificationsModule {}
