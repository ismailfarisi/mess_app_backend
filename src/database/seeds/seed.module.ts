// src/database/seeds/seed.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { UserRole } from '../../roles/entities/user-role.entity';
import databaseConfig from '../../config/database.config';
import { UserRoleSeedService } from './vendor-user.seed';
import { Token } from 'src/auth/entities/token.entity';
import { VendorMenu } from 'src/vendor-menu/entities/vendor-menu.entity';
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
        entities: [Role, User, Vendor, UserRole ,Token,VendorMenu],
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([Role, User, Vendor, UserRole,Token,VendorMenu]),
    
  ],
  providers:[SeedService]
})
export class SeedModule {}