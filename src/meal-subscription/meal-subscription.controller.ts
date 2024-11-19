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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { MealType } from 'src/commons/enums/meal-type.enum';
import { SubscriptionsResponseDto } from './dto/subscription-response.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
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

  @Get('current')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current active subscriptions for authenticated user',
    description:
      'Returns all active subscriptions with pagination and filtering options',
  })
  @ApiResponse({
    status: 200,
    description: 'List of current active subscriptions',
    type: SubscriptionsResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mealType', required: false, enum: MealType })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getCurrentSubscriptions(
    @GetUser() user: User,
    @Query() query: QuerySubscriptionDto,
  ): Promise<SubscriptionsResponseDto> {
    return this.mealSubscriptionService.getCurrentSubscriptions(user.id, query);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user subscriptions with filters',
    description:
      'Returns all user subscriptions with pagination and filtering options',
  })
  @ApiResponse({
    status: 200,
    type: SubscriptionsResponseDto,
  })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mealType', required: false, enum: MealType })
  findUserSubscriptions(
    @GetUser() user: User,
    @Query() query: QuerySubscriptionDto,
  ): Promise<SubscriptionsResponseDto> {
    return this.mealSubscriptionService.findUserSubscriptions(user.id, query);
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
