import { Test, TestingModule } from '@nestjs/testing';
import { MealSubscriptionController } from './meal-subscription.controller';
import { MealSubscriptionService } from './meal-subscription.service';

describe('MealSubscriptionController', () => {
  let controller: MealSubscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealSubscriptionController],
      providers: [MealSubscriptionService],
    }).compile();

    controller = module.get<MealSubscriptionController>(MealSubscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
