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
import { VendorDashboardStatsDto } from './dto/vendor-dashboard-stats.dto';
import {
  QueryVendorSubscriptionsDto,
  VendorSubscriptionListResponseDto,
  VendorSubscriptionItemDto,
  VendorCapacityDto,
} from './dto/vendor-subscription-list.dto';
import {
  VendorAnalyticsQueryDto,
  VendorRevenueAnalyticsDto,
  VendorOrderAnalyticsDto,
  CustomerAnalyticsDto,
  PerformanceMetricsDto,
  RevenueDataPointDto,
  PopularMealDto,
} from './dto/vendor-analytics.dto';

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
      this.logger.debug(`Finding recommended vendors at (${latitude}, ${longitude}) with query:`, query);
      
      // Start with a simple query to identify the issue
      const queryBuilder = this.vendorRepository
        .createQueryBuilder('vendor')
        .leftJoinAndSelect('vendor.user', 'user');

      // Base distance filter using ST_DWithin (simplified)
      const radiusInMeters = (query.radius || 10) * 1000;
      this.logger.debug(`Applying spatial filter with radius: ${radiusInMeters}m`);
      
      queryBuilder.where(
        `ST_DWithin(
          vendor.location::geography,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radiusInMeters
        )`,
        { latitude, longitude, radiusInMeters }
      );
      
      // Add distance calculation - this might be the issue
      try {
        queryBuilder.addSelect(
          `ST_Distance(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          )`,
          'distance'
        );
        this.logger.debug('Distance selection added successfully');
      } catch (error) {
        this.logger.error('Error adding distance selection:', error);
        // Continue without distance if there's an issue
      }

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
        this.logger.debug('Applying monthly capacity filtering');
        queryBuilder.andWhere(() => {
          // Use a raw query to properly handle JSONB array contains operation
          return `(
            SELECT COUNT(ms.id)
            FROM monthly_subscriptions ms
            WHERE ms.vendor_ids @> CAST('[\"' || vendor.id || '\"]' AS jsonb)
            AND ms.status IN ('active', 'scheduled')
          ) < COALESCE(vendor.monthly_capacity, 50)`;
        });
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
    mealType?: string,
    query: QueryVendorDto = {},
    monthlyCapacityFilter = false,
  ): Promise<{
    data: VendorResponseDto[];
    meta: { total: number; pages: number };
  }> {
    try {
      const radiusInMeters = (query.radius || 10) * 1000;

      const queryBuilder = this.vendorRepository
        .createQueryBuilder('vendor')
        .leftJoinAndSelect('vendor.user', 'user')
        .leftJoinAndSelect('vendor.menus', 'menu')
        .where(
          `ST_DWithin(
            vendor.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radiusInMeters
          )`,
          { latitude, longitude, radiusInMeters },
        );

      // Only filter by mealType if provided
      if (mealType) {
        queryBuilder
          .andWhere('menu.mealType = :mealType', { mealType })
          .andWhere('menu.isActive = :isActive', { isActive: true });
      }

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
        queryBuilder.andWhere(() => {
          // Use a raw query to properly handle JSONB array contains operation
          return `(
            SELECT COUNT(ms.id)
            FROM monthly_subscriptions ms
            WHERE ms.vendor_ids @> CAST('[\"' || vendor.id || '\"]' AS jsonb)
            AND ms.status IN ('active', 'scheduled')
          ) < COALESCE(vendor.monthly_capacity, 50)`;
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
          // For distance sorting, we'll sort in memory after calculating
          break;
      }

      // Apply pagination
      const take = query.limit || 10;
      const skip = ((query.page || 1) - 1) * take;

      // Execute query
      const [allVendors, total] = await queryBuilder.getManyAndCount();

      // Calculate distance for each vendor in application layer
      const vendorsWithDistance = allVendors.map((vendor: any) => {
        let distance = 0;
        if (vendor.location && vendor.location.coordinates) {
          const [vendorLon, vendorLat] = vendor.location.coordinates;
          distance = this.calculateDistance(
            latitude,
            longitude,
            vendorLat,
            vendorLon,
          ) * 1000; // Convert to meters
        }
        return { ...vendor, distance };
      });

      // Sort by distance if needed
      if (!query.sortBy || query.sortBy === 'distance') {
        vendorsWithDistance.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
      }

      // Apply pagination after sorting
      const vendors = vendorsWithDistance.slice(skip, skip + take);

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
        name: vendor.user?.name || vendor.businessName,
        email: vendor.user?.email || '',
        phone: vendor.user?.phone || '',
        menus: vendor.menus
          ? vendor.menus.map((menu) => ({
              id: menu.id,
              vendorId: vendor.id,
              mealType: menu.mealType,
              description: menu.description,
              price: Number(menu.price),
              weeklyMenu: menu.weeklyMenu,
              isActive: menu.isActive,
              status: menu.status,
            }))
          : [],
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
      queryBuilder.andWhere(() => {
        // Use a raw query to properly handle JSONB array contains operation
        return `(
          SELECT COUNT(ms.id)
          FROM monthly_subscriptions ms
          WHERE ms.vendor_ids @> CAST('[\"' || vendor.id || '\"]' AS jsonb)
          AND ms.status IN ('active', 'scheduled')
        ) < COALESCE(vendor.monthly_capacity, 50)`;
      });

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
          WHERE ms.vendor_ids @> $1
          AND ms.status IN ('active', 'scheduled')
          AND ms.start_date <= $3
          AND ms.end_date >= $2
        `, [JSON.stringify([vendorId]), startDate, endDate]);

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
      WHERE ms.vendor_ids @> $1
      AND ms.status IN ('active', 'pending')
    `, [JSON.stringify([vendorId])]);

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

  /**
   * Get comprehensive dashboard statistics for a vendor
   */
  async getDashboardStats(vendorId: string): Promise<VendorDashboardStatsDto> {
    this.logger.debug(`Getting dashboard stats for vendor ${vendorId}`);

    const vendor = await this.findOne(vendorId);

    // Get date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Get total orders and revenue from subscriptions
    const totalStats = await this.vendorRepository.query(`
      SELECT
        COUNT(DISTINCT ms.id) as total_orders,
        COALESCE(SUM(ms.total_price), 0) as total_revenue
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
    `, [JSON.stringify([vendorId])]);

    // Get this week's stats
    const weekStats = await this.vendorRepository.query(`
      SELECT
        COUNT(DISTINCT ms.id) as orders_count,
        COALESCE(SUM(ms.total_price), 0) as revenue
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
      AND ms.created_at >= $2
    `, [JSON.stringify([vendorId]), startOfWeek]);

    // Get this month's stats
    const monthStats = await this.vendorRepository.query(`
      SELECT
        COUNT(DISTINCT ms.id) as orders_count,
        COALESCE(SUM(ms.total_price), 0) as revenue
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
      AND ms.created_at >= $2
    `, [JSON.stringify([vendorId]), startOfMonth]);

    // Get today's orders
    const todayStats = await this.vendorRepository.query(`
      SELECT COUNT(DISTINCT ms.id) as orders_count
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
      AND ms.created_at >= $2
    `, [JSON.stringify([vendorId]), startOfToday]);

    // Get active subscriptions
    const activeSubscriptions = await this.getCurrentMonthlyLoad(vendorId);

    // Get pending orders (subscriptions with pending status)
    const pendingStats = await this.vendorRepository.query(`
      SELECT COUNT(DISTINCT ms.id) as pending_count
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
      AND ms.status = 'pending'
    `, [JSON.stringify([vendorId])]);

    // Calculate available slots
    const monthlyCapacity = vendor.monthlyCapacity || 50;
    const availableSlots = monthlyCapacity - activeSubscriptions;

    // Calculate on-time delivery rate (placeholder - will need delivery tracking)
    // For now, use a default value
    const onTimeDeliveryRate = 95.0;

    return {
      totalOrders: parseInt(totalStats[0]?.total_orders || '0'),
      ordersThisWeek: parseInt(weekStats[0]?.orders_count || '0'),
      ordersThisMonth: parseInt(monthStats[0]?.orders_count || '0'),
      revenueThisWeek: parseFloat(weekStats[0]?.revenue || '0'),
      revenueThisMonth: parseFloat(monthStats[0]?.revenue || '0'),
      totalRevenue: parseFloat(totalStats[0]?.total_revenue || '0'),
      averageRating: Number(vendor.rating),
      deliveryRating: Number(vendor.deliveryRating),
      activeSubscriptions,
      pendingOrders: parseInt(pendingStats[0]?.pending_count || '0'),
      todaysOrders: parseInt(todayStats[0]?.orders_count || '0'),
      monthlyCapacity,
      availableSlots,
      onTimeDeliveryRate,
    };
  }

  /**
   * Get all subscriptions for a vendor with filtering and pagination
   */
  async getVendorSubscriptions(
    vendorId: string,
    query: QueryVendorSubscriptionsDto,
  ): Promise<VendorSubscriptionListResponseDto> {
    this.logger.debug(`Getting subscriptions for vendor ${vendorId}`, query);

    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build the query
    const subscriptionQuery = `
      SELECT
        ms.id,
        ms."userId",
        ms."mealType",
        ms.total_price,
        ms.start_date,
        ms.end_date,
        ms.status,
        ms.address_id,
        ms.created_at,
        u.name as customer_name,
        a.email as customer_email,
        a.phone as customer_phone
      FROM monthly_subscriptions ms
      INNER JOIN "user" u ON ms."userId" = u.id
      LEFT JOIN auth a ON u."authId" = a.id
      WHERE ms.vendor_ids @> $1
      ${status ? 'AND ms.status = $4' : ''}
      ORDER BY ms.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
      ${status ? 'AND ms.status = $2' : ''}
    `;

    const params = [JSON.stringify([vendorId]), limit, skip];
    const countParams = [JSON.stringify([vendorId])];

    if (status) {
      params.push(status);
      countParams.push(status);
    }

    const [subscriptions, countResult] = await Promise.all([
      this.vendorRepository.query(subscriptionQuery, params),
      this.vendorRepository.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult[0]?.total || '0');

    // Get delivery addresses for each subscription
    const data: VendorSubscriptionItemDto[] = await Promise.all(
      subscriptions.map(async (sub: any) => {
        // Fetch address details
        const addressResult = await this.vendorRepository.query(
          `SELECT address FROM user_addresses WHERE id = $1`,
          [sub.address_id],
        );

        return {
          id: sub.id,
          userId: sub.userId,
          customerName: sub.customer_name,
          customerEmail: sub.customer_email,
          customerPhone: sub.customer_phone,
          mealType: sub.mealType,
          totalPrice: parseFloat(sub.total_price),
          startDate: sub.start_date,
          endDate: sub.end_date,
          status: sub.status,
          deliveryAddress: addressResult[0]?.address || 'N/A',
          createdAt: sub.created_at,
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get vendor capacity information
   */
  async getVendorCapacity(vendorId: string): Promise<VendorCapacityDto> {
    this.logger.debug(`Getting capacity info for vendor ${vendorId}`);

    const vendor = await this.findOne(vendorId);
    const currentSubscriptions = await this.getCurrentMonthlyLoad(vendorId);
    const monthlyCapacity = vendor.monthlyCapacity || 50;
    const availableSlots = monthlyCapacity - currentSubscriptions;
    const utilizationPercentage = Math.round(
      (currentSubscriptions / monthlyCapacity) * 100,
    );

    return {
      currentSubscriptions,
      monthlyCapacity,
      availableSlots,
      utilizationPercentage,
    };
  }

  /**
   * Get revenue analytics for a vendor
   */
  async getRevenueAnalytics(
    vendorId: string,
    query: VendorAnalyticsQueryDto,
  ): Promise<VendorRevenueAnalyticsDto> {
    this.logger.debug(`Getting revenue analytics for vendor ${vendorId}`, query);

    // Set default date range if not provided
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Get revenue data points grouped by the specified interval
    const groupByClause =
      query.groupBy === 'week'
        ? "DATE_TRUNC('week', ms.created_at)"
        : query.groupBy === 'month'
        ? "DATE_TRUNC('month', ms.created_at)"
        : "DATE_TRUNC('day', ms.created_at)";

    const revenueData = await this.vendorRepository.query(
      `
      SELECT
        ${groupByClause}::date as date,
        COALESCE(SUM(ms.total_price), 0) as revenue,
        COUNT(ms.id) as order_count
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
        AND ms.created_at >= $2
        AND ms.created_at <= $3
      GROUP BY date
      ORDER BY date ASC
    `,
      [JSON.stringify([vendorId]), startDate, endDate],
    );

    // Calculate totals
    const totalRevenue = revenueData.reduce(
      (sum: number, item: any) => sum + parseFloat(item.revenue),
      0,
    );
    const totalOrders = revenueData.reduce(
      (sum: number, item: any) => sum + parseInt(item.order_count),
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const data: RevenueDataPointDto[] = revenueData.map((item: any) => ({
      date: item.date,
      revenue: parseFloat(item.revenue),
      orderCount: parseInt(item.order_count),
    }));

    return {
      data,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Get order analytics for a vendor
   */
  async getOrderAnalytics(
    vendorId: string,
    query: VendorAnalyticsQueryDto,
  ): Promise<VendorOrderAnalyticsDto> {
    this.logger.debug(`Getting order analytics for vendor ${vendorId}`, query);

    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Get orders by meal type
    const mealTypeData = await this.vendorRepository.query(
      `
      SELECT
        ms."mealType",
        COUNT(ms.id) as order_count
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
        AND ms.created_at >= $2
        AND ms.created_at <= $3
      GROUP BY ms."mealType"
      ORDER BY order_count DESC
    `,
      [JSON.stringify([vendorId]), startDate, endDate],
    );

    const totalOrders = mealTypeData.reduce(
      (sum: number, item: any) => sum + parseInt(item.order_count),
      0,
    );

    const ordersByMealType: PopularMealDto[] = mealTypeData.map((item: any) => ({
      mealType: item.mealType,
      orderCount: parseInt(item.order_count),
      percentage: (parseInt(item.order_count) / totalOrders) * 100,
    }));

    // Get peak order day
    const peakDayData = await this.vendorRepository.query(
      `
      SELECT
        TO_CHAR(ms.created_at, 'Day') as day_name,
        COUNT(ms.id) as order_count
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
        AND ms.created_at >= $2
        AND ms.created_at <= $3
      GROUP BY day_name
      ORDER BY order_count DESC
      LIMIT 1
    `,
      [JSON.stringify([vendorId]), startDate, endDate],
    );

    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const averageOrdersPerDay = daysDiff > 0 ? totalOrders / daysDiff : 0;

    return {
      totalOrders,
      ordersByMealType,
      averageOrdersPerDay: Math.round(averageOrdersPerDay * 10) / 10,
      peakOrderDay: peakDayData[0]?.day_name?.trim() || 'N/A',
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Get customer analytics for a vendor
   */
  async getCustomerAnalytics(
    vendorId: string,
    query: VendorAnalyticsQueryDto,
  ): Promise<CustomerAnalyticsDto> {
    this.logger.debug(`Getting customer analytics for vendor ${vendorId}`, query);

    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Get total unique customers in period
    const customerData = await this.vendorRepository.query(
      `
      SELECT
        COUNT(DISTINCT ms."userId") as total_customers,
        COUNT(DISTINCT CASE
          WHEN ms.created_at >= $2 THEN ms."userId"
        END) as new_customers
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
        AND ms.created_at <= $3
    `,
      [JSON.stringify([vendorId]), startDate, endDate],
    );

    const totalCustomers = parseInt(customerData[0]?.total_customers || '0');
    const newCustomers = parseInt(customerData[0]?.new_customers || '0');
    const returningCustomers = totalCustomers - newCustomers;

    // Calculate average subscription duration
    const durationData = await this.vendorRepository.query(
      `
      SELECT
        AVG(EXTRACT(DAY FROM (ms.end_date - ms.start_date))) as avg_duration
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
        AND ms.created_at >= $2
        AND ms.created_at <= $3
    `,
      [JSON.stringify([vendorId]), startDate, endDate],
    );

    const averageSubscriptionDuration = parseFloat(
      durationData[0]?.avg_duration || '0',
    );

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageSubscriptionDuration: Math.round(averageSubscriptionDuration),
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Get performance metrics for a vendor
   */
  async getPerformanceMetrics(
    vendorId: string,
    query: VendorAnalyticsQueryDto,
  ): Promise<PerformanceMetricsDto> {
    this.logger.debug(`Getting performance metrics for vendor ${vendorId}`, query);

    const vendor = await this.findOne(vendorId);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Get order fulfillment rate
    const fulfillmentData = await this.vendorRepository.query(
      `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN ms.status IN ('active', 'completed') THEN 1 END) as fulfilled
      FROM monthly_subscriptions ms
      WHERE ms.vendor_ids @> $1
        AND ms.created_at >= $2
        AND ms.created_at <= $3
    `,
      [JSON.stringify([vendorId]), startDate, endDate],
    );

    const total = parseInt(fulfillmentData[0]?.total || '0');
    const fulfilled = parseInt(fulfillmentData[0]?.fulfilled || '0');
    const orderFulfillmentRate = total > 0 ? (fulfilled / total) * 100 : 100;

    // On-time delivery rate (placeholder - needs delivery tracking)
    const onTimeDeliveryRate = 95.0;

    // Customer satisfaction from ratings
    const customerSatisfactionScore = Number(vendor.rating);

    return {
      onTimeDeliveryRate,
      orderFulfillmentRate: Math.round(orderFulfillmentRate * 10) / 10,
      customerSatisfactionScore,
      averageRating: Number(vendor.rating),
      totalRatings: vendor.totalRatings,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Upload profile or cover photo for a vendor
   * In production, this would upload to S3/cloud storage
   * For now, we'll store the file path or URL
   */
  async uploadPhoto(
    vendorId: string,
    file: Express.Multer.File,
    photoType: 'profile' | 'cover',
  ): Promise<{ photoUrl: string; photoType: string }> {
    this.logger.debug(`Uploading ${photoType} photo for vendor ${vendorId}`);

    const vendor = await this.findOne(vendorId);

    // In production, upload to S3 or cloud storage
    // For now, we'll use a placeholder URL with the filename
    const photoUrl = `/uploads/vendors/${vendorId}/${photoType}/${file.filename}`;

    // Update the vendor with the new photo URL
    if (photoType === 'profile') {
      vendor.profilePhotoUrl = photoUrl;
    } else {
      vendor.coverPhotoUrl = photoUrl;
    }

    await this.vendorRepository.save(vendor);

    this.logger.debug(`${photoType} photo uploaded successfully: ${photoUrl}`);

    return {
      photoUrl,
      photoType,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
