import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAddressDto {
  @ApiProperty({ example: 'Home', description: 'Address label (Home, Work, etc.)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value.trim())
  label: string;

  @ApiProperty({ example: '123 Main Street', description: 'Primary address line' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @Transform(({ value }) => value.trim())
  addressLine1: string;

  @ApiProperty({ 
    example: 'Apt 4B', 
    description: 'Secondary address line (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  addressLine2?: string;

  @ApiProperty({ example: 'Dubai', description: 'City name' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  city: string;

  @ApiProperty({ example: 'Dubai', description: 'State/Province name' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  state: string;

  @ApiProperty({ example: 'UAE', description: 'Country name' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  country: string;

  @ApiProperty({ 
    example: '12345', 
    description: 'Postal/ZIP code (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'Invalid postal code format' })
  postalCode?: string;

  @ApiProperty({ example: 25.2048, description: 'Latitude coordinate' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 55.2708, description: 'Longitude coordinate' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ 
    example: true, 
    description: 'Set as default address (optional)',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}