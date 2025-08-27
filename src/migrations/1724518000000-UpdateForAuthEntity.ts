import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateForAuthEntity1724518000000 implements MigrationInterface {
  name = 'UpdateForAuthEntity1724518000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update tokens table to reference auth instead of user
    await queryRunner.query(`ALTER TABLE "token" ADD COLUMN "authId" uuid`);

    // Update existing token references (migrate existing data first)
    // This assumes auth records already exist for users
    await queryRunner.query(`
      UPDATE "token" 
      SET "authId" = (
        SELECT auth.id 
        FROM auth 
        WHERE auth.entity_type = 'user' 
        AND auth.entity_id = "token"."userId"
      )
      WHERE "token"."userId" IS NOT NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "token" ADD CONSTRAINT "FK_token_auth" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Drop old user relationship
    await queryRunner.query(
      `ALTER TABLE "token" DROP CONSTRAINT IF EXISTS "FK_token_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token" DROP COLUMN IF EXISTS "userId"`,
    );

    // Remove authentication fields from users table
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "UQ_user_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "UQ_user_phone"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "password"`,
    );

    // Note: Vendors don't need auth field removal since they use userId reference
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add authentication fields back to users table
    await queryRunner.query(`ALTER TABLE "user" ADD "email" character varying`);
    await queryRunner.query(`ALTER TABLE "user" ADD "phone" character varying`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_user_email" UNIQUE ("email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_user_phone" UNIQUE ("phone")`,
    );

    // Revert tokens table changes
    await queryRunner.query(`ALTER TABLE "token" ADD "userId" uuid`);

    // Restore token user references
    await queryRunner.query(`
      UPDATE "token" 
      SET "userId" = (
        SELECT CASE 
          WHEN auth.entity_type = 'user' THEN auth.entity_id
          WHEN auth.entity_type = 'vendor' THEN (
            SELECT v."userId" FROM vendors v WHERE v.id = auth.entity_id
          )
          ELSE NULL
        END
      )
      FROM auth
      WHERE auth.id = "token"."authId"
    `);

    await queryRunner.query(
      `ALTER TABLE "token" ADD CONSTRAINT "FK_token_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "token" DROP CONSTRAINT "FK_token_auth"`,
    );
    await queryRunner.query(`ALTER TABLE "token" DROP COLUMN "authId"`);

    // Restore user authentication data from auth table
    await queryRunner.query(`
      UPDATE "user" 
      SET 
        email = auth.email,
        phone = auth.phone,
        password = auth.password
      FROM auth
      WHERE auth.entity_type = 'user' 
      AND auth.entity_id = "user".id
    `);
  }
}
