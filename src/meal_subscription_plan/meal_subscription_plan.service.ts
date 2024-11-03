import { Injectable } from '@nestjs/common';
import { CreateMealSubscriptionPlanDto } from './dto/create-meal_subscription_plan.dto';
import { UpdateMealSubscriptionPlanDto } from './dto/update-meal_subscription_plan.dto';

@Injectable()
export class MealSubscriptionPlanService {
  create(createMealSubscriptionPlanDto: CreateMealSubscriptionPlanDto) {
    return 'This action adds a new mealSubscriptionPlan';
  }

  findAll() {
    return `This action returns all mealSubscriptionPlan`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mealSubscriptionPlan`;
  }

  update(id: number, updateMealSubscriptionPlanDto: UpdateMealSubscriptionPlanDto) {
    return `This action updates a #${id} mealSubscriptionPlan`;
  }

  remove(id: number) {
    return `This action removes a #${id} mealSubscriptionPlan`;
  }
}
