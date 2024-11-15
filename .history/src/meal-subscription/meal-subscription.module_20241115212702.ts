import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealSubscriptionController } from './meal-subscription.controller';
import { MealSubscriptionService } from './meal-subscription.service';
import { MealSubscription } from './entities/meal-subscription.entity';
import { VendorMenuModule } from '../vendor-menu/vendor-menu.module';

@Module({
  imports: [TypeOrmModule.forFeature([MealSubscription]), VendorMenuModule],
  controllers: [MealSubscriptionController],
  providers: [MealSubscriptionService],
  exports: [MealSubscriptionService],
})
export class MealSubscriptionModule {}
