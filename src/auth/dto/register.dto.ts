// src/auth/dto/register.dto.ts

import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  IsPhoneNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value.trim())
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Password for the account (minimum 6 characters)',
    minimum: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}
