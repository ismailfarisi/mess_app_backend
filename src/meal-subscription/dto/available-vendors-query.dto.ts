import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { MealType } from '../../commons/enums/meal-type.enum';

export class AvailableVendorsQueryDto {
  @ApiProperty({
    description: 'Latitude of the user location',
    type: Number,
    example: 25.276987,
    minimum: -90,
    maximum: 90,
  })
  @IsNotEmpty({ message: 'Latitude is required' })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the user location',
    type: Number,
    example: 55.296249,
    minimum: -180,
    maximum: 180,
  })
  @IsNotEmpty({ message: 'Longitude is required' })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @ApiProperty({
    description: 'Type of meal to filter vendors by',
    enum: MealType,
    example: MealType.LUNCH,
  })
  @IsNotEmpty({ message: 'Meal type is required' })
  @IsEnum(MealType, { message: 'Invalid meal type' })
  mealType: MealType;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers (default: 10km)',
    type: Number,
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Radius must be a number' })
  @Min(1, { message: 'Radius must be at least 1km' })
  @Max(50, { message: 'Radius cannot exceed 50km' })
  @Transform(({ value }) => (value ? parseFloat(value) : 10))
  radius?: number = 10;

  @ApiPropertyOptional({
    description: 'Page number for pagination (default: 1)',
    type: Number,
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (default: 20, max: 100)',
    type: Number,
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  limit?: number = 20;
}
