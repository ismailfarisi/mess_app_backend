import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  IsEnum,
  IsDecimal,
  IsDateString,
  IsOptional,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { MealSubscription } from './meal-subscription.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { MealType } from '../../commons/enums/meal-type.enum';

@Entity('monthly_subscriptions')
@Index(['userId', 'mealType', 'startDate'])
@Index(['status'])
export class MonthlySubscription {
  @ApiProperty({
    description: 'Unique identifier for the monthly subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User ID who created the subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column('uuid')
  @IsUUID()
  @Index()
  userId: string;

  @ApiProperty({
    description: 'Array of vendor IDs (max 4 vendors)',
    example: ['vendor-uuid-1', 'vendor-uuid-2'],
    type: [String],
  })
  @Column('jsonb', { name: 'vendor_ids' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsUUID(4, { each: true })
  vendorIds: string[];

  @ApiProperty({
    description: 'Array of individual meal subscription IDs',
    example: ['sub-uuid-1', 'sub-uuid-2'],
    type: [String],
  })
  @Column('jsonb', { name: 'individual_subscription_ids' })
  @IsArray()
  @IsUUID(4, { each: true })
  individualSubscriptionIds: string[];

  @ApiProperty({
    description: 'Type of meal for the subscription',
    enum: MealType,
    example: MealType.LUNCH,
  })
  @Column({
    type: 'enum',
    enum: MealType,
  })
  @IsEnum(MealType)
  @Index()
  mealType: MealType;

  @ApiProperty({
    description: 'Total price for the monthly subscription',
    example: '299.99',
    type: 'number',
  })
  @Column('decimal', { precision: 10, scale: 2, name: 'total_price' })
  @IsDecimal({ decimal_digits: '2' })
  totalPrice: number;

  @ApiProperty({
    description: 'Start date of the subscription',
    example: '2024-01-01',
  })
  @Column('date', { name: 'start_date' })
  @IsDateString()
  @Index()
  startDate: Date;

  @ApiProperty({
    description: 'End date of the subscription',
    example: '2024-01-31',
  })
  @Column('date', { name: 'end_date' })
  @IsDateString()
  endDate: Date;

  @ApiProperty({
    description: 'Current status of the subscription',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  @IsEnum(SubscriptionStatus)
  @Index()
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Delivery address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column('uuid', { name: 'address_id' })
  @IsUUID()
  addressId: string;

  @ApiProperty({
    description: 'Payment ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Column('uuid', { nullable: true, name: 'payment_id' })
  @IsUUID()
  @IsOptional()
  paymentId?: string;

  @ApiProperty({
    description: 'Timestamp when the subscription was created',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the subscription was last updated',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => MealSubscription, (mealSub) => mealSub.monthlySubscription, {
    cascade: true,
  })
  individualSubscriptions: MealSubscription[];
}
