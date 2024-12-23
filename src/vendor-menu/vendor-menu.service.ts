import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorMenu } from './entities/vendor-menu.entity';
import { VendorsService } from '../vendors/vendors.service';
import { CreateVendorMenuDto } from './dto/create-vendor-menu.dto';
import { UpdateVendorMenuDto } from './dto/update-vendor-menu.dto';
import { QueryVendorMenuDto } from './dto/query-vendor-menu.dto';
import { MealType } from 'src/commons/enums/meal-type.enum';
import { VendorMenuStatus } from 'src/commons/enums/vendor-menu-status.enum';

@Injectable()
export class VendorMenuService {
  constructor(
    @InjectRepository(VendorMenu)
    private readonly vendorMenuRepository: Repository<VendorMenu>,
    private readonly vendorsService: VendorsService,
  ) {}

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

  async findOne(id: string): Promise<VendorMenu> {
    const menu = await this.vendorMenuRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    return menu;
  }

  async update(
    id: string,
    updateDto: UpdateVendorMenuDto,
  ): Promise<VendorMenu> {
    const menu = await this.findOne(id);
    Object.assign(menu, updateDto);
    return await this.vendorMenuRepository.save(menu);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.vendorMenuRepository.softDelete(id);
  }

  async findByVendor(vendorId: string, mealType?: MealType): Promise<VendorMenu[]> {
    return await this.vendorMenuRepository.find({
      where: { vendorId ,...mealType && {mealType} },
      relations: ['vendor'],
    });
  }

  async findAvailable(mealType?: MealType): Promise<VendorMenu[]> {
    const query = this.vendorMenuRepository
      .createQueryBuilder('vendorMenu')
      .leftJoinAndSelect('vendorMenu.vendor', 'vendor')
      .where('vendorMenu.status = :status', {
        status: VendorMenuStatus.ACTIVE,
      });

    if (mealType) {
      query.andWhere('vendorMenu.mealType = :mealType', { mealType });
    }

    return await query.getMany();
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
}
