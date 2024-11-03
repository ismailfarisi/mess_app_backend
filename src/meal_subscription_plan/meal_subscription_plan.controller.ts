import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MealSubscriptionPlanService } from './meal_subscription_plan.service';
import { CreateMealSubscriptionPlanDto } from './dto/create-meal_subscription_plan.dto';
import { UpdateMealSubscriptionPlanDto } from './dto/update-meal_subscription_plan.dto';

@Controller('meal-subscription-plan')
export class MealSubscriptionPlanController {
  constructor(private readonly mealSubscriptionPlanService: MealSubscriptionPlanService) {}

  @Post()
  create(@Body() createMealSubscriptionPlanDto: CreateMealSubscriptionPlanDto) {
    return this.mealSubscriptionPlanService.create(createMealSubscriptionPlanDto);
  }

  @Get()
  findAll() {
    return this.mealSubscriptionPlanService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mealSubscriptionPlanService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMealSubscriptionPlanDto: UpdateMealSubscriptionPlanDto) {
    return this.mealSubscriptionPlanService.update(+id, updateMealSubscriptionPlanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mealSubscriptionPlanService.remove(+id);
  }
}
