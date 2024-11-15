import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateVendorMenuDto } from './create-vendor-menu.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateVendorMenuDto extends PartialType(
  OmitType(CreateVendorMenuDto, ['vendorId', 'mealType'] as const),
) {
  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
