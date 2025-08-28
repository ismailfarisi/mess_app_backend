import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealSubscriptionController } from './meal-subscription.controller';
import { MonthlySubscriptionController } from './monthly-subscription.controller';
import { MealSubscriptionService } from './meal-subscription.service';
import { MonthlySubscriptionService } from './monthly-subscription.service';
import { MealSubscription } from './entities/meal-subscription.entity';
import { MonthlySubscription } from './entities/monthly-subscription.entity';
import { VendorMenuModule } from '../vendor-menu/vendor-menu.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MealSubscription, MonthlySubscription]),
    VendorMenuModule,
    VendorsModule,
  ],
  controllers: [MealSubscriptionController, MonthlySubscriptionController],
  providers: [MealSubscriptionService, MonthlySubscriptionService],
  exports: [MealSubscriptionService, MonthlySubscriptionService, TypeOrmModule],
})
export class MealSubscriptionModule {}
