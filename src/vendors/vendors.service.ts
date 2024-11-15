// src/vendors/vendors.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { Point } from 'geojson';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly jwtService: JwtService,
  ) {}

  async register(createVendorDto: CreateVendorDto) {
    const existingVendor = await this.vendorRepository.findOne({
      where: { email: createVendorDto.email },
    });

    if (existingVendor) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createVendorDto.password, 10);

    const location: Point = {
      type: 'Point',
      coordinates: [createVendorDto.longitude, createVendorDto.latitude],
    };

    const vendor = this.vendorRepository.create({
      ...createVendorDto,
      password: hashedPassword,
      location,
      rating: 0,
    });

    const savedVendor = await this.vendorRepository.save(vendor);
    const token = this.generateToken(savedVendor);

    return { vendor: savedVendor, token };
  }

  async login(loginDto: VendorLoginDto) {
    const vendor = await this.vendorRepository.findOne({
      where: { email: loginDto.email },
    });

    if (
      !vendor ||
      !(await bcrypt.compare(loginDto.password, vendor.password))
    ) {
      throw new NotFoundException('Invalid credentials');
    }

    const token = this.generateToken(vendor);
    return { vendor, token };
  }

  async findOne(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });

    return vendor;
  }

  private generateToken(vendor: Vendor) {
    return this.jwtService.sign({
      sub: vendor.id,
      email: vendor.email,
      type: 'vendor',
    });
  }

  async findRecommendedVendors(
    latitude: number,
    longitude: number,
    query: QueryVendorDto,
  ): Promise<{
    data: VendorResponseDto[];
    meta: { total: number; pages: number };
  }> {
    const queryBuilder = this.vendorRepository
      .createQueryBuilder('vendor')
      .select([
        'vendor',
        'ST_Distance(vendor.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)) as distance',
      ])
      .where(
        'ST_DWithin(vendor.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326), :radius)',
      )
      .setParameters({
        latitude,
        longitude,
        radius: (query.radius || 10) * 1000, // Convert km to meters
      });

    // Apply filters
    if (query.isOpen !== undefined) {
      queryBuilder.andWhere('vendor.isOpen = :isOpen', {
        isOpen: query.isOpen,
      });
    }

    if (query.minRating) {
      queryBuilder.andWhere('vendor.rating >= :minRating', {
        minRating: query.minRating,
      });
    }

    if (query.cuisineType) {
      queryBuilder.andWhere(':cuisineType = ANY(vendor.cuisineTypes)', {
        cuisineType: query.cuisineType,
      });
    }

    if (query.foodType) {
      queryBuilder.andWhere(':foodType = ANY(vendor.foodTypes)', {
        foodType: query.foodType,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(vendor.name ILIKE :search OR vendor.businessName ILIKE :search OR vendor.address ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Apply sorting
    switch (query.sortBy) {
      case 'rating':
        queryBuilder.orderBy('vendor.rating', query.sortOrder);
        break;
      case 'deliveryTime':
        queryBuilder.orderBy('vendor.averageDeliveryTime', query.sortOrder);
        break;
      case 'distance':
      default:
        queryBuilder.orderBy('distance', query.sortOrder);
    }

    // Apply pagination
    const take = query.limit || 10;
    const skip = ((query.page || 1) - 1) * take;
    queryBuilder.skip(skip).take(take);

    // Get total count
    const total = await queryBuilder.getCount();
    const pages = Math.ceil(total / take);

    // Execute query
    const vendors = await queryBuilder.getRawAndEntities();

    // Map to response DTOs with distance
    const vendorResponses = vendors.entities.map((vendor, index) => {
      const distance = vendors.raw[index].distance;
      return this.mapToResponseDto(vendor, distance);
    });

    return {
      data: vendorResponses,
      meta: {
        total,
        pages,
      },
    };
  }

  async getVendorDetails(
    id: string,
    latitude?: number,
    longitude?: number,
  ): Promise<VendorResponseDto> {
    const queryBuilder = this.vendorRepository
      .createQueryBuilder('vendor')
      .where('vendor.id = :id', { id });

    if (latitude && longitude) {
      queryBuilder
        .addSelect(
          'ST_Distance(vendor.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)) as distance',
          'distance',
        )
        .setParameters({ latitude, longitude });
    }

    const result = await queryBuilder.getRawAndEntities();
    if (!result.entities[0]) {
      throw new NotFoundException('Vendor not found');
    }

    return this.mapToResponseDto(result.entities[0], result.raw[0]?.distance);
  }

  private mapToResponseDto(
    vendor: Vendor,
    distance?: number,
  ): VendorResponseDto {
    return {
      id: vendor.id,
      name: vendor.name,
      businessName: vendor.businessName,
      address: vendor.address,
      phone: vendor.phone,
      rating: vendor.rating,
      totalRatings: vendor.totalRatings,
      profilePhotoUrl: vendor.profilePhotoUrl,
      coverPhotoUrl: vendor.coverPhotoUrl,
      cuisineTypes: vendor.cuisineTypes,
      foodTypes: vendor.foodTypes,
      isOpen: vendor.isOpen,
      closureMessage: vendor.closureMessage,
      distance: distance ? Math.round((distance / 1000) * 10) / 10 : undefined, // Convert to km and round to 1 decimal
      deliveryTime: vendor.averageDeliveryTime,
      minimumOrderAmount: vendor.minimumOrderAmount,
      acceptedPaymentMethods: vendor.acceptedPaymentMethods,
    };
  }
}
