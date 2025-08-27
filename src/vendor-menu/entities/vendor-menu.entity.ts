import { MealType } from '../../commons/enums/meal-type.enum';
import { VendorMenuStatus } from '../../commons/enums/vendor-menu-status.enum';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Transform } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
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
    default: VendorMenuStatus.ACTIVE,
  })
  status: VendorMenuStatus;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @Transform(({ value }) => parseFloat(value), { toPlainOnly: true })
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

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
