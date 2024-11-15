import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class SubscriptionEvents {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('subscription.expiring')
  async handleSubscriptionExpiring(payload: {
    userId: string;
    daysLeft: number;
  }) {
    await this.notificationsService.create(
      payload.userId,
      NotificationType.SUBSCRIPTION_EXPIRING,
      `Your subscription will expire in ${payload.daysLeft} days.`,
    );
  }

  @OnEvent('subscription.expired')
  async handleSubscriptionExpired(payload: { userId: string }) {
    await this.notificationsService.create(
      payload.userId,
      NotificationType.SUBSCRIPTION_EXPIRED,
      'Your subscription has expired.',
    );
  }
}
