import { Test, TestingModule } from '@nestjs/testing';
import { MealSubscriptionPlanController } from './meal_subscription_plan.controller';
import { MealSubscriptionPlanService } from './meal_subscription_plan.service';

describe('MealSubscriptionPlanController', () => {
  let controller: MealSubscriptionPlanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealSubscriptionPlanController],
      providers: [MealSubscriptionPlanService],
    }).compile();

    controller = module.get<MealSubscriptionPlanController>(MealSubscriptionPlanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
