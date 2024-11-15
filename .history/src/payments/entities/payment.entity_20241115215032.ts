import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MealSubscription } from '../../meal-subscription/entities/meal-subscription.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  subscriptionId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column('jsonb', { nullable: true })
  paymentDetails: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => MealSubscription)
  @JoinColumn({ name: 'subscriptionId' })
  subscription: MealSubscription;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  paidAt: Date;
}
