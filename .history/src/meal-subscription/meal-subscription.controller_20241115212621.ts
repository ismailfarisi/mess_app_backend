import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MealSubscriptionService } from './meal-subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionStatus } from './enums/subscription-status.enum';

@ApiTags('meal-subscriptions')
@Controller('meal-subscriptions')
@UseGuards(JwtAuthGuard)
export class MealSubscriptionController {
  constructor(
    private readonly mealSubscriptionService: MealSubscriptionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new meal subscription' })
  create(@GetUser() user: User, @Body() createDto: CreateSubscriptionDto) {
    return this.mealSubscriptionService.create(user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user subscriptions' })
  findUserSubscriptions(
    @GetUser() user: User,
    @Query('status') status?: SubscriptionStatus,
  ) {
    return this.mealSubscriptionService.findUserSubscriptions(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.mealSubscriptionService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription status' })
  update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return this.mealSubscriptionService.update(user.id, id, updateDto);
  }
}
