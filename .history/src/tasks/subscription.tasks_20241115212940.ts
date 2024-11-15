import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MealSubscriptionService } from '../meal-subscription/meal-subscription.service';

@Injectable()
export class SubscriptionTasks {
  constructor(
    private readonly mealSubscriptionService: MealSubscriptionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions() {
    await this.mealSubscriptionService.checkAndUpdateExpiredSubscriptions();
  }
}
