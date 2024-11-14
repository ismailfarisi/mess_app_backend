import { IsEmail, IsNotEmpty } from 'class-validator';

export class VendorLoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
