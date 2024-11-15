import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionTasks } from './subscription.tasks';
import { MealSubscriptionModule } from '../meal-subscription/meal-subscription.module';

@Module({
  imports: [ScheduleModule.forRoot(), MealSubscriptionModule],
  providers: [SubscriptionTasks],
})
export class TasksModule {}
