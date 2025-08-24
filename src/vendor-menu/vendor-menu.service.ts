import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findByVendor(vendorId: string, mealType?: MealType): Promise<VendorMenuResponseDto[]> {
    const menus = await this.vendorMenuRepository.find({
      where: { vendorId ,...mealType && {mealType} },
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
}
