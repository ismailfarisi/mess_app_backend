// src/vendors/vendors.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
import { Point } from 'geojson';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { RolesService } from '../roles/roles.service';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { ROLES } from 'src/auth/constants/roles.contant';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly rolesService: RolesService,
  ) {}

  async register(createVendorDto: CreateVendorDto) {
    // First register the user
    const { user, token } = await this.authService.register({
      name: createVendorDto.name,
      email: createVendorDto.email,
      phone: createVendorDto.phone,
      password: createVendorDto.password,
    });

    // Get the vendor role and assign it
    const vendorRole = await this.rolesService.findByName(ROLES.VENDOR);
    if (!vendorRole) {
      throw new NotFoundException('Vendor role not found');
    }

    await this.rolesService.assignRole({
      userId: user.id,
      roleId: vendorRole.id,
    });

    // Create location point
    const location: Point = {
      type: 'Point',
      coordinates: [createVendorDto.longitude, createVendorDto.latitude],
    };

    // Create vendor profile
    const vendor = this.vendorRepository.create({
      userId: user.id,
      businessName: createVendorDto.businessName,
      address: createVendorDto.address,
      location,
      serviceRadius: createVendorDto.serviceRadius,
      description: createVendorDto.description,
      profilePhotoUrl: createVendorDto.profilePhotoUrl,
      coverPhotoUrl: createVendorDto.coverPhotoUrl,
      cuisineTypes: createVendorDto.cuisineTypes || [],
      foodTypes: createVendorDto.foodTypes || [],
      businessHours: createVendorDto.businessHours,
      acceptedPaymentMethods: createVendorDto.acceptedPaymentMethods || [],
      minimumOrderAmount: createVendorDto.minimumOrderAmount || 0,
    });

    const savedVendor = await this.vendorRepository.save(vendor);

    return { vendor: savedVendor, token };
  }

  async login(loginDto: VendorLoginDto) {
    // Use auth service to handle login
    const { user, token } = await this.authService.login(loginDto);

    // Check if user has vendor role
    const hasVendorRole = await this.rolesService.hasRole(user.id, ROLES.VENDOR);
    if (!hasVendorRole) {
      throw new UnauthorizedException('User is not a vendor');
    }

    // Get vendor profile
    const vendor = await this.vendorRepository.findOne({
      where: { userId: user.id },
      relations: ['user'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    return { vendor, user, token };
  }

  async findOne(vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['user'],
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    return vendor;
  }

  async findByUserId(userId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor profile not found for user ${userId}`);
    }

    return vendor;
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
      .leftJoinAndSelect('vendor.user', 'user')
      .select([
        'vendor.*',
        'user.name',
        'user.email',
        'user.phone',
      ])
      .addSelect(
        `ST_Distance(
          vendor.location,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
        ) as distance`,
      );

    queryBuilder
      .where(
        `ST_DWithin(
          vendor.location,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radius
        )`,
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
        '(vendor.businessName ILIKE :search OR vendor.address ILIKE :search OR user.name ILIKE :search)',
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

    // Execute query
    const [results, total] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      queryBuilder.getCount(),
    ]);

    const vendorResponses = results.entities.map((vendor, index) =>
      this.mapToResponseDto(vendor, results.raw[index].distance),
    );

    return {
      data: vendorResponses,
      meta: {
        total,
        pages: Math.ceil(total / take),
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
      .leftJoinAndSelect('vendor.user', 'user')
      .where('vendor.id = :id', { id });

    if (latitude && longitude) {
      queryBuilder
        .addSelect(
          `ST_Distance(
            vendor.location,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          ) as distance`,
        )
        .setParameters({ latitude, longitude });
    }

    const results = await queryBuilder.getRawAndEntities();
    
    if (!results.entities[0]) {
      throw new NotFoundException('Vendor not found');
    }

    return this.mapToResponseDto(
      results.entities[0],
      results.raw[0]?.distance,
    );
  }

  private mapToResponseDto(
    vendor: Vendor,
    distance?: number,
  ): VendorResponseDto {
    return {
      id: vendor.id,
      name: vendor.user.name,
      businessName: vendor.businessName,
      address: vendor.address,
      phone: vendor.user.phone,
      rating: Number(vendor.rating),
      totalRatings: vendor.totalRatings,
      profilePhotoUrl: vendor.profilePhotoUrl,
      coverPhotoUrl: vendor.coverPhotoUrl,
      cuisineTypes: vendor.cuisineTypes,
      foodTypes: vendor.foodTypes,
      isOpen: vendor.isOpen,
      closureMessage: vendor.closureMessage,
      location: {
        type: vendor.location.type,
        coordinates: vendor.location.coordinates,
      },
      distance: distance ? Math.round((distance / 1000) * 10) / 10 : undefined, // Convert to km and round to 1 decimal
      deliveryTime: vendor.averageDeliveryTime,
      acceptedPaymentMethods: vendor.acceptedPaymentMethods,
    };
  }
}