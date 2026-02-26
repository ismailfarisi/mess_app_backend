import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorRating } from './entities/vendor-rating.entity';
import { Vendor } from '../vendors/entities/vendor.entity';

@Module({
  controllers: [RatingsController],
  providers: [RatingsService],
  imports: [TypeOrmModule.forFeature([VendorRating, Vendor])],
  exports: [RatingsService],
})
export class RatingsModule { }
