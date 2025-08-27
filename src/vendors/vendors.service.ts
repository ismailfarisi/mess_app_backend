import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
import { Point } from 'geojson';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { RolesService } from '../roles/roles.service';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { ROLES } from '../auth/constants/roles.contant';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly rolesService: RolesService,
  ) {}

  async register(vendorRegisterDto: VendorRegisterDto) {
    try {
      // First register the user
      const { user, token } = await this.authService.register({
        name: vendorRegisterDto.name,
        email: vendorRegisterDto.email,
        phone: vendorRegisterDto.phone,
        password: vendorRegisterDto.password,
      });

      // Assign vendor role
      const vendorRole = await this.rolesService.findByName(ROLES.VENDOR);
      await this.rolesService.assignRole({
        userId: user.id,
        roleId: vendorRole.id,
      });

      // Create location point
      const location: Point = {
        type: 'Point',
        coordinates: [vendorRegisterDto.longitude, vendorRegisterDto.latitude],
      };

      // Create vendor profile
      const vendor = this.vendorRepository.create({
        userId: user.id,
        businessName: vendorRegisterDto.businessName,
        address: vendorRegisterDto.address,
        location,
        serviceRadius: vendorRegisterDto.serviceRadius,
        description: vendorRegisterDto.description,
        profilePhotoUrl: vendorRegisterDto.profilePhotoUrl,
        coverPhotoUrl: vendorRegisterDto.coverPhotoUrl,
        cuisineTypes: vendorRegisterDto.cuisineTypes || [],
        foodTypes: vendorRegisterDto.foodTypes || [],
        businessHours: vendorRegisterDto.businessHours,
        acceptedPaymentMethods: vendorRegisterDto.acceptedPaymentMethods || [],
        minimumOrderAmount: vendorRegisterDto.minimumOrderAmount || 0,
      });

      const savedVendor = await this.vendorRepository.save(vendor);
      return { vendor: savedVendor, token };
    } catch (error) {
      this.logger.error('Error in vendor registration:', error);
      if (error.code === '23505') {
        // Unique constraint violation
        throw new ConflictException('Vendor already exists');
      }
      throw error;
    }
  }

  async login(loginDto: VendorLoginDto) {
    try {
      const { user, token } = await this.authService.login(loginDto);

      const hasVendorRole = await this.rolesService.hasRole(
        user.id,
        ROLES.VENDOR,
      );
      if (!hasVendorRole) {
        throw new UnauthorizedException('User is not a vendor');
      }

      const vendor = await this.findByUserId(user.id);
      return { vendor, token };
    } catch (error) {
      this.logger.error('Error in vendor login:', error);
      throw error;
    }
  }

  async findRecommendedVendors(
    latitude: number,
    longitude: number,
    query: QueryVendorDto,
  ) {
    try {
      const queryBuilder = this.vendorRepository
        .createQueryBuilder('vendor')
        .leftJoinAndSelect('vendor.user', 'user')
        .select(['vendor', 'user.id', 'user.name', 'user.email', 'user.phone']);

      // Base distance filter using ST_DWithin
      const radiusInMeters = (query.radius || 10) * 1000;
      queryBuilder
        .where(
          `ST_DWithin(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radiusInMeters
          )`,
          { latitude, longitude, radiusInMeters },
        )
        .addSelect(
          `ST_Distance(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          )`,
          'distance',
        );

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
          queryBuilder.orderBy('distance', 'ASC');
      }

      // Apply pagination
      const take = query.limit || 10;
      const skip = ((query.page || 1) - 1) * take;
      queryBuilder.skip(skip).take(take);

      // Execute query
      const [vendors, total] = await queryBuilder.getManyAndCount();

      // Map to response DTOs with distance included
      const vendorResponses = vendors.map((vendor: any) => ({
        ...this.mapToResponseDto(vendor),
        distance: vendor.distance
          ? Math.round((vendor.distance / 1000) * 10) / 10
          : undefined,
      }));

      return {
        data: vendorResponses,
        meta: {
          total,
          pages: Math.ceil(total / take),
          currentPage: query.page || 1,
          perPage: take,
        },
      };
    } catch (error) {
      this.logger.error('Error finding recommended vendors:', error);
      throw error;
    }
  }

  async findVendorsByLocationAndMealType(
    latitude: number,
    longitude: number,
    mealType: string,
    query: QueryVendorDto = {},
  ): Promise<{
    data: VendorResponseDto[];
    meta: { total: number; pages: number };
  }> {
    try {
      const queryBuilder = this.vendorRepository
        .createQueryBuilder('vendor')
        .leftJoinAndSelect('vendor.user', 'user')
        .leftJoinAndSelect('vendor.menus', 'menu')
        .select([
          'vendor.id',
          'vendor.businessName',
          'vendor.description',
          'vendor.rating',
          'vendor.totalRatings',
          'vendor.profilePhotoUrl',
          'vendor.coverPhotoUrl',
          'vendor.cuisineTypes',
          'vendor.foodTypes',
          'vendor.businessHours',
          'vendor.isOpen',
          'vendor.closureMessage',
          'vendor.location',
          'vendor.serviceRadius',
          'vendor.acceptedPaymentMethods',
          'vendor.minimumOrderAmount',
          'user.id',
          'user.name',
          'user.email',
          'user.phone',
          'menu.id',
          'menu.mealType',
          'menu.description',
          'menu.price',
          'menu.weeklyMenu',
          'menu.isActive',
          'menu.status',
        ]);

      // Base distance filter using ST_DWithin
      const radiusInMeters = (query.radius || 10) * 1000;
      queryBuilder
        .where(
          `ST_DWithin(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radiusInMeters
          )`,
          { latitude, longitude, radiusInMeters },
        )
        .andWhere('menu.mealType = :mealType', { mealType })
        .andWhere('menu.isActive = :isActive', { isActive: true })
        .addSelect(
          `ST_Distance(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          )`,
          'distance',
        );

      // Apply filters...
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

      // Apply sorting...
      switch (query.sortBy) {
        case 'rating':
          queryBuilder.orderBy('vendor.rating', query.sortOrder);
          break;
        case 'deliveryTime':
          queryBuilder.orderBy('vendor.averageDeliveryTime', query.sortOrder);
          break;
        case 'distance':
        default:
          queryBuilder.orderBy('distance', 'ASC');
      }

      // Apply pagination
      const take = query.limit || 10;
      const skip = ((query.page || 1) - 1) * take;
      queryBuilder.skip(skip).take(take);

      // Execute query
      const [vendors, total] = await queryBuilder.getManyAndCount();

      // Transform to response DTOs
      const vendorResponses = vendors.map((vendor: any) => ({
        id: vendor.id,
        businessName: vendor.businessName,
        address: vendor.address,
        description: vendor.description,
        rating: Number(vendor.rating),
        totalRatings: vendor.totalRatings,
        profilePhotoUrl: vendor.profilePhotoUrl,
        coverPhotoUrl: vendor.coverPhotoUrl,
        cuisineTypes: vendor.cuisineTypes,
        foodTypes: vendor.foodTypes,
        isOpen: vendor.isOpen,
        closureMessage: vendor.closureMessage,
        distance: vendor.distance
          ? Math.round((vendor.distance / 1000) * 10) / 10
          : undefined,
        location: vendor.location,
        acceptedPaymentMethods: vendor.acceptedPaymentMethods,
        minimumOrderAmount: Number(vendor.minimumOrderAmount),
        name: vendor.user.name,
        email: vendor.user.email,
        phone: vendor.user.phone,
        menus: vendor.menus.map((menu) => ({
          id: menu.id,
          vendorId: vendor.id,
          mealType: menu.mealType,
          description: menu.description,
          price: Number(menu.price),
          weeklyMenu: menu.weeklyMenu,
          isActive: menu.isActive,
          status: menu.status,
        })),
      }));

      return {
        data: vendorResponses,
        meta: {
          total,
          pages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      this.logger.error(
        'Error finding vendors by location and meal type:',
        error,
      );
      throw error;
    }
  }
  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async findByUserId(userId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!vendor) {
      throw new NotFoundException(
        `Vendor profile not found for user ${userId}`,
      );
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);

    if (updateVendorDto.latitude && updateVendorDto.longitude) {
      vendor.location = {
        type: 'Point',
        coordinates: [updateVendorDto.longitude, updateVendorDto.latitude],
      };
    }

    // Update other fields
    Object.assign(vendor, {
      ...updateVendorDto,
      location: vendor.location,
    });

    return await this.vendorRepository.save(vendor);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
  ): Promise<Vendor> {
    const vendor = await this.findOne(id);

    vendor.isOpen = updateStatusDto.isOpen;
    if (updateStatusDto.closureMessage !== undefined) {
      vendor.closureMessage = updateStatusDto.closureMessage;
    }

    return await this.vendorRepository.save(vendor);
  }

  async remove(id: string): Promise<void> {
    const vendor = await this.findOne(id);
    await this.vendorRepository.remove(vendor);
  }

  private mapToResponseDto(vendor: Vendor): VendorResponseDto {
    return {
      id: vendor.id,
      name: vendor.user?.name,
      email: vendor?.user?.email,
      businessName: vendor.businessName,
      address: vendor.address,
      phone: vendor.user?.phone,
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
      acceptedPaymentMethods: vendor.acceptedPaymentMethods,
    };
  }
}
