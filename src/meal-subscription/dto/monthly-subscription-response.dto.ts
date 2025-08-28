import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../../commons/enums/meal-type.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

class DeliveryScheduleDto {
  @ApiProperty({
    description: 'Vendor ID for this delivery day',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  vendorId: string;

  @ApiProperty({
    description: 'Vendor name',
    example: 'Tasty Bites Restaurant',
  })
  vendorName: string;

  @ApiProperty({
    description: 'Day of the week (1 = Monday, 7 = Sunday)',
    example: 1,
    minimum: 1,
    maximum: 7,
  })
  dayOfWeek: number;

  @ApiProperty({
    description: 'Day name',
    example: 'Monday',
  })
  dayName: string;

  @ApiProperty({
    description: 'Estimated delivery time',
    example: '12:30-13:00',
  })
  estimatedDeliveryTime: string;
}

class PaymentSummaryDto {
  @ApiProperty({
    description: 'Total monthly cost',
    example: 450.0,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Cost per vendor per day',
    example: 15.0,
  })
  costPerVendorPerDay: number;

  @ApiProperty({
    description: 'Total delivery days in the month',
    example: 30,
  })
  totalDeliveryDays: number;

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
    description: 'Taxes',
    example: 22.5,
  })
  taxes: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'AED',
  })
  currency: string;
}

class VendorSelectionDto {
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

  @ApiProperty({
    description: 'Average rating',
    example: 4.5,
  })
  rating: number;

  @ApiProperty({
    description: 'Cuisine type',
    example: 'Mediterranean',
  })
  cuisine: string;

  @ApiProperty({
    description: 'Days of the week this vendor will deliver',
    type: [Number],
    example: [1, 3, 5],
  })
  deliveryDays: number[];
}

export class MonthlySubscriptionResponseDto {
  @ApiProperty({
    description: 'Monthly subscription ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Selected vendors for the subscription',
    type: [VendorSelectionDto],
  })
  vendors: VendorSelectionDto[];

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
    description: 'Delivery address information',
    type: Object,
    example: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      address: '123 Main St, Dubai, UAE',
      coordinates: { latitude: 25.276987, longitude: 55.296249 },
    },
  })
  deliveryAddress: {
    id: string;
    address: string;
    coordinates: { latitude: number; longitude: number };
  };

  @ApiProperty({
    description: 'Delivery schedule for the month',
    type: [DeliveryScheduleDto],
  })
  deliverySchedule: DeliveryScheduleDto[];

  @ApiProperty({
    description: 'Payment summary and breakdown',
    type: PaymentSummaryDto,
  })
  paymentSummary: PaymentSummaryDto;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-08-28T08:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-08-28T08:00:00.000Z',
  })
  updatedAt: Date;
}
