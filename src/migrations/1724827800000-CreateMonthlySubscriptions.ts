import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateMonthlySubscriptions1724827800000
  implements MigrationInterface
{
  name = 'CreateMonthlySubscriptions1724827800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create monthly_subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'monthly_subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'vendor_ids',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'individual_subscription_ids',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'mealType',
            type: 'enum',
            enum: ['breakfast', 'lunch', 'dinner'],
            isNullable: false,
          },
          {
            name: 'total_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'pending',
              'active',
              'paused',
              'cancelled',
              'completed',
              'expired',
            ],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'address_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'payment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint for userId
    await queryRunner.createForeignKey(
      'monthly_subscriptions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_monthly_subscriptions_user_id',
      }),
    );

    // Add check constraints for vendor_ids array length (1-4 vendors)
    await queryRunner.query(`
      ALTER TABLE monthly_subscriptions 
      ADD CONSTRAINT check_vendor_ids_length 
      CHECK (jsonb_array_length(vendor_ids) >= 1 AND jsonb_array_length(vendor_ids) <= 4)
    `);

    // Create indexes for performance
    await queryRunner.createIndex(
      'monthly_subscriptions',
      new TableIndex({
        name: 'IDX_monthly_subscriptions_user_meal_start',
        columnNames: ['userId', 'mealType', 'start_date'],
      }),
    );

    await queryRunner.createIndex(
      'monthly_subscriptions',
      new TableIndex({
        name: 'IDX_monthly_subscriptions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'monthly_subscriptions',
      new TableIndex({
        name: 'IDX_monthly_subscriptions_user_id',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'monthly_subscriptions',
      new TableIndex({
        name: 'IDX_monthly_subscriptions_meal_type',
        columnNames: ['mealType'],
      }),
    );

    await queryRunner.createIndex(
      'monthly_subscriptions',
      new TableIndex({
        name: 'IDX_monthly_subscriptions_start_date',
        columnNames: ['start_date'],
      }),
    );

    // Add monthly_subscription_id column to meal_subscriptions table
    await queryRunner.query(`
      ALTER TABLE meal_subscriptions 
      ADD COLUMN monthly_subscription_id uuid NULL
    `);

    // Add foreign key constraint for monthly_subscription_id in meal_subscriptions
    await queryRunner.createForeignKey(
      'meal_subscriptions',
      new TableForeignKey({
        columnNames: ['monthly_subscription_id'],
        referencedTableName: 'monthly_subscriptions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_meal_subscriptions_monthly_subscription_id',
      }),
    );

    // Add index for monthly_subscription_id in meal_subscriptions
    await queryRunner.createIndex(
      'meal_subscriptions',
      new TableIndex({
        name: 'IDX_meal_subscriptions_monthly_subscription_id',
        columnNames: ['monthly_subscription_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key and index from meal_subscriptions
    await queryRunner.dropIndex(
      'meal_subscriptions',
      'IDX_meal_subscriptions_monthly_subscription_id',
    );
    await queryRunner.dropForeignKey(
      'meal_subscriptions',
      'FK_meal_subscriptions_monthly_subscription_id',
    );

    // Drop monthly_subscription_id column from meal_subscriptions
    await queryRunner.query(
      `ALTER TABLE meal_subscriptions DROP COLUMN monthly_subscription_id`,
    );

    // Drop indexes from monthly_subscriptions
    await queryRunner.dropIndex(
      'monthly_subscriptions',
      'IDX_monthly_subscriptions_start_date',
    );
    await queryRunner.dropIndex(
      'monthly_subscriptions',
      'IDX_monthly_subscriptions_meal_type',
    );
    await queryRunner.dropIndex(
      'monthly_subscriptions',
      'IDX_monthly_subscriptions_user_id',
    );
    await queryRunner.dropIndex(
      'monthly_subscriptions',
      'IDX_monthly_subscriptions_status',
    );
    await queryRunner.dropIndex(
      'monthly_subscriptions',
      'IDX_monthly_subscriptions_user_meal_start',
    );

    // Drop check constraint
    await queryRunner.query(
      `ALTER TABLE monthly_subscriptions DROP CONSTRAINT check_vendor_ids_length`,
    );

    // Drop foreign key
    await queryRunner.dropForeignKey(
      'monthly_subscriptions',
      'FK_monthly_subscriptions_user_id',
    );

    // Drop monthly_subscriptions table
    await queryRunner.dropTable('monthly_subscriptions');
  }
}
