import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../../commons/enums/meal-type.enum';

export class VendorBreakdownDto {
  @ApiProperty({
    description: 'Vendor ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  vendorId: string;

  @ApiProperty({
    description: 'Vendor name',
    example: 'Tasty Bites Restaurant',
  })
  vendorName: string;

  @ApiProperty({
    description: 'Cost per meal from this vendor',
    example: 15.0,
  })
  costPerMeal: number;

  @ApiProperty({
    description: 'Number of days this vendor will deliver in the month',
    example: 8,
  })
  deliveryDays: number;

  @ApiProperty({
    description: 'Total cost for this vendor for the month',
    example: 120.0,
  })
  totalCost: number;

  @ApiProperty({
    description:
      'Days of the week this vendor will deliver (1=Monday, 7=Sunday)',
    type: [Number],
    example: [1, 3, 5, 7],
  })
  assignedDays: number[];
}

class CostBreakdownDto {
  @ApiProperty({
    description: 'Total cost for all meals',
    example: 360.0,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Service fee',
    example: 25.0,
  })
  serviceFee: number;

  @ApiProperty({
    description: 'Delivery fee',
    example: 15.0,
  })
  deliveryFee: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 20.0,
  })
  tax: number;

  @ApiProperty({
    description: 'Discount applied if any',
    example: 0.0,
  })
  discount: number;

  @ApiProperty({
    description: 'Final total amount',
    example: 420.0,
  })
  total: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'AED',
  })
  currency: string;
}

class SubscriptionDetailsDto {
  @ApiProperty({
    description: 'Meal type for the subscription',
    enum: MealType,
    example: MealType.LUNCH,
  })
  mealType: MealType;

  @ApiProperty({
    description: 'Start date of the subscription',
    example: '2024-09-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date of the subscription',
    example: '2024-09-30',
  })
  endDate: string;

  @ApiProperty({
    description: 'Total number of delivery days in the month',
    example: 30,
  })
  totalDeliveryDays: number;

  @ApiProperty({
    description: 'Number of selected vendors',
    example: 3,
  })
  vendorCount: number;

  @ApiProperty({
    description: 'Average cost per meal across all vendors',
    example: 12.0,
  })
  averageCostPerMeal: number;
}

export class MonthlyPreviewResponseDto {
  @ApiProperty({
    description: 'Subscription details and overview',
    type: SubscriptionDetailsDto,
  })
  subscription: SubscriptionDetailsDto;

  @ApiProperty({
    description: 'Cost breakdown by vendor',
    type: [VendorBreakdownDto],
  })
  vendorBreakdown: VendorBreakdownDto[];

  @ApiProperty({
    description: 'Overall cost breakdown',
    type: CostBreakdownDto,
  })
  costBreakdown: CostBreakdownDto;

  @ApiProperty({
    description: 'Estimated savings compared to daily ordering',
    example: 80.0,
  })
  estimatedSavings: number;

  @ApiProperty({
    description: 'Savings percentage',
    example: 16.0,
  })
  savingsPercentage: number;

  @ApiProperty({
    description: 'Preview generation timestamp',
    example: '2024-08-28T08:00:00.000Z',
  })
  generatedAt: Date;

  @ApiProperty({
    description: 'Preview expiry time (valid for 30 minutes)',
    example: '2024-08-28T08:30:00.000Z',
  })
  expiresAt: Date;
}
