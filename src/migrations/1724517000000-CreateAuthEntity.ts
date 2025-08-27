import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAuthEntity1724517000000 implements MigrationInterface {
  name = 'CreateAuthEntity1724517000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Create the auth table
      await queryRunner.createTable(
        new Table({
          name: 'auth',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'phone',
              type: 'varchar',
              length: '20',
              isNullable: true,
            },
            {
              name: 'password',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'entity_type',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'entity_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'is_verified',
              type: 'boolean',
              default: false,
            },
            {
              name: 'is_locked',
              type: 'boolean',
              default: false,
            },
            {
              name: 'failed_login_attempts',
              type: 'int',
              default: 0,
            },
            {
              name: 'locked_until',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'last_login_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'email_verified_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'phone_verified_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Create unique index for email (where email is not null)
      await queryRunner.query(`
        CREATE UNIQUE INDEX IDX_auth_email_unique
        ON auth (email)
        WHERE email IS NOT NULL
      `);

      // Create unique index for phone (where phone is not null)
      await queryRunner.query(`
        CREATE UNIQUE INDEX IDX_auth_phone_unique
        ON auth (phone)
        WHERE phone IS NOT NULL
      `);

      // Create composite unique index for entity_type and entity_id
      await queryRunner.query(`
        CREATE UNIQUE INDEX IDX_auth_entity_unique
        ON auth (entity_type, entity_id)
      `);

      // Add check constraint to ensure either email or phone is provided
      await queryRunner.query(`
        ALTER TABLE auth 
        ADD CONSTRAINT CHK_auth_email_or_phone_required 
        CHECK (email IS NOT NULL OR phone IS NOT NULL)
      `);
    } catch (error) {
      console.error('Error creating auth table:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Drop the check constraint
      await queryRunner.query(`
        ALTER TABLE auth 
        DROP CONSTRAINT IF EXISTS CHK_auth_email_or_phone_required
      `);

      // Drop indexes
      await queryRunner.query('DROP INDEX IF EXISTS IDX_auth_entity_unique');
      await queryRunner.query('DROP INDEX IF EXISTS IDX_auth_phone_unique');
      await queryRunner.query('DROP INDEX IF EXISTS IDX_auth_email_unique');

      // Drop the table
      await queryRunner.dropTable('auth');
    } catch (error) {
      console.error('Error dropping auth table:', error);
      throw error;
    }
  }
}
