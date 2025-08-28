import {
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsDateString,
  IsUUID,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MealType } from '../../commons/enums/meal-type.enum';
import { IsValidVendorSelection } from './validators/vendor-selection.validator';
import { IsFutureDate } from './validators/date.validator';

class UserLocationDto {
  @ApiProperty({
    description: 'Latitude of the user location',
    type: Number,
    example: 25.276987,
  })
  @IsNotEmpty({ message: 'Latitude is required' })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the user location',
    type: Number,
    example: 55.296249,
  })
  @IsNotEmpty({ message: 'Longitude is required' })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude: number;
}

export class ValidateMonthlySelectionDto {
  @ApiProperty({
    description: 'Array of vendor IDs for validation (1-4 vendors)',
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
    description: 'User location for delivery validation',
    type: UserLocationDto,
  })
  @IsNotEmpty({ message: 'User location is required' })
  @ValidateNested()
  @Type(() => UserLocationDto)
  userLocation: UserLocationDto;
}
