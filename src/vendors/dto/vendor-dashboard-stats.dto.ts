import { ApiProperty } from '@nestjs/swagger';

export class VendorDashboardStatsDto {
  @ApiProperty({
    description: 'Total orders (lifetime)',
    example: 1250,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Orders this week',
    example: 45,
  })
  ordersThisWeek: number;

  @ApiProperty({
    description: 'Orders this month',
    example: 180,
  })
  ordersThisMonth: number;

  @ApiProperty({
    description: 'Revenue this week (AED)',
    example: 8100,
  })
  revenueThisWeek: number;

  @ApiProperty({
    description: 'Revenue this month (AED)',
    example: 32400,
  })
  revenueThisMonth: number;

  @ApiProperty({
    description: 'Total revenue (lifetime)',
    example: 225000,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Average rating',
    example: 4.5,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Delivery rating',
    example: 4.8,
  })
  deliveryRating: number;

  @ApiProperty({
    description: 'Active subscriptions count',
    example: 35,
  })
  activeSubscriptions: number;

  @ApiProperty({
    description: 'Pending orders count',
    example: 12,
  })
  pendingOrders: number;

  @ApiProperty({
    description: 'Today\'s orders count',
    example: 8,
  })
  todaysOrders: number;

  @ApiProperty({
    description: 'Monthly capacity',
    example: 50,
  })
  monthlyCapacity: number;

  @ApiProperty({
    description: 'Available slots',
    example: 15,
  })
  availableSlots: number;

  @ApiProperty({
    description: 'On-time delivery percentage',
    example: 95.5,
  })
  onTimeDeliveryRate: number;
}
