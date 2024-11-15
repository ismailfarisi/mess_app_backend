import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class VendorEvents {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('vendor.new_menu')
  async handleNewMenu(payload: {
    userId: string;
    vendorName: string;
    menuType: string;
  }) {
    await this.notificationsService.create(
      payload.userId,
      NotificationType.NEW_MENU_AVAILABLE,
      `${payload.vendorName} has added a new ${payload.menuType} menu.`,
    );
  }
}
