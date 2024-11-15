import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsDate,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MealType } from 'src/commons/enums/meal-type.enum';

export class QueryVendorMenuDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
