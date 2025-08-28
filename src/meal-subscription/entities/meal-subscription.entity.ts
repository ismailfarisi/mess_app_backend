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
import { MonthlySubscription } from './monthly-subscription.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { MealType } from '../../commons/enums/meal-type.enum';
import { Vendor } from 'src/vendors/entities/vendor.entity';

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

  @Column('uuid', { nullable: true, name: 'monthly_subscription_id' })
  monthlySubscriptionId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => VendorMenu)
  @JoinColumn({ name: 'menuId' })
  menu: VendorMenu;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @ManyToOne(
    () => MonthlySubscription,
    (monthlySubscription) => monthlySubscription.individualSubscriptions,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'monthly_subscription_id' })
  monthlySubscription?: MonthlySubscription;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
