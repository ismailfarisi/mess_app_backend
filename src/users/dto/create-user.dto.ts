// create-user.dto.ts
import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value.trim())
  name: string;

  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}