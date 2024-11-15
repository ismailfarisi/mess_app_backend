import { Test, TestingModule } from '@nestjs/testing';
import { MealSubscriptionService } from './meal-subscription.service';

describe('MealSubscriptionService', () => {
  let service: MealSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MealSubscriptionService],
    }).compile();

    service = module.get<MealSubscriptionService>(MealSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
