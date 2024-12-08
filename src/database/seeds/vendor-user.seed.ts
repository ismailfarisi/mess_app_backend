// src/database/seeds/user-role-seed.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../roles/entities/user-role.entity';
import { ROLE_METADATA, ROLES } from 'src/auth/constants/roles.contant';
@Injectable()
export class UserRoleSeedService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async seed() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Disable foreign key constraints
      await queryRunner.query('SET CONSTRAINTS ALL DEFERRED;');

      // First, add userId column to vendor table if it doesn't exist
      await queryRunner.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vendor' AND column_name = 'userId'
          ) THEN 
            ALTER TABLE vendor 
            ADD COLUMN "userId" UUID;
          END IF;
        END $$;
      `);

      // Drop existing tables if they exist
      await queryRunner.query('DROP TABLE IF EXISTS user_roles CASCADE;');
      await queryRunner.query('DROP TABLE IF EXISTS roles CASCADE;');
      await queryRunner.query('DROP TABLE IF EXISTS users CASCADE;');

      console.log('Dropped existing tables');

      // Create roles table
      await queryRunner.query(`
        CREATE TABLE roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR NOT NULL UNIQUE,
          description VARCHAR,
          metadata JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create users table
      await queryRunner.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR NOT NULL,
          email VARCHAR UNIQUE NOT NULL,
          phone VARCHAR NOT NULL,
          password VARCHAR NOT NULL,
          metadata JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create user_roles table
      await queryRunner.query(`
        CREATE TABLE user_roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "userId" UUID NOT NULL,
          "roleId" UUID NOT NULL,
          "isActive" BOOLEAN DEFAULT true,
          metadata JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FK_user_roles_user_id" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT "FK_user_roles_role_id" FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE,
          UNIQUE("userId", "roleId")
        );
      `);

      console.log('Created new tables');

      // Seed roles
      for (const [key, metadata] of Object.entries(ROLE_METADATA)) {
        await queryRunner.query(
          `
          INSERT INTO roles (name, description, metadata)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO NOTHING
          RETURNING id;
          `,
          [metadata.name, metadata.description, metadata]
        );
      }

      console.log('Seeded roles');

      // Get vendor role ID
      const vendorRole = await queryRunner.query(
        `SELECT id FROM roles WHERE name = $1`,
        [ROLES.VENDOR]
      );

      if (!vendorRole || vendorRole.length === 0) {
        throw new Error('Vendor role not found after seeding');
      }

      // Get existing vendors
      const vendors = await queryRunner.query(`
        SELECT id, name, email, phone, password, "businessName"
        FROM vendor 
        WHERE "userId" IS NULL
      `);

      console.log(`Found ${vendors.length} vendors to migrate`);

      // Create users for vendors and assign roles
      for (const vendor of vendors) {
        try {
          // Create user
          const userResult = await queryRunner.query(
            `
            INSERT INTO users (name, email, phone, password)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
            `,
            [vendor.name, vendor.email, vendor.phone, vendor.password]
          );

          if (!userResult || userResult.length === 0) {
            console.error(`Failed to create user for vendor ${vendor.email}`);
            continue;
          }

          const userId = userResult[0].id;

          // Assign vendor role
          await queryRunner.query(
            `
            INSERT INTO user_roles ("userId", "roleId", "isActive")
            VALUES ($1, $2, true);
            `,
            [userId, vendorRole[0].id]
          );

          // Update vendor with userId
          await queryRunner.query(
            `
            UPDATE vendor 
            SET "userId" = $1
            WHERE id = $2;
            `,
            [userId, vendor.id]
          );

          console.log(`✅ Migrated vendor: ${vendor.businessName} (${vendor.email})`);
        } catch (error) {
          console.error(`❌ Failed to migrate vendor ${vendor.email}:`, error.message);
        }
      }

      // Re-enable foreign key constraints
      await queryRunner.query('SET CONSTRAINTS ALL IMMEDIATE;');

      await queryRunner.commitTransaction();
      console.log('Successfully completed migration');
    } catch (error) {
      console.error('Error in migration:', error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}