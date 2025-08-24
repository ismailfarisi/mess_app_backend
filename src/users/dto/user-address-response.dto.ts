import { ApiProperty } from '@nestjs/swagger';
import { Point } from 'geojson';

export class UserAddressResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Home' })
  label: string;

  @ApiProperty({ example: '123 Main Street' })
  addressLine1: string;

  @ApiProperty({ example: 'Apt 4B', required: false })
  addressLine2?: string;

  @ApiProperty({ example: 'Dubai' })
  city: string;

  @ApiProperty({ example: 'Dubai' })
  state: string;

  @ApiProperty({ example: 'UAE' })
  country: string;

  @ApiProperty({ example: '12345', required: false })
  postalCode?: string;

  @ApiProperty({ example: 25.2048 })
  latitude: number;

  @ApiProperty({ example: 55.2708 })
  longitude: number;

  @ApiProperty({
    example: {
      type: 'Point',
      coordinates: [55.2708, 25.2048]
    }
  })
  location: Point;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}