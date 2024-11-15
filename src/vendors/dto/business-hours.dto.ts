import { ApiProperty } from '@nestjs/swagger';
import { IsObject, ValidateNested } from 'class-validator';

export class BusinessHoursDto {
  @ApiProperty({
    example: {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
    },
  })
  @IsObject()
  @ValidateNested()
  businessHours: {
    [key: string]: {
      open: string;
      close: string;
    };
  };
}
