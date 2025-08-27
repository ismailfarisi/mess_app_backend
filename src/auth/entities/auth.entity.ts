import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { IsEmail, IsPhoneNumber, MinLength } from 'class-validator';

@Entity('auth')
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['entityType', 'entityId'], { unique: true })
@Check('email_or_phone_required', 'email IS NOT NULL OR phone IS NOT NULL')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  @IsEmail()
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  @IsPhoneNumber()
  phone?: string;

  @Column({ type: 'varchar', length: 255 })
  @MinLength(8)
  password: string;

  @Column({ type: 'varchar', length: 50, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId: string;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_locked' })
  isLocked: boolean;

  @Column({ type: 'int', default: 0, name: 'failed_login_attempts' })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true, name: 'locked_until' })
  lockedUntil?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'email_verified_at' })
  emailVerifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'phone_verified_at' })
  phoneVerifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods for account locking
  isAccountLocked(): boolean {
    return this.isLocked && this.lockedUntil && new Date() < this.lockedUntil;
  }

  incrementFailedAttempts(): void {
    this.failedLoginAttempts++;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
      this.isLocked = true;
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.isLocked = false;
    this.lockedUntil = null;
  }

  recordSuccessfulLogin(): void {
    this.lastLoginAt = new Date();
    this.resetFailedAttempts();
  }

  markEmailVerified(): void {
    this.isVerified = true;
    this.emailVerifiedAt = new Date();
  }

  markPhoneVerified(): void {
    this.isVerified = true;
    this.phoneVerifiedAt = new Date();
  }
}
