import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '../../config/database.config';
import { VendorSeedService } from './vendor-seed.service';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { VendorMenu } from '../../vendor-menu/entities/vendor-menu.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([Vendor, VendorMenu]),
  ],
  providers: [VendorSeedService],
})
export class SeedModule {}
