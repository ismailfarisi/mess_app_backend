import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VendorMenu } from '../../vendor-menu/entities/vendor-menu.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { MealType } from '../../commons/enums/meal-type.enum';

@Entity('meal_subscriptions')
export class MealSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  vendorId: string;

  @Column('uuid')
  menuId: string;

  @Column({
    type: 'enum',
    enum: MealType,
  })
  mealType: MealType;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => VendorMenu)
  @JoinColumn({ name: 'menuId' })
  menu: VendorMenu;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
