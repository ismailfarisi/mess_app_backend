import { Module } from '@nestjs/common';
import { MealSubscriptionPlanService } from './meal_subscription_plan.service';
import { MealSubscriptionPlanController } from './meal_subscription_plan.controller';

@Module({
  controllers: [MealSubscriptionPlanController],
  providers: [MealSubscriptionPlanService],
})
export class MealSubscriptionPlanModule {}
