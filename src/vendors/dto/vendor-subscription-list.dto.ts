import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';

export enum SubscriptionFilterStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SCHEDULED = 'scheduled',
}

export class QueryVendorSubscriptionsDto {
  @ApiProperty({
    description: 'Filter by subscription status',
    enum: SubscriptionFilterStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(SubscriptionFilterStatus)
  status?: SubscriptionFilterStatus;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    required: false,
  })
  @IsOptional()
  limit?: number = 10;
}

export class VendorSubscriptionItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  customerEmail: string;

  @ApiProperty()
  customerPhone: string;

  @ApiProperty()
  mealType: string;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  deliveryAddress: string;

  @ApiProperty()
  createdAt: Date;
}

export class VendorSubscriptionListResponseDto {
  @ApiProperty({ type: [VendorSubscriptionItemDto] })
  data: VendorSubscriptionItemDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class VendorCapacityDto {
  @ApiProperty({
    description: 'Current number of active subscriptions',
    example: 35,
  })
  currentSubscriptions: number;

  @ApiProperty({
    description: 'Maximum monthly capacity',
    example: 50,
  })
  monthlyCapacity: number;

  @ApiProperty({
    description: 'Available subscription slots',
    example: 15,
  })
  availableSlots: number;

  @ApiProperty({
    description: 'Capacity utilization percentage',
    example: 70,
  })
  utilizationPercentage: number;
}
