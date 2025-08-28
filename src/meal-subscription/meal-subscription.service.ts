import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, QueryRunner } from 'typeorm';
import { MealSubscription } from './entities/meal-subscription.entity';
import { MonthlySubscription } from './entities/monthly-subscription.entity';
import { VendorMenuService } from '../vendor-menu/vendor-menu.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { MealType } from '../commons/enums/meal-type.enum';
import {
  SubscriptionResponseDto,
  SubscriptionsResponseDto,
} from './dto/subscription-response.dto';

@Injectable()
export class MealSubscriptionService {
  private readonly logger = new Logger(MealSubscriptionService.name);

  constructor(
    @InjectRepository(MealSubscription)
    private readonly subscriptionRepository: Repository<MealSubscription>,
    @InjectRepository(MonthlySubscription)
    private readonly monthlySubscriptionRepository: Repository<MonthlySubscription>,
    private readonly vendorMenuService: VendorMenuService,
  ) {}

  async create(
    userId: string,
    createDto: CreateSubscriptionDto,
  ): Promise<MealSubscription> {
    const menu = await this.vendorMenuService.findOne(createDto.menuId);

    if (menu.vendorId !== createDto.vendorId) {
      throw new BadRequestException(
        'Menu does not belong to the specified vendor',
      );
    }

    const subscription = this.subscriptionRepository.create({
      ...createDto,
      userId,
      price: menu.price,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  private mapToResponseDto(
    subscription: MealSubscription,
  ): SubscriptionResponseDto {
    const weekday = new Date().toLocaleDateString().slice(0, 3) + 'day';
    return {
      id: subscription.id,
      mealType: subscription.mealType,
      status: subscription.status,
      price: Number(subscription.price),
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      vendorName: subscription.menu.vendor.user.name,
      vendorBusinessName: subscription.menu.vendor.businessName,
      vendorAddress: subscription.menu.vendor.address,
      vendorRating: Number(subscription.menu.vendor.rating),
      menuDescription: subscription.menu.description,
      currentDayMenu: subscription.menu.weeklyMenu[weekday]?.items || [],
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  async findUserSubscriptions(
    userId: string,
    query: QuerySubscriptionDto,
  ): Promise<SubscriptionsResponseDto> {
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.menu', 'menu')
      .leftJoinAndSelect('menu.vendor', 'vendor')
      .where('subscription.userId = :userId', { userId });

    // Apply filters
    if (query.status) {
      queryBuilder.andWhere('subscription.status = :status', {
        status: query.status,
      });
    }

    if (query.mealType) {
      queryBuilder.andWhere('subscription.mealType = :mealType', {
        mealType: query.mealType,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere(
        'subscription.startDate BETWEEN :startDate AND :endDate',
        {
          startDate: query.startDate,
          endDate: query.endDate,
        },
      );
    }

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const take = query.limit || 10;
    const skip = ((query.page || 1) - 1) * take;
    queryBuilder.skip(skip).take(take);

    // Order by creation date
    queryBuilder.orderBy('subscription.createdAt', 'DESC');

    // Execute query
    const subscriptions = await queryBuilder.getMany();

    // Map to response DTOs
    const mappedSubscriptions = subscriptions.map((subscription) =>
      this.mapToResponseDto(subscription),
    );

    return {
      data: mappedSubscriptions,
      meta: {
        total,
        pages: Math.ceil(total / take),
        currentPage: query.page || 1,
        perPage: take,
      },
    };
  }

  async getCurrentSubscriptions(
    userId: string,
    query: QuerySubscriptionDto,
  ): Promise<SubscriptionsResponseDto> {
    return this.findUserSubscriptions(userId, {
      ...query,
      status: SubscriptionStatus.ACTIVE,
    });
  }

  async update(
    userId: string,
    subscriptionId: string,
    updateDto: UpdateSubscriptionDto,
  ): Promise<MealSubscription> {
    const subscription = await this.findOne(userId, subscriptionId);

    // Check if subscription is part of a monthly subscription
    if (subscription.monthlySubscriptionId) {
      const monthlySubscription =
        await this.monthlySubscriptionRepository.findOne({
          where: { id: subscription.monthlySubscriptionId },
        });

      if (monthlySubscription) {
        // Prevent updates that would break monthly subscription integrity
        if (updateDto.status === SubscriptionStatus.CANCELLED) {
          throw new BadRequestException(
            'Cannot cancel individual subscription that is part of a monthly subscription. Cancel the monthly subscription instead.',
          );
        }

        // Note: UpdateSubscriptionDto doesn't have date fields in current implementation
        // This is a placeholder for future enhancement when date updates are supported
      }
    }

    if (updateDto.status === SubscriptionStatus.CANCELLED) {
      const today = new Date();
      if (subscription.endDate < today) {
        throw new BadRequestException('Cannot cancel an expired subscription');
      }
    }

    Object.assign(subscription, updateDto);
    return await this.subscriptionRepository.save(subscription);
  }

  async findOne(userId: string, id: string): Promise<MealSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, userId },
      relations: ['menu', 'menu.vendor'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found`);
    }

    return subscription;
  }

  async checkAndUpdateExpiredSubscriptions(): Promise<void> {
    const today = new Date();
    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        endDate: LessThan(today),
        status: SubscriptionStatus.ACTIVE,
      },
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(subscription);
    }
  }
  /**
   * Create individual subscriptions for monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param vendorSubscriptions - Array of vendor subscription data
   * @returns Created meal subscriptions
   */
  async createSubscriptionsForMonthly(
    monthlySubscriptionId: string,
    vendorSubscriptions: Array<{
      vendorId: string;
      menuId: string;
      userId: string;
      mealType: MealType;
      startDate: Date;
      endDate: Date;
      price: number;
    }>,
    queryRunner?: QueryRunner,
  ): Promise<MealSubscription[]> {
    this.logger.log(
      `Creating ${vendorSubscriptions.length} individual subscriptions for monthly subscription ${monthlySubscriptionId}`,
    );

    const subscriptions: MealSubscription[] = [];
    const repository = queryRunner
      ? queryRunner.manager.getRepository(MealSubscription)
      : this.subscriptionRepository;

    for (const vendorSub of vendorSubscriptions) {
      // Validate menu belongs to vendor
      const menu = await this.vendorMenuService.findOne(vendorSub.menuId);
      if (menu.vendorId !== vendorSub.vendorId) {
        throw new BadRequestException(
          `Menu ${vendorSub.menuId} does not belong to vendor ${vendorSub.vendorId}`,
        );
      }

      const subscription = repository.create({
        ...vendorSub,
        monthlySubscriptionId,
        status: SubscriptionStatus.ACTIVE,
      });

      const savedSubscription = await repository.save(subscription);
      subscriptions.push(savedSubscription);
    }

    this.logger.log(
      `Successfully created ${subscriptions.length} individual subscriptions`,
    );

    return subscriptions;
  }

  /**
   * Find individual subscriptions by monthly subscription ID
   * @param monthlySubscriptionId - Monthly subscription ID
   * @returns Array of meal subscriptions
   */
  async findByMonthlySubscriptionId(
    monthlySubscriptionId: string,
  ): Promise<MealSubscription[]> {
    return await this.subscriptionRepository.find({
      where: { monthlySubscriptionId },
      relations: ['menu', 'menu.vendor', 'vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update subscriptions status for monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param status - New status
   * @param queryRunner - Optional query runner for transactions
   */
  async updateSubscriptionsStatusForMonthly(
    monthlySubscriptionId: string,
    status: SubscriptionStatus,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.log(
      `Updating status to ${status} for all subscriptions in monthly subscription ${monthlySubscriptionId}`,
    );

    const repository = queryRunner
      ? queryRunner.manager.getRepository(MealSubscription)
      : this.subscriptionRepository;

    await repository.update({ monthlySubscriptionId }, { status });

    this.logger.log(`Status updated successfully`);
  }

  /**
   * Get subscription statistics for monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @returns Statistics object
   */
  async getMonthlySubscriptionStats(monthlySubscriptionId: string): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalValue: number;
    vendorCount: number;
  }> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { monthlySubscriptionId },
    });

    const activeSubscriptions = subscriptions.filter(
      (sub) => sub.status === SubscriptionStatus.ACTIVE,
    );

    const totalValue = subscriptions.reduce(
      (sum, sub) => sum + Number(sub.price),
      0,
    );

    const vendorCount = new Set(subscriptions.map((sub) => sub.vendorId)).size;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      totalValue,
      vendorCount,
    };
  }

  /**
   * Check if user has conflicting subscriptions for the given period
   * @param userId - User ID
   * @param vendorIds - Vendor IDs to check
   * @param startDate - Start date
   * @param endDate - End date
   * @param mealType - Meal type
   * @returns Conflicting subscriptions
   */
  async checkConflictingSubscriptions(
    userId: string,
    vendorIds: string[],
    startDate: Date,
    endDate: Date,
    mealType: MealType,
  ): Promise<MealSubscription[]> {
    return await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.userId = :userId', { userId })
      .andWhere('subscription.vendorId IN (:...vendorIds)', { vendorIds })
      .andWhere('subscription.mealType = :mealType', { mealType })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .andWhere(
        '(subscription.startDate <= :endDate AND subscription.endDate >= :startDate)',
        { startDate, endDate },
      )
      .getMany();
  }

  /**
   * Validate monthly subscription constraints
   * @param userId - User ID
   * @param vendorIds - Vendor IDs
   * @param startDate - Start date
   * @param endDate - End date
   * @param mealType - Meal type
   * @returns Validation result
   */
  async validateMonthlySubscriptionConstraints(
    userId: string,
    vendorIds: string[],
    startDate: Date,
    endDate: Date,
    mealType: MealType,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for conflicting subscriptions
    const conflicts = await this.checkConflictingSubscriptions(
      userId,
      vendorIds,
      startDate,
      endDate,
      mealType,
    );

    if (conflicts.length > 0) {
      errors.push(
        `You already have active subscriptions for ${conflicts.length} of the selected vendors during this period`,
      );
    }

    // Check for duplicate vendors
    const uniqueVendors = new Set(vendorIds);
    if (uniqueVendors.size !== vendorIds.length) {
      errors.push('Duplicate vendors are not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
