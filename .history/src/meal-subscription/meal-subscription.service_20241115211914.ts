import { Injectable } from '@nestjs/common';
import { CreateMealSubscriptionDto } from './dto/create-meal-subscription.dto';
import { UpdateMealSubscriptionDto } from './dto/update-meal-subscription.dto';

@Injectable()
export class MealSubscriptionService {
  create(createMealSubscriptionDto: CreateMealSubscriptionDto) {
    return 'This action adds a new mealSubscription';
  }

  findAll() {
    return `This action returns all mealSubscription`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mealSubscription`;
  }

  update(id: number, updateMealSubscriptionDto: UpdateMealSubscriptionDto) {
    return `This action updates a #${id} mealSubscription`;
  }

  remove(id: number) {
    return `This action removes a #${id} mealSubscription`;
  }
}
