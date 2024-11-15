import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class WeeklyMenuDto {
  @ValidateNested()
  @Type(() => DailyMenuDto)
  monday: DailyMenuDto;

  @ValidateNested()
  @Type(() => DailyMenuDto)
  tuesday: DailyMenuDto;

  @ValidateNested()
  @Type(() => DailyMenuDto)
  wednesday: DailyMenuDto;

  @ValidateNested()
  @Type(() => DailyMenuDto)
  thursday: DailyMenuDto;

  @ValidateNested()
  @Type(() => DailyMenuDto)
  friday: DailyMenuDto;

  @ValidateNested()
  @Type(() => DailyMenuDto)
  saturday: DailyMenuDto;

  @ValidateNested()
  @Type(() => DailyMenuDto)
  sunday: DailyMenuDto;
}
