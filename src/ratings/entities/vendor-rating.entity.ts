import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';

@Entity('vendor_ratings')
export class VendorRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  vendorId: string;

  @Column('int')
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @CreateDateColumn()
  createdAt: Date;
}
