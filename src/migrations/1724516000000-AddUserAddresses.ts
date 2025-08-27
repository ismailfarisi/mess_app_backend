import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAddresses1724516000000 implements MigrationInterface {
  name = 'AddUserAddresses1724516000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_addresses" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "label" VARCHAR(50) NOT NULL,
        "addressLine1" VARCHAR(200) NOT NULL,
        "addressLine2" VARCHAR(200),
        "city" VARCHAR(100) NOT NULL,
        "state" VARCHAR(100) NOT NULL,
        "country" VARCHAR(100) NOT NULL,
        "postalCode" VARCHAR(20),
        "location" GEOGRAPHY(Point, 4326) NOT NULL,
        "latitude" DECIMAL(10,8) NOT NULL,
        "longitude" DECIMAL(11,8) NOT NULL,
        "isDefault" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "FK_user_addresses_user_id"
        FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE,
        
        CONSTRAINT "UQ_user_address_label_per_user"
        UNIQUE ("userId", "label"),
        
        CONSTRAINT "CHK_valid_coordinates"
        CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
      );

      CREATE INDEX "IDX_user_addresses_location" 
      ON "user_addresses" USING GIST ("location");

      CREATE INDEX "IDX_user_addresses_user_id" 
      ON "user_addresses" ("userId");

      CREATE INDEX "IDX_user_addresses_default" 
      ON "user_addresses" ("userId", "isDefault") 
      WHERE "isDefault" = true;

      CREATE INDEX "IDX_user_addresses_active" 
      ON "user_addresses" ("userId", "isActive") 
      WHERE "isActive" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_addresses_active";
      DROP INDEX IF EXISTS "IDX_user_addresses_default";
      DROP INDEX IF EXISTS "IDX_user_addresses_user_id";
      DROP INDEX IF EXISTS "IDX_user_addresses_location";
      DROP TABLE "user_addresses";
    `);
  }
}
