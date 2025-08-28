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
import { MealType } from '../commons/enums/meal-type.enum';
import { AvailableVendorsQueryDto } from '../meal-subscription/dto/available-vendors-query.dto';
import { AvailableVendorsResponseDto, VendorForMonthlyDto } from '../meal-subscription/dto/available-vendors-response.dto';
import { ValidationResultDto } from '../meal-subscription/dto/validation-result.dto';

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
    monthlyCapacityFilter = false,
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

      // Add monthly capacity filtering if requested
      if (monthlyCapacityFilter) {
        queryBuilder.andWhere((qb) => {
          const subQuery = qb.subQuery()
            .select('COUNT(ms.id)')
            .from('monthly_subscriptions', 'ms')
            .where('ms.vendorId = vendor.id')
            .andWhere('ms.status IN (:...activeStatuses)')
            .getQuery();
          
          return `(${subQuery}) < COALESCE(vendor.monthly_capacity, 50)`;
        }).setParameter('activeStatuses', ['active', 'scheduled']);
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
    monthlyCapacityFilter = false,
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

      // Add monthly capacity filtering if requested
      if (monthlyCapacityFilter) {
        queryBuilder.andWhere((qb) => {
          const subQuery = qb.subQuery()
            .select('COUNT(ms.id)')
            .from('monthly_subscriptions', 'ms')
            .where('ms.vendorId = vendor.id')
            .andWhere('ms.status IN (:...activeStatuses)')
            .getQuery();
          
          return `(${subQuery}) < COALESCE(vendor.monthly_capacity, 50)`;
        }).setParameter('activeStatuses', ['active', 'scheduled']);
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

  /**
   * Find vendors specifically formatted for monthly subscription selection
   * Includes capacity checking, menu previews, and monthly pricing
   */
  async findVendorsForMonthlySelection(
    latitude: number,
    longitude: number,
    mealType: MealType,
    query: AvailableVendorsQueryDto,
  ): Promise<AvailableVendorsResponseDto> {
    this.logger.debug(`Finding vendors for monthly selection at (${latitude}, ${longitude}) for ${mealType}`);

    const { page = 1, limit = 10, radius = 10000 } = query;
    const offset = (page - 1) * limit;

    try {
      // Base query with spatial filtering and meal type support
      const queryBuilder = this.vendorRepository
        .createQueryBuilder('vendor')
        .leftJoinAndSelect('vendor.user', 'user')
        .leftJoinAndSelect('vendor.menus', 'menus', 'menus.mealType = :mealType AND menus.isActive = true')
        .where('vendor.isOpen = :isOpen', { isOpen: true })
        .andWhere(
          `ST_DWithin(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radius
          )`,
          {
            latitude,
            longitude,
            radius: radius * 1000, // Convert km to meters
          }
        )
        .andWhere('menus.mealType = :mealType', { mealType })
        .setParameters({ mealType });

      // Add capacity filtering subquery - only vendors with sufficient capacity
      queryBuilder.andWhere((qb) => {
        const subQuery = qb.subQuery()
          .select('COUNT(ms.id)')
          .from('monthly_subscriptions', 'ms')
          .where('ms.vendorId = vendor.id')
          .andWhere('ms.status IN (:...activeStatuses)')
          .getQuery();
        
        return `(${subQuery}) < COALESCE(vendor.monthly_capacity, 50)`;
      }).setParameter('activeStatuses', ['active', 'scheduled']);

      // Add distance calculation and ordering
      queryBuilder
        .addSelect(
          `ST_Distance(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          )`,
          'distance'
        )
        .orderBy('distance', 'ASC')
        .addOrderBy('vendor.rating', 'DESC')
        .skip(offset)
        .take(limit);

      const [vendors, totalCount] = await Promise.all([
        queryBuilder.getMany(),
        queryBuilder.getCount(),
      ]);

      this.logger.debug(`Found ${vendors.length} vendors for monthly selection`);

      // Transform vendors to monthly format
      const monthlyVendors: VendorForMonthlyDto[] = await Promise.all(
        vendors.map(async (vendor) => {
          // Calculate current capacity load
          const currentLoad = await this.getCurrentMonthlyLoad(vendor.id);
          
          // Get menu information if available
          const activeMenu = vendor.menus?.find(menu => menu.mealType === mealType && menu.isActive);
          
          // Calculate pricing
          const averagePrice = activeMenu?.price || 0;

          // Get business hours in the expected format
          const businessHours = this.formatBusinessHours(vendor.businessHours);
          
          // Extract coordinates from location
          const coordinates = vendor.location?.coordinates || [0, 0];

          return {
            id: vendor.id,
            name: vendor.user?.name || vendor.businessName,
            description: vendor.description || '',
            logo: vendor.profilePhotoUrl,
            cuisine: vendor.cuisineTypes[0] || 'Various',
            rating: Number(vendor.rating),
            reviewCount: vendor.totalRatings,
            distance: 0, // Will be calculated by the raw query
            averagePrice: Number(averagePrice),
            deliveryTime: vendor.averageDeliveryTime,
            supportedMealTypes: [mealType],
            isAvailable: true,
            monthlyCapacity: vendor.monthlyCapacity || 50,
            currentSubscriptions: currentLoad,
            businessHours,
            address: vendor.address,
            coordinates: {
              latitude: coordinates[1],
              longitude: coordinates[0],
            },
          };
        })
      );

      return {
        vendors: monthlyVendors,
        meta: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        searchParams: {
          location: { latitude, longitude },
          mealType,
          radius,
        },
      };
    } catch (error) {
      this.logger.error('Error finding vendors for monthly selection:', error);
      throw error;
    }
  }

  /**
   * Check monthly capacity for multiple vendors
   * Returns capacity status and current load for each vendor
   */
  async checkVendorMonthlyCapacity(
    vendorIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{ vendorId: string; hasCapacity: boolean; currentLoad: number; maxCapacity: number; availableSlots: number }[]> {
    this.logger.debug(`Checking monthly capacity for ${vendorIds.length} vendors`);

    const results = await Promise.all(
      vendorIds.map(async (vendorId) => {
        // Get vendor to check max capacity
        const vendor = await this.vendorRepository.findOne({
          where: { id: vendorId },
          select: ['id', 'monthlyCapacity'],
        });

        if (!vendor) {
          return {
            vendorId,
            hasCapacity: false,
            currentLoad: 0,
            maxCapacity: 0,
            availableSlots: 0,
          };
        }

        const maxCapacity = vendor.monthlyCapacity || 50;
        
        // Get current load - count active monthly subscriptions in the date range
        const currentLoad = await this.vendorRepository.query(`
          SELECT COUNT(*) as count
          FROM monthly_subscriptions ms
          WHERE ms.vendorId = $1
          AND ms.status IN ('active', 'scheduled')
          AND ms.startDate <= $3
          AND ms.endDate >= $2
        `, [vendorId, startDate, endDate]);

        const load = parseInt(currentLoad[0]?.count || '0');
        const availableSlots = maxCapacity - load;
        const hasCapacity = availableSlots > 0;

        return {
          vendorId,
          hasCapacity,
          currentLoad: load,
          maxCapacity,
          availableSlots,
        };
      })
    );

    this.logger.debug(`Capacity check completed for ${vendorIds.length} vendors`);
    return results;
  }

  /**
   * Comprehensive validation for vendors in monthly subscription context
   * Checks location, meal type, capacity, and availability
   */
  async validateVendorsForMonthly(
    vendorIds: string[],
    userLocation: { latitude: number; longitude: number },
    mealType: MealType,
    startDate: Date,
  ): Promise<ValidationResultDto> {
    this.logger.debug(`Validating ${vendorIds.length} vendors for monthly subscription`);

    const vendorValidations = await Promise.all(
      vendorIds.map(async (vendorId) => {
        const vendor = await this.vendorRepository.findOne({
          where: { id: vendorId },
          relations: ['user', 'menus'],
        });

        let vendorName = 'Unknown Vendor';
        let isAvailable = false;
        let canDeliver = false;
        let hasCapacity = false;
        let distance = 0;
        const issues: string[] = [];

        if (!vendor) {
          issues.push('Vendor not found');
        } else {
          vendorName = vendor.user?.name || vendor.businessName;
          
          // Check if vendor is active
          if (!vendor.isOpen) {
            issues.push('Vendor is currently closed');
          } else {
            isAvailable = true;
          }

          // Check service radius using PostGIS
          const distanceResult = await this.vendorRepository.query(`
            SELECT ST_Distance(
              vendor.location::geography,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) as distance
            FROM vendors vendor
            WHERE vendor.id = $3
          `, [userLocation.longitude, userLocation.latitude, vendorId]);

          distance = parseFloat(distanceResult[0]?.distance || '0') / 1000; // Convert to km

          if (distance <= vendor.serviceRadius) {
            canDeliver = true;
          } else {
            issues.push(`Location outside service radius (${distance.toFixed(2)}km > ${vendor.serviceRadius}km)`);
          }

          // Check meal type support
          const supportsMealType = vendor.menus?.some(
            menu => menu.mealType === mealType && menu.isActive
          );

          if (!supportsMealType) {
            issues.push(`Vendor does not serve ${mealType} meals`);
            isAvailable = false;
          }

          // Check monthly capacity
          const currentLoad = await this.getCurrentMonthlyLoad(vendor.id);
          const maxCapacity = vendor.monthlyCapacity || 50;

          if (currentLoad < maxCapacity) {
            hasCapacity = true;
          } else {
            issues.push('Vendor has reached maximum monthly capacity');
          }
        }

        return {
          vendorId,
          vendorName,
          isAvailable,
          canDeliver,
          hasCapacity,
          distance,
          issues,
        };
      })
    );

    const isValid = vendorValidations.every(v =>
      v.isAvailable && v.canDeliver && v.hasCapacity && v.issues.length === 0
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    vendorValidations.forEach(validation => {
      validation.issues.forEach(issue => {
        if (validation.hasCapacity && validation.canDeliver) {
          warnings.push(`${validation.vendorName}: ${issue}`);
        } else {
          errors.push(`${validation.vendorName}: ${issue}`);
        }
      });
    });

    return {
      isValid,
      vendors: vendorValidations,
      delivery: {
        canDeliver: isValid,
        estimatedDeliveryTime: 30,
        deliveryFee: 0,
        issues: [],
      },
      schedule: {
        isValidStartDate: true,
        deliveryDaysCount: 28,
        issues: [],
      },
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }

  /**
   * Helper method to get current monthly subscription load for a vendor
   */
  private async getCurrentMonthlyLoad(vendorId: string): Promise<number> {
    const result = await this.vendorRepository.query(`
      SELECT COUNT(*) as count
      FROM monthly_subscriptions ms
      WHERE ms.vendorId = $1
      AND ms.status IN ('active', 'scheduled')
    `, [vendorId]);

    return parseInt(result[0]?.count || '0');
  }

  /**
   * Format business hours from vendor entity to DTO format
   */
  private formatBusinessHours(businessHours: any): any[] {
    if (!businessHours) return [];

    const dayMap = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };

    return Object.entries(businessHours).map(([dayName, hours]: [string, any]) => ({
      day: dayMap[dayName.toLowerCase()] || 0,
      openTime: hours.open || '09:00',
      closeTime: hours.close || '22:00',
      isClosed: !hours.open || !hours.close,
    }));
  }
}
