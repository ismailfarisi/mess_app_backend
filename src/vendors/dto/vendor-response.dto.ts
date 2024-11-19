import { ApiProperty } from '@nestjs/swagger';

export class VendorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  totalRatings: number;

  @ApiProperty()
  profilePhotoUrl: string;

  @ApiProperty()
  coverPhotoUrl: string;

  @ApiProperty()
  cuisineTypes: string[];

  @ApiProperty()
  foodTypes: string[];

  @ApiProperty()
  isOpen: boolean;

  @ApiProperty()
  closureMessage?: string;

  @ApiProperty()
  distance?: number; // Distance from user in km

  @ApiProperty()
  deliveryTime: number;

  @ApiProperty()
  acceptedPaymentMethods: string[];

  @ApiProperty()
  location: {
    type: string;
    coordinates: number[];
  };
}
