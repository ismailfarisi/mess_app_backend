import { PartialType } from '@nestjs/mapped-types';
import { CreateVendorMenuDto } from './create-vendor-menu.dto';

export class UpdateVendorMenuDto extends PartialType(CreateVendorMenuDto) {}
