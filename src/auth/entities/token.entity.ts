import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Auth } from './auth.entity';

@Entity()
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => Auth, { onDelete: 'CASCADE' })
  auth: Auth;
}
