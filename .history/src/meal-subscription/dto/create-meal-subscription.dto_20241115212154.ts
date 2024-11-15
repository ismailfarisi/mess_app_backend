import { IsUUID, IsEnum, IsDateString } from 'class-validator';
import { MealType } from '../../commons/enums/meal-type.enum';

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
