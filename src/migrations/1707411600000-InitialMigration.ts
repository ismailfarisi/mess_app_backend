// src/migrations/1707411600000-InitialMigration.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1707411600000 implements MigrationInterface {
  name = 'InitialMigration1707411600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing foreign keys first
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "user_roles" 
      DROP CONSTRAINT IF EXISTS "FK_472b25323af01488f1f66a06b67";
      
      ALTER TABLE IF EXISTS "user_roles" 
      DROP CONSTRAINT IF EXISTS "FK_86033897c009fcca8b6505d6be2";
      
      ALTER TABLE IF EXISTS "vendor" 
      DROP CONSTRAINT IF EXISTS "FK_vendor_user_id";
    `);

    // Recreate tables with proper constraints
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR NOT NULL,
        "email" VARCHAR UNIQUE NOT NULL,
        "phone" VARCHAR NOT NULL,
        "password" VARCHAR NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR NOT NULL UNIQUE,
        "description" VARCHAR,
        "metadata" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "user_roles" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "roleId" UUID NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "metadata" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "roleId")
      );

      -- Add foreign key constraints
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id") ON DELETE CASCADE;

      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2"
      FOREIGN KEY ("roleId")
      REFERENCES "roles"("id") ON DELETE CASCADE;

      -- Add userId column to vendor table if it doesn't exist
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

      -- Add vendor foreign key constraint
      ALTER TABLE "vendor"
      ADD CONSTRAINT "FK_vendor_user_id"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "user_roles" 
      DROP CONSTRAINT IF EXISTS "FK_472b25323af01488f1f66a06b67";
      
      ALTER TABLE IF EXISTS "user_roles" 
      DROP CONSTRAINT IF EXISTS "FK_86033897c009fcca8b6505d6be2";
      
      ALTER TABLE IF EXISTS "vendor" 
      DROP CONSTRAINT IF EXISTS "FK_vendor_user_id";

      DROP TABLE IF EXISTS "user_roles";
      DROP TABLE IF EXISTS "roles";
      DROP TABLE IF EXISTS "users";

      ALTER TABLE vendor DROP COLUMN IF EXISTS "userId";
    `);
  }
}
