import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { MonthlySubscriptionService } from './monthly-subscription.service';
import {
  CreateMonthlySubscriptionDto,
  AvailableVendorsQueryDto,
  AvailableVendorsResponseDto,
  ValidateMonthlySelectionDto,
  ValidationResultDto,
  MonthlyPreviewQueryDto,
  MonthlyPreviewResponseDto,
  MonthlySubscriptionResponseDto,
} from './dto';

/**
 * Controller for managing monthly subscription operations
 * Handles vendor selection, validation, preview, and subscription creation
 */
@ApiTags('monthly-subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MonthlySubscriptionController {
  constructor(
    private readonly monthlySubscriptionService: MonthlySubscriptionService,
  ) {}

  /**
   * Create a new monthly subscription with up to 4 vendors
   */
  @Post('monthly')
  @ApiOperation({
    summary: 'Create new monthly subscription with up to 4 vendors',
    description:
      'Creates a monthly subscription allowing users to select up to 4 vendors for meal deliveries',
  })
  @ApiResponse({
    status: 201,
    description: 'Monthly subscription created successfully',
    type: MonthlySubscriptionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or business rules violated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async createMonthlySubscription(
    @GetUser() user: User,
    @Body() createDto: CreateMonthlySubscriptionDto,
  ): Promise<MonthlySubscriptionResponseDto> {
    return this.monthlySubscriptionService.createMonthlySubscription(
      user.id,
      createDto,
    );
  }

  /**
   * Get available vendors for monthly subscription based on location and meal type
   */
  @Get('monthly/vendors/available')
  @ApiOperation({
    summary: 'Get available vendors for monthly subscription',
    description:
      'Retrieves vendors available for monthly subscription based on location and meal preferences',
  })
  @ApiQuery({
    name: 'latitude',
    type: 'number',
    description: 'User latitude coordinate',
    example: 25.2048,
  })
  @ApiQuery({
    name: 'longitude',
    type: 'number',
    description: 'User longitude coordinate',
    example: 55.2708,
  })
  @ApiQuery({
    name: 'mealType',
    enum: ['BREAKFAST', 'LUNCH', 'DINNER'],
    description: 'Type of meal subscription',
    example: 'LUNCH',
  })
  @ApiQuery({
    name: 'radius',
    type: 'number',
    required: false,
    description: 'Search radius in kilometers (optional, defaults to 10km)',
    example: 15,
  })
  @ApiResponse({
    status: 200,
    description: 'Available vendors retrieved successfully',
    type: AvailableVendorsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getAvailableVendors(
    @Query() query: AvailableVendorsQueryDto,
  ): Promise<AvailableVendorsResponseDto> {
    return this.monthlySubscriptionService.getAvailableVendors(query);
  }

  /**
   * Validate vendor selection for monthly subscription
   */
  @Post('monthly/validate')
  @ApiOperation({
    summary: 'Validate vendor selection for monthly subscription',
    description:
      'Validates that selected vendors meet all business rules and constraints',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation completed',
    type: ValidationResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid validation data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async validateSelection(
    @Body() validateDto: ValidateMonthlySelectionDto,
  ): Promise<ValidationResultDto> {
    return this.monthlySubscriptionService.validateMonthlySelection(
      validateDto,
    );
  }

  /**
   * Get cost preview for monthly subscription
   */
  @Post('monthly/preview')
  @ApiOperation({
    summary: 'Get cost preview for monthly subscription',
    description:
      'Calculates total costs, discounts, and provides detailed pricing breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview calculated successfully',
    type: MonthlyPreviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid preview query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getPreview(
    @Query() query: MonthlyPreviewQueryDto,
  ): Promise<MonthlyPreviewResponseDto> {
    return this.monthlySubscriptionService.getMonthlyPreview(query);
  }

  /**
   * Get specific monthly subscription by ID
   */
  @Get('monthly/:id')
  @ApiOperation({
    summary: 'Get monthly subscription details',
    description:
      'Retrieves detailed information about a specific monthly subscription',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Monthly subscription ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly subscription retrieved successfully',
    type: MonthlySubscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Monthly subscription not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - not owner of subscription',
  })
  async getMonthlySubscription(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<MonthlySubscriptionResponseDto> {
    return this.monthlySubscriptionService.findMonthlySubscription(user.id, id);
  }
}
