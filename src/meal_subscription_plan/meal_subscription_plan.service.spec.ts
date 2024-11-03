import { Test, TestingModule } from '@nestjs/testing';
import { MealSubscriptionPlanService } from './meal_subscription_plan.service';

describe('MealSubscriptionPlanService', () => {
  let service: MealSubscriptionPlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MealSubscriptionPlanService],
    }).compile();

    service = module.get<MealSubscriptionPlanService>(MealSubscriptionPlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
