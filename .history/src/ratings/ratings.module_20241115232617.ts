import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorRating } from './entities/vendor-rating.entity';

@Module({
  controllers: [RatingsController],
  providers: [RatingsService],
  imports: [TypeOrmModule.forFeature([VendorRating])],
  exports: [RatingsService],
})
export class RatingsModule {}
