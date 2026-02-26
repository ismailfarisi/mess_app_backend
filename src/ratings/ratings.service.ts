import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorRating } from './entities/vendor-rating.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Vendor } from '../vendors/entities/vendor.entity';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(VendorRating)
    private readonly ratingRepository: Repository<VendorRating>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) { }

  async createRating(
    userId: string,
    vendorId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<VendorRating> {
    const existingRating = await this.ratingRepository.findOne({
      where: { userId, vendorId },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this vendor');
    }

    const rating = this.ratingRepository.create({
      userId,
      vendorId,
      ...createRatingDto,
    });

    const savedRating = await this.ratingRepository.save(rating);

    // Update the vendor's aggregate rating and totalRatings
    const averageRating = await this.calculateVendorRating(vendorId);
    const totalRatings = await this.ratingRepository.count({ where: { vendorId } });
    await this.vendorRepository.update(vendorId, {
      rating: averageRating,
      totalRatings,
    });

    return savedRating;
  }

  async getVendorRatings(vendorId: string): Promise<VendorRating[]> {
    return await this.ratingRepository.find({
      where: { vendorId },
      relations: ['user'],
    });
  }

  async calculateVendorRating(vendorId: string): Promise<number> {
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .where('rating.vendorId = :vendorId', { vendorId })
      .select('AVG(rating.rating)', 'averageRating')
      .getRawOne();

    return Number(result.averageRating) || 0;
  }
}
