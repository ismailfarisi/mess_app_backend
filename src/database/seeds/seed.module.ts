// src/database/seeds/seed.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { UserRole } from '../../roles/entities/user-role.entity';
import { Auth } from '../../auth/entities/auth.entity';
import databaseConfig from '../../config/database.config';
import { Token } from 'src/auth/entities/token.entity';
import { VendorMenu } from 'src/vendor-menu/entities/vendor-menu.entity';
import { UserAddress } from '../../users/entities/user-address.entity';
import { SeedService } from './vendor-seed.service';

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
        entities: [
          Role,
          User,
          Vendor,
          UserRole,
          Auth,
          Token,
          VendorMenu,
          UserAddress,
        ],
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([
      Role,
      User,
      Vendor,
      UserRole,
      Auth,
      Token,
      VendorMenu,
      UserAddress,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
