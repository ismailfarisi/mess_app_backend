import { ApiProperty } from '@nestjs/swagger';

class VendorValidationDto {
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
    description: 'Whether this vendor is available for the requested meal type',
    example: true,
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'Whether this vendor can deliver to the specified location',
    example: true,
  })
  canDeliver: boolean;

  @ApiProperty({
    description:
      'Whether this vendor has capacity for new monthly subscriptions',
    example: true,
  })
  hasCapacity: boolean;

  @ApiProperty({
    description: 'Distance from user location in kilometers',
    example: 2.5,
  })
  distance: number;

  @ApiProperty({
    description: 'List of validation issues if any',
    type: [String],
    example: [],
  })
  issues: string[];
}

class DeliveryValidationDto {
  @ApiProperty({
    description: 'Whether delivery is possible to the specified location',
    example: true,
  })
  canDeliver: boolean;

  @ApiProperty({
    description: 'Estimated delivery time in minutes',
    example: 30,
  })
  estimatedDeliveryTime: number;

  @ApiProperty({
    description: 'Delivery fee for the location',
    example: 5.0,
  })
  deliveryFee: number;

  @ApiProperty({
    description: 'Any delivery-related issues',
    type: [String],
    example: [],
  })
  issues: string[];
}

class ScheduleValidationDto {
  @ApiProperty({
    description: 'Whether the start date is valid for monthly subscription',
    example: true,
  })
  isValidStartDate: boolean;

  @ApiProperty({
    description: 'Suggested start date if the provided date is invalid',
    example: '2024-09-01',
    nullable: true,
  })
  suggestedStartDate?: string;

  @ApiProperty({
    description: 'Number of delivery days in the month',
    example: 30,
  })
  deliveryDaysCount: number;

  @ApiProperty({
    description: 'Any schedule-related issues',
    type: [String],
    example: [],
  })
  issues: string[];
}

export class ValidationResultDto {
  @ApiProperty({
    description: 'Overall validation result',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Validation results for each selected vendor',
    type: [VendorValidationDto],
  })
  vendors: VendorValidationDto[];

  @ApiProperty({
    description: 'Delivery validation results',
    type: DeliveryValidationDto,
  })
  delivery: DeliveryValidationDto;

  @ApiProperty({
    description: 'Schedule validation results',
    type: ScheduleValidationDto,
  })
  schedule: ScheduleValidationDto;

  @ApiProperty({
    description: 'Overall validation errors if any',
    type: [String],
    example: [],
  })
  errors: string[];

  @ApiProperty({
    description: "Warning messages that don't prevent subscription creation",
    type: [String],
    example: ['Vendor "Mediterranean Delights" has limited capacity'],
  })
  warnings: string[];

  @ApiProperty({
    description: 'Validation timestamp',
    example: '2024-08-28T08:00:00.000Z',
  })
  validatedAt: Date;
}
