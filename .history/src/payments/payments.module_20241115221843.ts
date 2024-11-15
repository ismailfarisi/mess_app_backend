import { TypeOrmModule } from '@nestjs/typeorm';
import Module from 'module';
import { MealSubscriptionModule } from 'src/meal-subscription/meal-subscription.module';
import { Payment } from './entities/payment.entity';
import { PaymentProcessorService } from './services/payment-processor.service';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), MealSubscriptionModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentProcessorService],
  exports: [PaymentService],
})
export class PaymentsModule {}
