import { Type } from 'class-transformer';
import {
  IsUUID,
  IsEnum,
  IsString,
  MinLength,
  IsNumber,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { WeeklyMenuDto } from './weekly-menu.dto';
import { MealType } from 'src/commons/enums/meal-type.enum';

export class CreateVendorMenuDto {
  @IsUUID()
  vendorId: string;

  @IsEnum(MealType)
  mealType: MealType;

  @IsString()
  @MinLength(10)
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsObject()
  @ValidateNested()
  @Type(() => WeeklyMenuDto)
  weeklyMenu: WeeklyMenuDto;
}
