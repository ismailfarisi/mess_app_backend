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

  async findUserSubscriptions(
    userId: string,
    status?: SubscriptionStatus,
  ): Promise<MealSubscription[]> {
    const query = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.menu', 'menu')
      .leftJoinAndSelect('menu.vendor', 'vendor')
      .where('subscription.userId = :userId', { userId });

    if (status) {
      query.andWhere('subscription.status = :status', { status });
    }

    return await query.getMany();
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
