import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      message,
    });

    return await this.notificationRepository.save(notification);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    await this.notificationRepository.delete({ id: notificationId, userId });
  }
}
