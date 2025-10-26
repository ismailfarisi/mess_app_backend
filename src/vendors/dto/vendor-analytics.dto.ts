import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class VendorAnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date for analytics period',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for analytics period',
    example: '2025-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Grouping interval (day, week, month)',
    example: 'day',
    required: false,
    enum: ['day', 'week', 'month'],
  })
  @IsOptional()
  groupBy?: 'day' | 'week' | 'month' = 'day';
}

export class RevenueDataPointDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  orderCount: number;
}

export class VendorRevenueAnalyticsDto {
  @ApiProperty({ type: [RevenueDataPointDto] })
  data: RevenueDataPointDto[];

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  averageOrderValue: number;

  @ApiProperty()
  period: {
    startDate: string;
    endDate: string;
  };
}

export class PopularMealDto {
  @ApiProperty()
  mealType: string;

  @ApiProperty()
  orderCount: number;

  @ApiProperty()
  percentage: number;
}

export class VendorOrderAnalyticsDto {
  @ApiProperty()
  totalOrders: number;

  @ApiProperty({ type: [PopularMealDto] })
  ordersByMealType: PopularMealDto[];

  @ApiProperty()
  averageOrdersPerDay: number;

  @ApiProperty()
  peakOrderDay: string;

  @ApiProperty()
  period: {
    startDate: string;
    endDate: string;
  };
}

export class CustomerAnalyticsDto {
  @ApiProperty()
  totalCustomers: number;

  @ApiProperty()
  newCustomers: number;

  @ApiProperty()
  returningCustomers: number;

  @ApiProperty()
  averageSubscriptionDuration: number;

  @ApiProperty()
  period: {
    startDate: string;
    endDate: string;
  };
}

export class PerformanceMetricsDto {
  @ApiProperty()
  onTimeDeliveryRate: number;

  @ApiProperty()
  orderFulfillmentRate: number;

  @ApiProperty()
  customerSatisfactionScore: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalRatings: number;

  @ApiProperty()
  period: {
    startDate: string;
    endDate: string;
  };
}
