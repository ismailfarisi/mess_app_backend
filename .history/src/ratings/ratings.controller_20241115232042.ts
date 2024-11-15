import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { VendorRating } from './entities/vendor-rating.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('vendors/:vendorId')
  async createRating(
    @Request() req,
    @Param('vendorId') vendorId: string,
    @Body() createRatingDto: CreateRatingDto,
  ): Promise<VendorRating> {
    try {
      return await this.ratingsService.createRating(
        req.user.id,
        vendorId,
        createRatingDto,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create rating');
    }
  }

  @Get('vendors/:vendorId')
  async getVendorRatings(
    @Param('vendorId') vendorId: string,
  ): Promise<VendorRating[]> {
    return await this.ratingsService.getVendorRatings(vendorId);
  }

  @Get('vendors/:vendorId/average')
  async getVendorAverageRating(
    @Param('vendorId') vendorId: string,
  ): Promise<{ averageRating: number }> {
    const rating = await this.ratingsService.calculateVendorRating(vendorId);
    return { averageRating: rating };
  }
}
