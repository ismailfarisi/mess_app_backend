import { PartialType } from '@nestjs/mapped-types';
import { CreateMealSubscriptionPlanDto } from './create-meal_subscription_plan.dto';

export class UpdateMealSubscriptionPlanDto extends PartialType(CreateMealSubscriptionPlanDto) {}
