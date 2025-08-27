import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserRole } from 'src/roles/entities/user-role.entity';
import { UserAddress } from './user-address.entity';
import { Auth } from '../../auth/entities/auth.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Auth fields removed - now handled by Auth entity

  @OneToOne(() => Auth, { nullable: true, eager: true })
  @JoinColumn()
  auth: Auth;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => UserAddress, (address) => address.user)
  addresses: UserAddress[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual getters for backward compatibility
  get email(): string {
    return this.auth?.email;
  }

  get phone(): string {
    return this.auth?.phone;
  }

  get password(): string {
    return this.auth?.password;
  }

  // Helper method to load auth relationship
  async loadAuth(authRepository: any): Promise<void> {
    if (!this.auth) {
      this.auth = await authRepository.findOne({
        where: { entityType: 'user', entityId: this.id },
      });
    }
  }
}
