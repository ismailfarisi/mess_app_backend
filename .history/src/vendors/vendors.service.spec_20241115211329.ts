import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorMenuService } from './vendor-menu.service';
import { VendorsService } from '../vendors/vendors.service';
import { VendorMenu } from './entities/vendor-menu.entity';
import { CreateVendorMenuDto } from './dto/create-vendor-menu.dto';
import { MealType } from '../common/enums/meal-type.enum';
import { MenuExistsException } from './exceptions/menu-exists.exception';

describe('VendorMenuService', () => {
  let service: VendorMenuService;
  let repository: Repository<VendorMenu>;
  let vendorsService: VendorsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockVendorsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorMenuService,
        {
          provide: getRepositoryToken(VendorMenu),
          useValue: mockRepository,
        },
        {
          provide: VendorsService,
          useValue: mockVendorsService,
        },
      ],
    }).compile();

    service = module.get<VendorMenuService>(VendorMenuService);
    repository = module.get<Repository<VendorMenu>>(
      getRepositoryToken(VendorMenu),
    );
    vendorsService = module.get<VendorsService>(VendorsService);
  });

  describe('create', () => {
    it('should create a new menu', async () => {
      const createDto: CreateVendorMenuDto = {
        vendorId: '123',
        mealType: MealType.BREAKFAST,
        description: 'Test menu',
        price: 10.99,
        sampleMenuItems: ['item1', 'item2'],
      };

      const vendor = { id: '123', name: 'Test Vendor' };
      const menu = { ...createDto, id: '456' };

      mockVendorsService.findOne.mockResolvedValue(vendor);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(menu);
      mockRepository.save.mockResolvedValue(menu);

      const result = await service.create(createDto);

      expect(result).toEqual(menu);
      expect(mockVendorsService.findOne).toHaveBeenCalledWith('123');
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(menu);
    });

    it('should throw MenuExistsException for duplicate menu', async () => {
      const createDto: CreateVendorMenuDto = {
        vendorId: '123',
        mealType: MealType.BREAKFAST,
        description: 'Test menu',
        price: 10.99,
        sampleMenuItems: ['item1', 'item2'],
      };

      mockVendorsService.findOne.mockResolvedValue({ id: '123' });
      mockRepository.findOne.mockResolvedValue({ id: '456' });

      await expect(service.create(createDto)).rejects.toThrow(
        MenuExistsException,
      );
    });
  });
});
