import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  import { Role } from './role.entity';
  
  @Entity('user_roles')
  @Unique(['userId', 'roleId']) // Prevents duplicate role assignments
  export class UserRole {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column('uuid')
    userId: string;
  
    @Column('uuid')
    roleId: string;
  
    @ManyToOne(() => User, user => user.userRoles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @ManyToOne(() => Role, role => role.userRoles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roleId' })
    role: Role;
  
    @Column({ default: true })
    isActive: boolean;
  
    @Column('jsonb', { nullable: true })
    metadata: Record<string, any>;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }