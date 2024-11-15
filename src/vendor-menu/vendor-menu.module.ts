import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorMenuController } from './vendor-menu.controller';
import { VendorMenuService } from './vendor-menu.service';
import { VendorMenu } from './entities/vendor-menu.entity';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [TypeOrmModule.forFeature([VendorMenu]), VendorsModule],
  controllers: [VendorMenuController],
  providers: [VendorMenuService],
  exports: [VendorMenuService],
})
export class VendorMenuModule {}
