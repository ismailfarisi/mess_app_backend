// src/vendors/entities/vendor.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Point } from 'geojson';
import { VendorMenu } from '../../vendor-menu/entities/vendor-menu.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('vendors')
export class Vendor {
  @ApiProperty({ example: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'The Healthy Kitchen' })
  @Column()
  businessName: string;

  @ApiProperty({ example: '123 Main St, City' })
  @Column()
  address: string;

  @ApiProperty({ example: 4.5 })
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  rating: number;

  @ApiProperty({ example: 100 })
  @Column('integer', { default: 0 })
  totalRatings: number;

  @ApiProperty({ example: 'https://example.com/photo.jpg' })
  @Column({ nullable: true })
  profilePhotoUrl: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg' })
  @Column({ nullable: true })
  coverPhotoUrl: string;

  @ApiProperty({ example: ['North Indian', 'South Indian'] })
  @Column('text', { array: true, default: '{}' })
  cuisineTypes: string[];

  @ApiProperty({ example: ['Veg', 'Non-Veg'] })
  @Column('text', { array: true, default: '{}' })
  foodTypes: string[];

  @ApiProperty({
    example: {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
    },
  })
  @Column('jsonb', { nullable: true })
  businessHours: {
    [key: string]: {
      open: string;
      close: string;
    };
  };

  @ApiProperty({ example: true })
  @Column('boolean', { default: true })
  isOpen: boolean;

  @ApiProperty({ example: 'Closed for renovation' })
  @Column({ nullable: true })
  closureMessage?: string;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  @ApiProperty({ example: 5 })
  @Column('decimal', { precision: 10, scale: 2 })
  serviceRadius: number;

  @ApiProperty({ example: 'Specializing in healthy home-cooked meals' })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ example: ['upi', 'card', 'cash'] })
  @Column('text', { array: true, default: '{}' })
  acceptedPaymentMethods: string[];

  @ApiProperty({ example: 100 })
  @Column('integer', { default: 0 })
  totalOrders: number;

  @ApiProperty({ example: 4.8 })
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  deliveryRating: number;

  @ApiProperty({ example: 30 })
  @Column('integer', { default: 30 })
  averageDeliveryTime: number;

  @ApiProperty({ example: 200 })
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  minimumOrderAmount: number;

  @OneToMany(() => VendorMenu, (menu) => menu.vendor)
  menus: VendorMenu[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}