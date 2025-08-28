import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../../commons/enums/meal-type.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

class VendorSummaryDto {
  @ApiProperty({
    description: 'Vendor ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor name',
    example: 'Tasty Bites Restaurant',
  })
  name: string;

  @ApiProperty({
    description: 'Vendor logo URL',
    example: 'https://example.com/vendor-logo.jpg',
    nullable: true,
  })
  logo?: string;
}

export class MonthlySubscriptionSummaryDto {
  @ApiProperty({
    description: 'Monthly subscription ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Type of meal',
    enum: MealType,
    example: MealType.LUNCH,
  })
  mealType: MealType;

  @ApiProperty({
    description: 'Subscription start date',
    example: '2024-09-01T00:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Subscription end date',
    example: '2024-09-30T23:59:59.999Z',
  })
  endDate: Date;

  @ApiProperty({
    description: 'Current status of the subscription',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Summary of selected vendors',
    type: [VendorSummaryDto],
  })
  vendors: VendorSummaryDto[];

  @ApiProperty({
    description: 'Total monthly cost',
    example: 420.0,
  })
  totalCost: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'AED',
  })
  currency: string;

  @ApiProperty({
    description: 'Number of delivery days completed',
    example: 15,
  })
  completedDeliveries: number;

  @ApiProperty({
    description: 'Total delivery days in the month',
    example: 30,
  })
  totalDeliveries: number;

  @ApiProperty({
    description: 'Next delivery date',
    example: '2024-09-16T12:00:00.000Z',
    nullable: true,
  })
  nextDelivery?: Date;

  @ApiProperty({
    description: 'Delivery address summary',
    example: '123 Main St, Dubai, UAE',
  })
  deliveryAddress: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-08-28T08:00:00.000Z',
  })
  createdAt: Date;
}
