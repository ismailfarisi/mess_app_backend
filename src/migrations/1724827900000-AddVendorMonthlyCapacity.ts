import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVendorMonthlyCapacity1724827900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'monthly_capacity',
        type: 'int',
        default: 50,
        comment: 'Maximum monthly subscriptions this vendor can handle',
      }),
    );

    // Add index for performance on capacity queries
    await queryRunner.query(
      'CREATE INDEX IDX_vendor_monthly_capacity ON vendors (monthly_capacity)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IDX_vendor_monthly_capacity');
    await queryRunner.dropColumn('vendors', 'monthly_capacity');
  }
}