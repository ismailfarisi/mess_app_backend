import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer';
import { MealType } from 'src/commons/enums/meal-type.enum';

export class DailyMenuDto {
  @ApiProperty({ type: [String] })
  items: string[];

  @ApiProperty({ type: [String], required: false })
  sideDishes?: string[];

  @ApiProperty({ type: [String], required: false })
  extras?: string[];
}

export class WeeklyMenuDto {
  @ApiProperty({ type: DailyMenuDto })
  monday: DailyMenuDto;

  @ApiProperty({ type: DailyMenuDto })
  tuesday: DailyMenuDto;

  @ApiProperty({ type: DailyMenuDto })
  wednesday: DailyMenuDto;

  @ApiProperty({ type: DailyMenuDto })
  thursday: DailyMenuDto;

  @ApiProperty({ type: DailyMenuDto })
  friday: DailyMenuDto;

  @ApiProperty({ type: DailyMenuDto })
  saturday: DailyMenuDto;

  @ApiProperty({ type: DailyMenuDto })
  sunday: DailyMenuDto;
}

export class VendorMenuDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  vendorId: string;

  @ApiProperty({ enum: MealType })
  mealType: MealType;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: WeeklyMenuDto })
  weeklyMenu: WeeklyMenuDto;
}

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
  email: string;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  totalRatings: number;

  @ApiProperty({ required: false })
  profilePhotoUrl?: string;

  @ApiProperty({ required: false })
  coverPhotoUrl?: string;

  @ApiProperty({ type: [String] })
  cuisineTypes: string[];

  @ApiProperty({ type: [String] })
  foodTypes: string[];

  @ApiProperty()
  isOpen: boolean;

  @ApiProperty({ required: false })
  closureMessage?: string;

  @ApiProperty({ required: false })
  distance?: number; // Distance from user in km

  @ApiProperty()
  minimumOrderAmount?: number;

  @ApiProperty({ type: [String] })
  acceptedPaymentMethods: string[];

  @ApiProperty({
    type: 'object',
    properties: {
      type: { type: 'string' },
      coordinates: { type: 'array', items: { type: 'number' } }
    }
  })
  location: {
    type: string;
    coordinates: number[];
  };

  @ApiProperty({ type: [VendorMenuDto] })
  @Type(() => VendorMenuDto)
  menus?: VendorMenuDto[];

 
}

export class VendorsListResponseDto {
  @ApiProperty({ type: [VendorResponseDto] })
  data: VendorResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      total: { type: 'number' },
      pages: { type: 'number' },
      currentPage: { type: 'number' },
      perPage: { type: 'number' }
    }
  })
  meta: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
}