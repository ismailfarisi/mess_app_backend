import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../../commons/enums/meal-type.enum';
import { IsValidVendorSelection } from './validators/vendor-selection.validator';
import { IsFutureDate } from './validators/date.validator';

export class CreateMonthlySubscriptionDto {
  @ApiProperty({
    description:
      'Array of vendor IDs for the monthly subscription (1-4 vendors)',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
    minItems: 1,
    maxItems: 4,
  })
  @IsNotEmpty({ message: 'Vendor IDs are required' })
  @IsArray({ message: 'Vendor IDs must be an array' })
  @IsValidVendorSelection()
  @IsUUID('4', { each: true, message: 'Each vendor ID must be a valid UUID' })
  vendorIds: string[];

  @ApiProperty({
    description: 'Type of meal for the subscription',
    enum: MealType,
    example: MealType.LUNCH,
  })
  @IsNotEmpty({ message: 'Meal type is required' })
  @IsEnum(MealType, { message: 'Invalid meal type' })
  mealType: MealType;

  @ApiProperty({
    description: 'Start date for the monthly subscription (ISO 8601 format)',
    type: String,
    format: 'date',
    example: '2024-09-01',
  })
  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date' })
  @IsFutureDate({ message: 'Start date must be today or a future date' })
  startDate: string;

  @ApiProperty({
    description: 'UUID of the delivery address',
    type: String,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsNotEmpty({ message: 'Address ID is required' })
  @IsUUID('4', { message: 'Address ID must be a valid UUID' })
  addressId: string;

  @ApiProperty({
    description: 'UUID of the payment method',
    type: String,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  @IsNotEmpty({ message: 'Payment method ID is required' })
  @IsUUID('4', { message: 'Payment method ID must be a valid UUID' })
  paymentMethodId: string;
}
