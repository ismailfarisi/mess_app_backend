import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserAddressDto } from './create-user-address.dto';

export class UpdateUserAddressDto extends PartialType(
  OmitType(CreateUserAddressDto, [] as const),
) {}
