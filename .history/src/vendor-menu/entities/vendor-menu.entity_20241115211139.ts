import { MealType } from 'src/commons/enums/meal-type.enum';
import { VendorMenuStatus } from 'src/commons/enums/vendor-menu-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vendor_menus')
export class VendorMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  vendorId: string;

  @Column({
    type: 'enum',
    enum: MealType,
  })
  mealType: MealType;

  @Column({
    type: 'enum',
    enum: VendorMenuStatus,
  })
  status: VendorMenuStatus;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('jsonb')
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

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
