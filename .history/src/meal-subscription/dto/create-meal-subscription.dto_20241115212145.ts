import { IsUUID, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { MealType } from '../../common/enums/meal-type.enum';

export class CreateSubscriptionDto {
  @IsUUID()
  vendorId: string;

  @IsUUID()
  menuId: string;

  @IsEnum(MealType)
  mealType: MealType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
