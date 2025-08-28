import {
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../../commons/enums/meal-type.enum';

export class MonthlyPreviewQueryDto {
  @ApiProperty({
    description: 'Comma-separated list of vendor IDs (1-4 vendors)',
    type: String,
    example:
      '550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440002',
    pattern:
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(,[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}){0,3}$',
  })
  @IsNotEmpty({ message: 'Vendor IDs are required' })
  @IsString({ message: 'Vendor IDs must be a string' })
  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(,[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}){0,3}$/i,
    {
      message:
        'Invalid vendor IDs format. Must be comma-separated UUIDs (1-4 vendors)',
    },
  )
  vendorIds: string;

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
  startDate: string;
}
