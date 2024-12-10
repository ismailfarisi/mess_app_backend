import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MealType } from 'src/commons/enums/meal-type.enum';

export class QueryVendorDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  radius?: number;

  @IsOptional()
  @IsEnum(MealType)
  @Type(() => String)
  mealType?: MealType;

  @IsOptional()
  @IsString()
  cuisineType?: string;

  @IsOptional()
  @IsString()
  foodType?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOpen?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minRating?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: 'rating' | 'distance' | 'deliveryTime' = 'distance';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
