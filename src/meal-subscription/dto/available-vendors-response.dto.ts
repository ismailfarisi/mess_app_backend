import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../../commons/enums/meal-type.enum';

class BusinessHoursDto {
  @ApiProperty({
    description: 'Day of the week (0 = Sunday, 6 = Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  day: number;

  @ApiProperty({
    description: 'Opening time in HH:MM format',
    example: '09:00',
  })
  openTime: string;

  @ApiProperty({
    description: 'Closing time in HH:MM format',
    example: '22:00',
  })
  closeTime: string;

  @ApiProperty({
    description: 'Whether the vendor is closed on this day',
    example: false,
  })
  isClosed: boolean;
}

export class VendorForMonthlyDto {
  @ApiProperty({
    description: 'Vendor ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor name',
    example: 'Tasty Bites Restaurant',
  })
  name: string;

  @ApiProperty({
    description: 'Vendor description',
    example: 'Authentic Mediterranean cuisine with fresh ingredients',
  })
  description: string;

  @ApiProperty({
    description: 'Vendor logo URL',
    example: 'https://example.com/vendor-logo.jpg',
    nullable: true,
  })
  logo?: string;

  @ApiProperty({
    description: 'Primary cuisine type',
    example: 'Mediterranean',
  })
  cuisine: string;

  @ApiProperty({
    description: 'Average rating from customers',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    description: 'Total number of reviews',
    example: 127,
  })
  reviewCount: number;

  @ApiProperty({
    description: 'Distance from user location in kilometers',
    example: 2.5,
  })
  distance: number;

  @ApiProperty({
    description: 'Average price per meal',
    example: 15.0,
  })
  averagePrice: number;

  @ApiProperty({
    description: 'Estimated delivery time in minutes',
    example: 30,
  })
  deliveryTime: number;

  @ApiProperty({
    description: 'Meal types supported by this vendor',
    enum: MealType,
    isArray: true,
    example: [MealType.LUNCH, MealType.DINNER],
  })
  supportedMealTypes: MealType[];

  @ApiProperty({
    description:
      'Whether vendor is currently available for new monthly subscriptions',
    example: true,
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'Maximum monthly subscriptions this vendor can handle',
    example: 100,
  })
  monthlyCapacity: number;

  @ApiProperty({
    description: 'Current number of monthly subscriptions',
    example: 45,
  })
  currentSubscriptions: number;

  @ApiProperty({
    description: 'Business hours for the week',
    type: [BusinessHoursDto],
  })
  businessHours: BusinessHoursDto[];

  @ApiProperty({
    description: 'Vendor address',
    example: '456 Business District, Dubai, UAE',
  })
  address: string;

  @ApiProperty({
    description: 'Vendor coordinates',
    example: { latitude: 25.276987, longitude: 55.296249 },
  })
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevPage: boolean;
}

export class AvailableVendorsResponseDto {
  @ApiProperty({
    description: 'List of available vendors for monthly subscription',
    type: [VendorForMonthlyDto],
  })
  vendors: VendorForMonthlyDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  @ApiProperty({
    description: 'Search parameters used',
    example: {
      location: { latitude: 25.276987, longitude: 55.296249 },
      mealType: 'LUNCH',
      radius: 10,
    },
  })
  searchParams: {
    location: { latitude: number; longitude: number };
    mealType: MealType;
    radius: number;
  };
}
