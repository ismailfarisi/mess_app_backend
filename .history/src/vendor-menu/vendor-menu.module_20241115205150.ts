import { Module } from '@nestjs/common';
import { VendorMenuService } from './vendor-menu.service';
import { VendorMenuController } from './vendor-menu.controller';

@Module({
  controllers: [VendorMenuController],
  providers: [VendorMenuService],
})
export class VendorMenuModule {}
