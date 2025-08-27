import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { MealType } from '../../commons/enums/meal-type.enum';
import { VendorMenuStatus } from '../../commons/enums/vendor-menu-status.enum';
import { VendorResponseDto } from '../../vendors/dto/vendor-response.dto';

export class VendorMenuResponseDto {
  @ApiProperty({ example: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'uuid' })
  @Expose()
  vendorId: string;

  @ApiProperty({ enum: MealType, example: MealType.LUNCH })
  @Expose()
  mealType: MealType;

  @ApiProperty({ enum: VendorMenuStatus, example: VendorMenuStatus.ACTIVE })
  @Expose()
  status: VendorMenuStatus;

  @ApiProperty({
    example: 'Delicious weekly lunch menu with variety of dishes',
  })
  @Expose()
  description: string;

  @ApiProperty({ example: 25.5, type: 'number' })
  @Expose()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  price: number;

  @ApiProperty({
    example: {
      monday: {
        items: ['Grilled Chicken', 'Basmati Rice'],
        sideDishes: ['Mixed Salad', 'Hummus'],
        extras: ['Garlic Bread', 'Soft Drink'],
      },
      tuesday: {
        items: ['Beef Biryani', 'Raita'],
        sideDishes: ['Cucumber Salad', 'Pickles'],
        extras: ['Papadum', 'Lassi'],
      },
      // ... other days
    },
  })
  @Expose()
  weeklyMenu: {
    monday: {
      items: string[];
      sideDishes?: string[];
      extras?: string[];
    };
    tuesday: {
      items: string[];
      sideDishes?: string[];
      extras?: string[];
    };
    wednesday: {
      items: string[];
      sideDishes?: string[];
      extras?: string[];
    };
    thursday: {
      items: string[];
      sideDishes?: string[];
      extras?: string[];
    };
    friday: {
      items: string[];
      sideDishes?: string[];
      extras?: string[];
    };
    saturday: {
      items: string[];
      sideDishes?: string[];
      extras?: string[];
    };
    sunday: {
      items: string[];
      sideDishes?: string[];
      extras?: string[];
    };
  };

  @ApiProperty({ type: VendorResponseDto })
  @Expose()
  @Type(() => VendorResponseDto)
  vendor?: VendorResponseDto;

  @ApiProperty({ example: true })
  @Expose()
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Expose()
  updatedAt: Date;
}
