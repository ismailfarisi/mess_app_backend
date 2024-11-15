import { Module } from '@nestjs/common';
import { MealSubscriptionService } from './meal-subscription.service';
import { MealSubscriptionController } from './meal-subscription.controller';

@Module({
  controllers: [MealSubscriptionController],
  providers: [MealSubscriptionService],
})
export class MealSubscriptionModule {}
