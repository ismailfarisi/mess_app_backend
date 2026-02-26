import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { VendorMenu } from './entities/vendor-menu.entity';
import { VendorsService } from '../vendors/vendors.service';
import { CreateVendorMenuDto } from './dto/create-vendor-menu.dto';
import { UpdateVendorMenuDto } from './dto/update-vendor-menu.dto';
import { QueryVendorMenuDto } from './dto/query-vendor-menu.dto';
import { VendorMenuResponseDto } from './dto/vendor-menu-response.dto';
import { MealType } from 'src/commons/enums/meal-type.enum';
import { VendorMenuStatus } from 'src/commons/enums/vendor-menu-status.enum';

@Injectable()
export class VendorMenuService {
  constructor(
    @InjectRepository(VendorMenu)
    private readonly vendorMenuRepository: Repository<VendorMenu>,
    private readonly vendorsService: VendorsService,
  ) { }

  async create(createDto: CreateVendorMenuDto): Promise<VendorMenu> {
    await this.validateVendor(createDto.vendorId);
    await this.checkDuplicateMenu(createDto.vendorId, createDto.mealType);

    const menu = this.vendorMenuRepository.create(createDto);
    return await this.vendorMenuRepository.save(menu);
  }

  async findAll(queryDto: QueryVendorMenuDto): Promise<[VendorMenu[], number]> {
    const query = this.vendorMenuRepository
      .createQueryBuilder('vendorMenu')
      .leftJoinAndSelect('vendorMenu.vendor', 'vendor');

    if (queryDto.vendorId) {
      query.andWhere('vendorMenu.vendorId = :vendorId', {
        vendorId: queryDto.vendorId,
      });
    }

    if (queryDto.mealType) {
      query.andWhere('vendorMenu.mealType = :mealType', {
        mealType: queryDto.mealType,
      });
    }

    if (queryDto.isActive !== undefined) {
      query.andWhere('vendorMenu.status = :status', {
        status: queryDto.isActive
          ? VendorMenuStatus.ACTIVE
          : VendorMenuStatus.INACTIVE,
      });
    }

    if (queryDto.startDate && queryDto.endDate) {
      query.andWhere('vendorMenu.createdAt BETWEEN :startDate AND :endDate', {
        startDate: queryDto.startDate,
        endDate: queryDto.endDate,
      });
    }

    query.skip((queryDto.page - 1) * queryDto.limit).take(queryDto.limit);

    return await query.getManyAndCount();
  }

  async findOne(id: string): Promise<VendorMenuResponseDto> {
    const menu = await this.vendorMenuRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    return plainToClass(VendorMenuResponseDto, menu, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateDto: UpdateVendorMenuDto,
  ): Promise<VendorMenuResponseDto> {
    const menuEntity = await this.vendorMenuRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });

    if (!menuEntity) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    Object.assign(menuEntity, updateDto);
    const updatedMenu = await this.vendorMenuRepository.save(menuEntity);

    return plainToClass(VendorMenuResponseDto, updatedMenu, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.vendorMenuRepository.softDelete(id);
  }

  async findByVendor(
    vendorId: string,
    mealType?: MealType,
  ): Promise<VendorMenuResponseDto[]> {
    const menus = await this.vendorMenuRepository.find({
      where: {
        vendorId,
        ...(mealType && { mealType }),
        status: VendorMenuStatus.ACTIVE,
      },
      relations: ['vendor'],
    });

    return plainToClass(VendorMenuResponseDto, menus, {
      excludeExtraneousValues: true,
    });
  }

  async findAvailable(mealType?: MealType): Promise<VendorMenuResponseDto[]> {
    const query = this.vendorMenuRepository
      .createQueryBuilder('vendorMenu')
      .leftJoinAndSelect('vendorMenu.vendor', 'vendor')
      .where('vendorMenu.status = :status', {
        status: VendorMenuStatus.ACTIVE,
      });

    if (mealType) {
      query.andWhere('vendorMenu.mealType = :mealType', { mealType });
    }

    const menus = await query.getMany();

    return plainToClass(VendorMenuResponseDto, menus, {
      excludeExtraneousValues: true,
    });
  }

  private async validateVendor(vendorId: string): Promise<void> {
    const vendor = await this.vendorsService.findOne(vendorId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }
  }

  private async checkDuplicateMenu(
    vendorId: string,
    mealType: MealType,
  ): Promise<void> {
    const existingMenu = await this.vendorMenuRepository.findOne({
      where: { vendorId, mealType, status: VendorMenuStatus.ACTIVE },
    });

    if (existingMenu) {
      throw new ConflictException(
        `Active menu for ${mealType} already exists for this vendor`,
      );
    }
  }

  /**
   * Get active menus for multiple vendors and specific meal type
   * Used for monthly subscriptions
   * @param vendorIds - Array of vendor IDs
   * @param mealType - Meal type to filter by
   * @returns Array of vendor menus
   */
  async findMenusForMonthlySubscription(
    vendorIds: string[],
    mealType: MealType,
  ): Promise<VendorMenu[]> {
    if (vendorIds.length === 0) {
      return [];
    }

    return await this.vendorMenuRepository.find({
      where: {
        vendorId: In(vendorIds),
        mealType,
        status: VendorMenuStatus.ACTIVE,
      },
      relations: ['vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Validate menu availability for monthly subscription period
   * @param vendorIds - Array of vendor IDs
   * @param mealType - Meal type
   * @param startDate - Start date of subscription
   * @param endDate - End date of subscription
   * @returns Validation results for each vendor
   */
  async validateMenusForMonthly(
    vendorIds: string[],
    mealType: MealType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _startDate: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _endDate: Date,
  ): Promise<
    Array<{
      vendorId: string;
      menuId: string;
      isValid: boolean;
      issues: string[];
    }>
  > {
    const results = [];

    for (const vendorId of vendorIds) {
      const issues: string[] = [];
      let isValid = true;
      let menuId = '';

      try {
        // Find active menu for this vendor and meal type
        const menu = await this.vendorMenuRepository.findOne({
          where: {
            vendorId,
            mealType,
            status: VendorMenuStatus.ACTIVE,
          },
          relations: ['vendor'],
        });

        if (!menu) {
          isValid = false;
          issues.push(
            `No active ${mealType} menu found for vendor ${vendorId}`,
          );
        } else {
          menuId = menu.id;

          // Check if vendor is active
          if (!menu.vendor?.isOpen) {
            isValid = false;
            issues.push('Vendor is currently inactive');
          }

          // Validate menu has content
          if (!menu.weeklyMenu || Object.keys(menu.weeklyMenu).length === 0) {
            issues.push('Menu has no weekly meal items defined');
          }

          // Check pricing
          if (!menu.price || menu.price <= 0) {
            isValid = false;
            issues.push('Menu has invalid pricing');
          }

          // Future: Additional validations for subscription period
          // - Check if vendor accepts subscriptions during this period
          // - Verify delivery schedule compatibility
          // - Check capacity constraints
        }
      } catch (error: any) {
        isValid = false;
        issues.push(`Error validating menu: ${error.message}`);
      }

      results.push({
        vendorId,
        menuId,
        isValid,
        issues,
      });
    }

    return results;
  }

  /**
   * Get bulk menu details for monthly subscription preview
   * @param vendorIds - Array of vendor IDs
   * @param mealType - Meal type
   * @returns Detailed menu information for preview
   */
  async getBulkMenusForPreview(
    vendorIds: string[],
    mealType: MealType,
  ): Promise<
    Array<{
      vendorId: string;
      menu: VendorMenuResponseDto | null;
      weeklyPrice: number;
      availableItems: number;
    }>
  > {
    const results = [];

    for (const vendorId of vendorIds) {
      try {
        const menus = await this.findByVendor(vendorId, mealType);
        const menu = menus.length > 0 ? menus[0] : null;

        let weeklyPrice = 0;
        let availableItems = 0;

        if (menu) {
          weeklyPrice = Number(menu.price || 0) * 7; // 7 days per week
          if (menu.weeklyMenu) {
            availableItems = Object.values(menu.weeklyMenu).reduce(
              (total, dayMenu: any) => total + (dayMenu?.items?.length || 0),
              0,
            );
          }
        }

        results.push({
          vendorId,
          menu,
          weeklyPrice,
          availableItems,
        });
      } catch {
        results.push({
          vendorId,
          menu: null,
          weeklyPrice: 0,
          availableItems: 0,
        });
      }
    }

    return results;
  }

  /**
   * Check if vendors have capacity for monthly subscriptions
   * @param vendorIds - Array of vendor IDs
   * @param mealType - Meal type
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Capacity check results
   */
  async checkVendorMenuCapacityForMonthly(
    vendorIds: string[],
    mealType: MealType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _startDate: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _endDate: Date,
  ): Promise<
    Array<{
      vendorId: string;
      hasCapacity: boolean;
      maxCapacity: number;
      currentLoad: number;
    }>
  > {
    const results = [];

    for (const vendorId of vendorIds) {
      try {
        // Find active menu
        const menu = await this.vendorMenuRepository.findOne({
          where: {
            vendorId,
            mealType,
            status: VendorMenuStatus.ACTIVE,
          },
          relations: ['vendor'],
        });

        let hasCapacity = false;
        let maxCapacity = 0;
        let currentLoad = 0;

        if (menu && menu.vendor) {
          maxCapacity = menu.vendor.monthlyCapacity || 50;
          hasCapacity = menu.vendor.isOpen;

          // Query actual current load from monthly subscriptions
          try {
            const loadResult = await this.vendorMenuRepository.query(
              `SELECT COUNT(*) as count
               FROM monthly_subscriptions ms
               WHERE ms.vendor_ids @> $1
               AND ms.status IN ('active', 'pending')`,
              [JSON.stringify([vendorId])],
            );
            currentLoad = parseInt(loadResult[0]?.count || '0');
            hasCapacity = hasCapacity && currentLoad < maxCapacity;
          } catch {
            // If query fails, fall back to vendor.isOpen check
          }
        }

        results.push({
          vendorId,
          hasCapacity,
          maxCapacity,
          currentLoad,
        });
      } catch {
        results.push({
          vendorId,
          hasCapacity: false,
          maxCapacity: 0,
          currentLoad: 0,
        });
      }
    }

    return results;
  }
}
