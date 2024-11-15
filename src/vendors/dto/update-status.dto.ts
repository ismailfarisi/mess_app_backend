import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({ example: 'Closed for renovation' })
  @IsString()
  @IsOptional()
  closureMessage?: string;
}
