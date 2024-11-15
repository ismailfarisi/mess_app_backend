import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
