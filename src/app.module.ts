import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { NotificationModule } from './notification/notification.module';
import { PaymentsModule } from './payments/payments.module';
import { MealSubscriptionPlanModule } from './meal_subscription_plan/meal_subscription_plan.module';

@Module({
  imports: [UsersModule, VendorsModule, NotificationModule, PaymentsModule, MealSubscriptionPlanModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
