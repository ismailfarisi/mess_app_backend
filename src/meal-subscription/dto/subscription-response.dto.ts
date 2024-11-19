// meal-subscription/dto/subscription-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../../commons/enums/meal-type.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  mealType: MealType;

  @ApiProperty()
  status: SubscriptionStatus;

  @ApiProperty()
  price: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  vendorName: string;

  @ApiProperty()
  vendorBusinessName: string;

  @ApiProperty()
  vendorAddress: string;

  @ApiProperty()
  vendorRating: number;

  @ApiProperty()
  menuDescription: string;

  @ApiProperty({ type: [String] })
  currentDayMenu: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SubscriptionsResponseDto {
  @ApiProperty({ type: [SubscriptionResponseDto] })
  data: SubscriptionResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      total: { type: 'number' },
      pages: { type: 'number' },
      currentPage: { type: 'number' },
      perPage: { type: 'number' },
    },
  })
  meta: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
}
