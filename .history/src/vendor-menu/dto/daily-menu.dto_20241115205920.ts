import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class DailyMenuDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  items: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sideDishes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extras?: string[];
}
