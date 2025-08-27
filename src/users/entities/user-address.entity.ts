import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Point } from 'geojson';
import { User } from './user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('user_addresses')
export class UserAddress {
  @ApiProperty({ example: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'Home' })
  @Column({ length: 50 })
  label: string;

  @ApiProperty({ example: '123 Main Street' })
  @Column({ length: 200 })
  addressLine1: string;

  @ApiProperty({ example: 'Apt 4B', required: false })
  @Column({ length: 200, nullable: true })
  addressLine2: string;

  @ApiProperty({ example: 'Dubai' })
  @Column({ length: 100 })
  city: string;

  @ApiProperty({ example: 'Dubai' })
  @Column({ length: 100 })
  state: string;

  @ApiProperty({ example: 'UAE' })
  @Column({ length: 100 })
  country: string;

  @ApiProperty({ example: '12345', required: false })
  @Column({ length: 20, nullable: true })
  postalCode: string;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  @ApiProperty({ example: 25.2048 })
  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @ApiProperty({ example: 55.2708 })
  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isDefault: boolean;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
