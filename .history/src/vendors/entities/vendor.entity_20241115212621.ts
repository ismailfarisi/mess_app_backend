import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Point } from 'geojson';

@Entity()
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  businessName: string;

  @Column()
  address: string;

  @Column()
  phone: string;

  @Column('boolean', { default: false })
  isVerified: boolean;

  @Column('decimal', { precision: 10, scale: 2 })
  rating: number;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  @Column('decimal')
  serviceRadius: number; // in kilometers

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
