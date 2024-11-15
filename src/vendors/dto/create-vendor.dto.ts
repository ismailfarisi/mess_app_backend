import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsObject,
} from 'class-validator';

export class CreateVendorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  serviceRadius: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  profilePhotoUrl?: string;

  @IsString()
  @IsOptional()
  coverPhotoUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cuisineTypes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  foodTypes?: string[];

  @IsObject()
  @IsOptional()
  businessHours?: {
    [key: string]: {
      open: string;
      close: string;
    };
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  acceptedPaymentMethods?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumOrderAmount?: number;
}
