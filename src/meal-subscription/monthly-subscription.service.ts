import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MonthlySubscription } from './entities/monthly-subscription.entity';
import { MealSubscription } from './entities/meal-subscription.entity';
import { VendorsService } from '../vendors/vendors.service';
import { VendorMenuService } from '../vendor-menu/vendor-menu.service';
import { MealSubscriptionService } from './meal-subscription.service';
import {
  CreateMonthlySubscriptionDto,
  AvailableVendorsQueryDto,
  ValidateMonthlySelectionDto,
  MonthlyPreviewQueryDto,
  AvailableVendorsResponseDto,
  ValidationResultDto,
  MonthlyPreviewResponseDto,
  MonthlySubscriptionResponseDto,
} from './dto';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { MealType } from '../commons/enums/meal-type.enum';

/**
 * Service for managing monthly meal subscriptions
 * Handles complex business logic for multi-vendor subscriptions
 */
@Injectable()
export class MonthlySubscriptionService {
  private readonly logger = new Logger(MonthlySubscriptionService.name);
  private readonly TAX_RATE = 0.05; // 5% tax rate (configurable)
  private readonly MAX_VENDORS_PER_SUBSCRIPTION = 4;
  private readonly DELIVERY_RADIUS_KM = 50; // Service delivery radius

  constructor(
    @InjectRepository(MonthlySubscription)
    private monthlySubscriptionRepository: Repository<MonthlySubscription>,
    @InjectRepository(MealSubscription)
    private mealSubscriptionRepository: Repository<MealSubscription>,
    private vendorsService: VendorsService,
    private vendorMenuService: VendorMenuService,
    private mealSubscriptionService: MealSubscriptionService,
    private dataSource: DataSource,
  ) { }

  /**
   * Create a new monthly subscription with multiple vendors
   * @param userId - User creating the subscription
   * @param createDto - Subscription creation data
   * @returns Created monthly subscription
   */
  async createMonthlySubscription(
    userId: string,
    createDto: CreateMonthlySubscriptionDto,
  ): Promise<MonthlySubscriptionResponseDto> {
    this.logger.log(
      `Creating monthly subscription for user ${userId} with ${createDto.vendorIds.length} vendors`,
    );

    // Validate business rules
    await this.validateCreateRequest(userId, createDto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Calculate total pricing
      const pricingDetails = await this.calculateMonthlyPricing(
        createDto.vendorIds,
        createDto.mealType,
      );

      // Create individual meal subscriptions for each vendor
      const individualSubscriptions: MealSubscription[] = [];
      const individualSubscriptionIds: string[] = [];

      for (const vendorId of createDto.vendorIds) {
        const subscription = await this.createIndividualSubscription(
          userId,
          vendorId,
          createDto,
          queryRunner,
        );
        const savedSubscription = await queryRunner.manager.save(subscription);
        individualSubscriptions.push(savedSubscription);
        individualSubscriptionIds.push(savedSubscription.id);
      }

      // Calculate end date (4 weeks from start date)
      const startDate = new Date(createDto.startDate);
      const endDate = this.calculateEndDate(startDate);

      // Create monthly subscription record
      const monthlySubscription = queryRunner.manager.create(
        MonthlySubscription,
        {
          userId,
          vendorIds: createDto.vendorIds,
          individualSubscriptionIds,
          mealType: createDto.mealType,
          totalPrice: pricingDetails.finalPrice,
          startDate,
          endDate,
          status: SubscriptionStatus.ACTIVE,
          addressId: createDto.addressId,
          paymentId: createDto.paymentMethodId,
        },
      );

      const savedMonthlySubscription =
        await queryRunner.manager.save(monthlySubscription);

      // Update vendor capacities (future implementation)
      await this.updateVendorCapacities(createDto.vendorIds, queryRunner);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Monthly subscription ${savedMonthlySubscription.id} created successfully`,
      );

      return await this.formatMonthlySubscriptionResponse(savedMonthlySubscription);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create monthly subscription: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create subscription: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get available vendors for monthly subscriptions
   * @param query - Query parameters for vendor search
   * @returns Available vendors with capacity and menu info
   */
  async getAvailableVendors(
    query: AvailableVendorsQueryDto,
  ): Promise<AvailableVendorsResponseDto> {
    this.logger.log(
      `Fetching available vendors for ${query.mealType} in area: ${query.latitude}, ${query.longitude}`,
    );

    // Get vendors within delivery radius with active menus
    // Don't apply inner pagination since we filter by capacity afterward
    const vendorsResult =
      await this.vendorsService.findVendorsByLocationAndMealType(
        query.latitude,
        query.longitude,
        query.mealType,
        {
          radius: query.radius || this.DELIVERY_RADIUS_KM,
          page: 1,
          limit: 200, // Fetch a large batch; pagination is applied after filtering
          isOpen: true,
        },
      );

    // Filter vendors with available capacity for monthly subscriptions
    const availableVendors = [];
    for (const vendor of vendorsResult.data) {
      const hasCapacity = await this.checkVendorMonthlyCapacity(
        vendor.id,
        new Date(),
      );

      if (hasCapacity) {
        // Get menu information if available
        const menuItems = await this.vendorMenuService.findByVendor(
          vendor.id,
          query.mealType,
        );

        availableVendors.push({
          id: vendor.id,
          name: vendor.name,
          businessName: vendor.businessName,
          address: vendor.address,
          rating: vendor.rating,
          totalRatings: vendor.totalRatings,
          profilePhotoUrl: vendor.profilePhotoUrl,
          cuisineTypes: vendor.cuisineTypes,
          foodTypes: vendor.foodTypes,
          isOpen: vendor.isOpen,
          distance: vendor.distance,
          menuPreview: menuItems?.slice(0, 3) || [],
          availableSlots: await this.getVendorAvailableSlots(vendor.id),
        });
      }
    }

    // Apply pagination to filtered results
    const total = availableVendors.length;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const paginatedVendors = availableVendors.slice(offset, offset + limit);

    return {
      vendors: paginatedVendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      searchParams: {
        location: {
          latitude: query.latitude,
          longitude: query.longitude,
        },
        mealType: query.mealType,
        radius: query.radius || this.DELIVERY_RADIUS_KM,
      },
    };
  }

  /**
   * Validate monthly vendor selection
   * @param dto - Validation request data
   * @returns Validation result with detailed feedback
   */
  async validateMonthlySelection(
    dto: ValidateMonthlySelectionDto,
  ): Promise<ValidationResultDto> {
    this.logger.log(
      `Validating monthly selection for ${dto.vendorIds.length} vendors`,
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check vendor count limit
    if (dto.vendorIds.length > this.MAX_VENDORS_PER_SUBSCRIPTION) {
      errors.push(
        `Maximum ${this.MAX_VENDORS_PER_SUBSCRIPTION} vendors allowed per subscription`,
      );
    }

    // Check for duplicate vendors
    const uniqueVendors = new Set(dto.vendorIds);
    if (uniqueVendors.size !== dto.vendorIds.length) {
      errors.push('Duplicate vendors are not allowed');
    }

    // Validate each vendor
    const vendorValidations = await Promise.all(
      dto.vendorIds.map((vendorId) =>
        this.validateIndividualVendor(vendorId, dto),
      ),
    );

    vendorValidations.forEach((validation) => {
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    });

    // Check delivery schedule conflicts
    if (errors.length === 0) {
      const scheduleConflicts = await this.checkDeliveryScheduleConflicts(
        dto.vendorIds,
        dto.userLocation,
      );
      if (scheduleConflicts.length > 0) {
        warnings.push(...scheduleConflicts);
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      vendors: vendorValidations.map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        isAvailable: v.isAvailable,
        canDeliver: v.canDeliver,
        hasCapacity: v.hasCapacity,
        distance: v.distance,
        issues: v.issues,
      })),
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
      validatedAt: new Date(),
    };
  }

  /**
   * Get monthly subscription preview with pricing
   * @param query - Preview query parameters
   * @returns Preview with pricing and delivery details
   */
  async getMonthlyPreview(
    query: MonthlyPreviewQueryDto,
  ): Promise<MonthlyPreviewResponseDto> {
    this.logger.log(
      `Generating monthly preview for vendors: ${query.vendorIds}`,
    );

    const vendorIds = query.vendorIds.split(',').map((id) => id.trim());

    if (vendorIds.length > this.MAX_VENDORS_PER_SUBSCRIPTION) {
      throw new BadRequestException(
        `Maximum ${this.MAX_VENDORS_PER_SUBSCRIPTION} vendors allowed`,
      );
    }

    // Get vendor details and pricing
    const vendorDetails = await Promise.all(
      vendorIds.map(async (vendorId) => {
        const vendor = await this.vendorsService.findOne(vendorId);
        if (!vendor) {
          throw new NotFoundException(`Vendor ${vendorId} not found`);
        }

        const menuItems = await this.vendorMenuService.findByVendor(
          vendorId,
          query.mealType,
        );

        const weeklyPrice = this.calculateWeeklyPriceFromMenu(menuItems);

        return {
          vendor,
          weeklyPrice,
          menuItems,
        };
      }),
    );

    // Calculate pricing breakdown
    const subtotal = vendorDetails.reduce(
      (sum, detail) => sum + detail.weeklyPrice * 4, // 4 weeks
      0,
    );
    const taxAmount = subtotal * this.TAX_RATE;
    const deliveryFee = 0; // Currently free
    const totalPrice = subtotal + taxAmount + deliveryFee;

    // Generate delivery schedule (not used in current response format)
    // const deliverySchedule = await this.generateDeliverySchedule(
    //   vendorIds,
    //   new Date(query.startDate),
    // );

    const startDate = new Date(query.startDate);
    const endDate = this.calculateEndDate(startDate);

    return {
      subscription: {
        mealType: query.mealType,
        startDate: query.startDate,
        endDate: endDate.toISOString().split('T')[0],
        totalDeliveryDays: 28, // 4 weeks
        vendorCount: vendorIds.length,
        averageCostPerMeal: totalPrice / (28 * vendorIds.length),
      },
      vendorBreakdown: vendorDetails.map((detail) => ({
        vendorId: detail.vendor.id,
        vendorName: detail.vendor.businessName,
        costPerMeal: detail.weeklyPrice / 7, // Daily cost
        deliveryDays: 7, // 7 days per week
        totalCost: detail.weeklyPrice * 4,
        assignedDays: [1, 2, 3, 4, 5, 6, 7], // All days for simplicity
      })),
      costBreakdown: {
        subtotal,
        serviceFee: 0,
        deliveryFee,
        tax: taxAmount,
        discount: 0,
        total: totalPrice,
        currency: 'AED',
      },
      estimatedSavings: 0,
      savingsPercentage: 0,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    };
  }

  /**
   * Find monthly subscription by ID
   * @param userId - User ID
   * @param id - Monthly subscription ID
   * @returns Monthly subscription details
   */
  async findMonthlySubscription(
    userId: string,
    id: string,
  ): Promise<MonthlySubscriptionResponseDto> {
    this.logger.log(`Fetching monthly subscription ${id} for user ${userId}`);

    const subscription = await this.monthlySubscriptionRepository.findOne({
      where: { id, userId },
      relations: ['user'],
    });

    if (!subscription) {
      throw new NotFoundException(
        `Monthly subscription ${id} not found for user ${userId}`,
      );
    }

    return await this.formatMonthlySubscriptionResponse(subscription);
  }

  // Private helper methods

  private async validateCreateRequest(
    userId: string,
    createDto: CreateMonthlySubscriptionDto,
  ): Promise<void> {
    // Validate vendor count
    if (createDto.vendorIds.length > this.MAX_VENDORS_PER_SUBSCRIPTION) {
      throw new BadRequestException(
        `Maximum ${this.MAX_VENDORS_PER_SUBSCRIPTION} vendors allowed per subscription`,
      );
    }

    // Check for duplicate vendor IDs
    const uniqueVendorIds = new Set(createDto.vendorIds);
    if (uniqueVendorIds.size !== createDto.vendorIds.length) {
      throw new BadRequestException(
        'Duplicate vendor IDs are not allowed in a subscription',
      );
    }

    // Validate start date is in future
    const startDate = new Date(createDto.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new BadRequestException(
        'Start date must be today or a future date',
      );
    }

    // Validate all vendors exist and are available
    const vendorChecks = await Promise.all(
      createDto.vendorIds.map((vendorId) =>
        this.validateVendorAvailability(vendorId, createDto),
      ),
    );

    const failedVendors = vendorChecks.filter((check) => !check.isValid);
    if (failedVendors.length > 0) {
      throw new BadRequestException(
        `Invalid vendors: ${failedVendors.map((v) => v.reason).join(', ')}`,
      );
    }
  }

  private async validateVendorAvailability(
    vendorId: string,
    createDto: CreateMonthlySubscriptionDto,
  ): Promise<{ isValid: boolean; reason?: string }> {
    const vendor = await this.vendorsService.findOne(vendorId);
    if (!vendor) {
      return { isValid: false, reason: `Vendor ${vendorId} not found` };
    }

    if (!vendor.isOpen) {
      return {
        isValid: false,
        reason: `Vendor ${vendor.businessName} is inactive`,
      };
    }

    // Check if vendor serves the requested meal type
    const menuItems = await this.vendorMenuService.findByVendor(
      vendorId,
      createDto.mealType,
    );
    if (!menuItems || menuItems.length === 0) {
      return {
        isValid: false,
        reason: `Vendor ${vendor.businessName} doesn't serve ${createDto.mealType}`,
      };
    }

    // Check vendor capacity
    const hasCapacity = await this.checkVendorMonthlyCapacity(
      vendorId,
      new Date(createDto.startDate),
    );
    if (!hasCapacity) {
      return {
        isValid: false,
        reason: `Vendor ${vendor.businessName} is fully booked for the requested period`,
      };
    }

    return { isValid: true };
  }

  private async calculateMonthlyPricing(
    vendorIds: string[],
    mealType: MealType,
  ): Promise<{
    totalPrice: number;
    taxAmount: number;
    finalPrice: number;
  }> {
    const vendorPrices = await Promise.all(
      vendorIds.map(async (vendorId) => {
        const menuItems = await this.vendorMenuService.findByVendor(
          vendorId,
          mealType,
        );
        return this.calculateWeeklyPriceFromMenu(menuItems);
      }),
    );

    const monthlySubtotal = vendorPrices.reduce(
      (sum, weeklyPrice) => sum + weeklyPrice * 4,
      0,
    );
    const taxAmount = monthlySubtotal * this.TAX_RATE;
    const finalPrice = monthlySubtotal + taxAmount;

    return {
      totalPrice: monthlySubtotal,
      taxAmount,
      finalPrice,
    };
  }

  private async createIndividualSubscription(
    userId: string,
    vendorId: string,
    createDto: CreateMonthlySubscriptionDto,
    queryRunner: any,
  ): Promise<MealSubscription> {
    // Get vendor's menu for pricing
    const menuItems = await this.vendorMenuService.findByVendor(
      vendorId,
      createDto.mealType,
    );
    const weeklyPrice = this.calculateWeeklyPriceFromMenu(menuItems);

    const subscriptionData: Partial<MealSubscription> = {
      userId,
      vendorId,
      mealType: createDto.mealType,
      startDate: new Date(createDto.startDate),
      endDate: this.calculateEndDate(new Date(createDto.startDate)),
      price: weeklyPrice * 4, // 4 weeks
      status: SubscriptionStatus.ACTIVE,
    };

    // Look up the active menu for this vendor and meal type to set menuId
    if (menuItems && menuItems.length > 0) {
      subscriptionData.menuId = menuItems[0].id;
    }

    return queryRunner.manager.create(MealSubscription, subscriptionData);
  }

  private calculateEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 28); // 4 weeks
    return endDate;
  }

  private async updateVendorCapacities(
    vendorIds: string[],
    queryRunner: any,
  ): Promise<void> {
    // Increment totalOrders for each vendor in the subscription
    for (const vendorId of vendorIds) {
      await queryRunner.manager.increment(
        'Vendor',
        { id: vendorId },
        'totalOrders',
        1,
      );
    }
    this.logger.log(`Updated capacity for ${vendorIds.length} vendors`);
  }

  private async checkVendorMonthlyCapacity(
    vendorId: string,
    startDate: Date,
  ): Promise<boolean> {
    // Query actual active+pending monthly subscriptions for this vendor
    const vendor = await this.vendorsService.findOne(vendorId);
    if (!vendor) return false;

    const monthlyCapacity = vendor.monthlyCapacity || 50;

    const result = await this.monthlySubscriptionRepository.query(
      `SELECT COUNT(*) as count
       FROM monthly_subscriptions ms
       WHERE ms.vendor_ids @> $1
       AND ms.status IN ('active', 'pending')
       AND ms.end_date >= $2`,
      [JSON.stringify([vendorId]), startDate],
    );

    const currentLoad = parseInt(result[0]?.count || '0');
    return currentLoad < monthlyCapacity;
  }

  private async getVendorAvailableSlots(
    vendorId: string,
  ): Promise<number> {
    const vendor = await this.vendorsService.findOne(vendorId);
    if (!vendor) return 0;

    const monthlyCapacity = vendor.monthlyCapacity || 50;

    const result = await this.monthlySubscriptionRepository.query(
      `SELECT COUNT(*) as count
       FROM monthly_subscriptions ms
       WHERE ms.vendor_ids @> $1
       AND ms.status IN ('active', 'pending')`,
      [JSON.stringify([vendorId])],
    );

    const currentLoad = parseInt(result[0]?.count || '0');
    return Math.max(0, monthlyCapacity - currentLoad);
  }

  private async validateIndividualVendor(
    vendorId: string,
    dto: ValidateMonthlySelectionDto,
  ): Promise<{
    vendorId: string;
    vendorName: string;
    isAvailable: boolean;
    canDeliver: boolean;
    hasCapacity: boolean;
    distance: number;
    issues: string[];
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const issues: string[] = [];
    let vendorName = '';
    let isAvailable = false;
    let canDeliver = false;
    let hasCapacity = false;
    let distance = 0;

    try {
      const vendor = await this.vendorsService.findOne(vendorId);
      if (!vendor) {
        errors.push(`Vendor ${vendorId} not found`);
        issues.push('Vendor not found');
        return {
          vendorId,
          vendorName,
          isAvailable,
          canDeliver,
          hasCapacity,
          distance,
          issues,
          errors,
          warnings,
        };
      }

      vendorName = vendor.businessName;

      if (!vendor.isOpen) {
        errors.push(`Vendor ${vendor.businessName} is currently inactive`);
        issues.push('Vendor inactive');
      } else {
        isAvailable = true;
      }

      // Check distance from user location
      if (dto.userLocation) {
        distance = this.calculateDistanceBetweenPoints(
          dto.userLocation.latitude,
          dto.userLocation.longitude,
          vendor.location.coordinates[1], // latitude
          vendor.location.coordinates[0], // longitude
        );

        if (distance <= this.DELIVERY_RADIUS_KM) {
          canDeliver = true;
        } else {
          errors.push(
            `Vendor ${vendor.businessName} is outside delivery radius (${distance.toFixed(1)}km)`,
          );
          issues.push(`Outside delivery radius (${distance.toFixed(1)}km)`);
        }
      }

      // Check vendor capacity
      hasCapacity = await this.checkVendorMonthlyCapacity(
        vendorId,
        new Date(dto.startDate),
      );

      if (!hasCapacity) {
        warnings.push(`Vendor ${vendor.businessName} has limited availability`);
        issues.push('Limited availability');
      }
    } catch (error) {
      errors.push(`Error validating vendor ${vendorId}: ${error.message}`);
      issues.push('Validation error');
    }

    return {
      vendorId,
      vendorName,
      isAvailable,
      canDeliver,
      hasCapacity,
      distance,
      issues,
      errors,
      warnings,
    };
  }

  private async checkDeliveryScheduleConflicts(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _vendorIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userLocation?: { latitude: number; longitude: number },
  ): Promise<string[]> {
    // Implementation would check for delivery time conflicts
    // For now, return empty array (no conflicts)
    return [];
  }

  private async calculateCoverageArea(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _vendorIds: string[],
  ): Promise<number> {
    // Implementation would calculate the geographical coverage area
    // For now, return a placeholder value
    return this.DELIVERY_RADIUS_KM;
  }

  private async generateDeliverySchedule(
    vendorIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _startDate: Date,
  ): Promise<any[]> {
    // Implementation would generate weekly delivery schedule
    // For now, return a simple schedule
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    return vendorIds.map((vendorId, index) => ({
      vendorId,
      dayOfWeek: (index % 7) + 1,
      dayName: days[index % 7],
      timeSlot: '12:00-14:00',
    }));
  }

  private calculateWeeklyPriceFromMenu(menuItems: any[]): number {
    if (!menuItems || menuItems.length === 0) return 0;

    // Calculate average weekly price based on menu items
    // Assuming each menu item has a price and we need 7 meals per week
    const averageItemPrice =
      menuItems.reduce((sum, item) => sum + (item.price || 25), 0) /
      menuItems.length;
    return averageItemPrice * 7; // 7 meals per week
  }

  private calculateDistanceBetweenPoints(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async formatMonthlySubscriptionResponse(
    subscription: MonthlySubscription,
  ): Promise<MonthlySubscriptionResponseDto> {
    // Fetch real vendor data for the response
    const vendorData = await Promise.all(
      subscription.vendorIds.map(async (vendorId, index) => {
        try {
          const vendor = await this.vendorsService.findOne(vendorId);
          return {
            id: vendorId,
            name: vendor?.businessName || `Vendor ${index + 1}`,
            logo: vendor?.profilePhotoUrl || null,
            rating: Number(vendor?.rating) || 0,
            cuisine: vendor?.cuisineTypes?.join(', ') || 'Various',
            deliveryDays: [1, 2, 3, 4, 5],
          };
        } catch {
          return {
            id: vendorId,
            name: `Vendor ${index + 1}`,
            logo: null,
            rating: 0,
            cuisine: 'Various',
            deliveryDays: [1, 2, 3, 4, 5],
          };
        }
      }),
    );

    return {
      id: subscription.id,
      userId: subscription.userId,
      vendors: vendorData,
      mealType: subscription.mealType,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
      deliveryAddress: {
        id: subscription.addressId,
        address: subscription.addressId,
        coordinates: { latitude: 0, longitude: 0 },
      },
      deliverySchedule: subscription.vendorIds.map((vendorId, index) => {
        const vendorInfo = vendorData.find(v => v.id === vendorId);
        return {
          vendorId,
          vendorName: vendorInfo?.name || `Vendor ${index + 1}`,
          dayOfWeek: (index % 7) + 1,
          dayName: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ][index % 7],
          estimatedDeliveryTime: '12:00-14:00',
        };
      }),
      paymentSummary: {
        totalAmount: subscription.totalPrice,
        costPerVendorPerDay:
          subscription.totalPrice / (28 * subscription.vendorIds.length),
        totalDeliveryDays: 28,
        serviceFee: 0,
        deliveryFee: 0,
        taxes: subscription.totalPrice * this.TAX_RATE,
        currency: 'AED',
      },
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Cancel a monthly subscription
   * @param userId - User ID
   * @param subscriptionId - Monthly subscription ID
   * @returns Updated subscription
   */
  async cancelMonthlySubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<MonthlySubscriptionResponseDto> {
    this.logger.log(
      `Cancelling monthly subscription ${subscriptionId} for user ${userId}`,
    );

    const subscription = await this.monthlySubscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Monthly subscription ${subscriptionId} not found`,
      );
    }

    if (
      subscription.status === SubscriptionStatus.CANCELLED ||
      subscription.status === SubscriptionStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot cancel a subscription with status: ${subscription.status}`,
      );
    }

    // Update the monthly subscription status
    subscription.status = SubscriptionStatus.CANCELLED;
    await this.monthlySubscriptionRepository.save(subscription);

    // Cancel all individual subscriptions
    if (
      subscription.individualSubscriptionIds &&
      subscription.individualSubscriptionIds.length > 0
    ) {
      await this.mealSubscriptionRepository
        .createQueryBuilder()
        .update(MealSubscription)
        .set({ status: SubscriptionStatus.CANCELLED })
        .whereInIds(subscription.individualSubscriptionIds)
        .execute();
    }

    this.logger.log(
      `Successfully cancelled monthly subscription ${subscriptionId}`,
    );

    return this.formatMonthlySubscriptionResponse(subscription);
  }
}
