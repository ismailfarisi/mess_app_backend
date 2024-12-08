import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { MealSubscription } from './entities/meal-subscription.entity';
import { VendorMenuService } from '../vendor-menu/vendor-menu.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import {
  SubscriptionResponseDto,
  SubscriptionsResponseDto,
} from './dto/subscription-response.dto';

@Injectable()
export class MealSubscriptionService {
  constructor(
    @InjectRepository(MealSubscription)
    private readonly subscriptionRepository: Repository<MealSubscription>,
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
}
