import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

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

  /**
   * Send notification for monthly subscription creation
   * @param userId - User ID
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param vendorCount - Number of vendors in subscription
   * @param totalAmount - Total subscription amount
   */
  async notifyMonthlySubscriptionCreated(
    userId: string,
    monthlySubscriptionId: string,
    vendorCount: number,
    totalAmount: number,
  ): Promise<void> {
    this.logger.log(
      `Sending monthly subscription created notification to user ${userId}`,
    );

    await this.create(
      userId,
      NotificationType.SUBSCRIPTION_CREATED,
      `Your monthly subscription with ${vendorCount} vendors has been created successfully. Total amount: AED ${totalAmount.toFixed(2)}`,
    );
  }

  /**
   * Send notification for monthly subscription cancellation
   * @param userId - User ID
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param refundAmount - Refund amount if applicable
   */
  async notifyMonthlySubscriptionCancelled(
    userId: string,
    monthlySubscriptionId: string,
    refundAmount?: number,
  ): Promise<void> {
    this.logger.log(
      `Sending monthly subscription cancelled notification to user ${userId}`,
    );

    let message = 'Your monthly subscription has been cancelled successfully.';
    if (refundAmount && refundAmount > 0) {
      message += ` A refund of AED ${refundAmount.toFixed(2)} will be processed to your payment method.`;
    }

    await this.create(
      userId,
      NotificationType.SUBSCRIPTION_CANCELLED,
      message,
    );
  }

  /**
   * Send notification for monthly subscription payment processed
   * @param userId - User ID
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param amount - Payment amount
   * @param isSuccessful - Whether payment was successful
   */
  async notifyMonthlySubscriptionPayment(
    userId: string,
    monthlySubscriptionId: string,
    amount: number,
    isSuccessful: boolean,
  ): Promise<void> {
    this.logger.log(
      `Sending monthly subscription payment notification to user ${userId}`,
    );

    const message = isSuccessful
      ? `Payment of AED ${amount.toFixed(2)} for your monthly subscription has been processed successfully.`
      : `Payment of AED ${amount.toFixed(2)} for your monthly subscription failed. Please update your payment method.`;

    await this.create(
      userId,
      isSuccessful
        ? NotificationType.PAYMENT_SUCCESSFUL
        : NotificationType.PAYMENT_FAILED,
      message,
    );
  }

  /**
   * Send notification for vendor capacity updates affecting monthly subscription
   * @param userId - User ID
   * @param vendorName - Vendor name
   * @param message - Custom message about the capacity change
   */
  async notifyVendorCapacityUpdate(
    userId: string,
    vendorName: string,
    message: string,
  ): Promise<void> {
    this.logger.log(
      `Sending vendor capacity update notification to user ${userId}`,
    );

    await this.create(
      userId,
      NotificationType.VENDOR_UPDATE,
      `Update from ${vendorName}: ${message}`,
    );
  }

  /**
   * Send bulk notifications for monthly subscription events
   * @param userIds - Array of user IDs
   * @param type - Notification type
   * @param message - Notification message
   */
  async sendBulkNotifications(
    userIds: string[],
    type: NotificationType,
    message: string,
  ): Promise<void> {
    this.logger.log(`Sending bulk notifications to ${userIds.length} users`);

    const notifications = userIds.map((userId) =>
      this.notificationRepository.create({
        userId,
        type,
        message,
      }),
    );

    await this.notificationRepository.save(notifications);
    this.logger.log(`Successfully sent ${notifications.length} notifications`);
  }

  /**
   * Send notification for monthly subscription delivery updates
   * @param userId - User ID
   * @param deliveryDate - Delivery date
   * @param vendorName - Vendor name
   * @param estimatedTime - Estimated delivery time
   */
  async notifyDeliveryUpdate(
    userId: string,
    deliveryDate: Date,
    vendorName: string,
    estimatedTime: string,
  ): Promise<void> {
    this.logger.log(`Sending delivery update notification to user ${userId}`);

    await this.create(
      userId,
      NotificationType.DELIVERY_UPDATE,
      `Your meal from ${vendorName} is scheduled for delivery on ${deliveryDate.toDateString()} at ${estimatedTime}.`,
    );
  }
}
