import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MealSubscriptionService } from './meal-subscription.service';
import { CreateMealSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateMealSubscriptionDto } from './dto/update-subscription.dto';

@Controller('meal-subscription')
export class MealSubscriptionController {
  constructor(
    private readonly mealSubscriptionService: MealSubscriptionService,
  ) {}

  @Post()
  create(@Body() createMealSubscriptionDto: CreateMealSubscriptionDto) {
    return this.mealSubscriptionService.create(createMealSubscriptionDto);
  }

  @Get()
  findAll() {
    return this.mealSubscriptionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mealSubscriptionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMealSubscriptionDto: UpdateMealSubscriptionDto,
  ) {
    return this.mealSubscriptionService.update(+id, updateMealSubscriptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mealSubscriptionService.remove(+id);
  }
}
