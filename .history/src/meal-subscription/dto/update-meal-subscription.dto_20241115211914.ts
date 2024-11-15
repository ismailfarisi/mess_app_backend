import { PartialType } from '@nestjs/swagger';
import { CreateMealSubscriptionDto } from './create-meal-subscription.dto';

export class UpdateMealSubscriptionDto extends PartialType(CreateMealSubscriptionDto) {}
