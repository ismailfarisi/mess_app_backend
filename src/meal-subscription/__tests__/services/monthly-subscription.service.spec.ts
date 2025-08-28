import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { MonthlySubscriptionService } from '../../monthly-subscription.service';
import { MonthlySubscription } from '../../entities/monthly-subscription.entity';
import { MealSubscription } from '../../entities/meal-subscription.entity';
import { VendorsService } from '../../../vendors/vendors.service';
import { VendorMenuService } from '../../../vendor-menu/vendor-menu.service';
import { MealSubscriptionService } from '../../meal-subscription.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { MealType } from '../../../commons/enums/meal-type.enum';
import { SubscriptionStatus } from '../../enums/subscription-status.enum';

describe('MonthlySubscriptionService', () => {
  let service: MonthlySubscriptionService;
  let monthlySubscriptionRepository: jest.Mocked<Repository<MonthlySubscription>>;
  let mealSubscriptionRepository: jest.Mocked<Repository<MealSubscription>>;
  let vendorsService: jest.Mocked<VendorsService>;
  let vendorMenuService: jest.Mocked<VendorMenuService>;
  let mealSubscriptionService: jest.Mocked<MealSubscriptionService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const mockMonthlySubscriptionRepository = TestDataFactory.createMockRepository<MonthlySubscription>();
    const mockMealSubscriptionRepository = TestDataFactory.createMockRepository<MealSubscription>();
    const mockDataSource = TestDataFactory.createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlySubscriptionService,
        {
          provide: getRepositoryToken(MonthlySubscription),
          useValue: mockMonthlySubscriptionRepository,
        },
        {
          provide: getRepositoryToken(MealSubscription),
          useValue: mockMealSubscriptionRepository,
        },
        {
          provide: VendorsService,
          useValue: {
            findOne: jest.fn(),
            findVendorsByLocationAndMealType: jest.fn(),
            findVendorsForMonthlySelection: jest.fn(),
            checkVendorMonthlyCapacity: jest.fn(),
            validateVendorsForMonthly: jest.fn(),
          },
        },
        {
          provide: VendorMenuService,
          useValue: {
            findByVendor: jest.fn(),
          },
        },
        {
          provide: MealSubscriptionService,
          useValue: {
            createSubscriptionsForVendors: jest.fn(),
            updateSubscriptionsStatusForMonthly: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<MonthlySubscriptionService>(MonthlySubscriptionService);
    monthlySubscriptionRepository = module.get(getRepositoryToken(MonthlySubscription));
    mealSubscriptionRepository = module.get(getRepositoryToken(MealSubscription));
    vendorsService = module.get(VendorsService);
    vendorMenuService = module.get(VendorMenuService);
    mealSubscriptionService = module.get(MealSubscriptionService);
    dataSource = module.get(DataSource);

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have correct constants', () => {
      expect(service['TAX_RATE']).toBe(0.05);
      expect(service['MAX_VENDORS_PER_SUBSCRIPTION']).toBe(4);
      expect(service['DELIVERY_RADIUS_KM']).toBe(50);
    });
  });

  describe('createMonthlySubscription', () => {
    let createDto: any;
    let mockQueryRunner: any;
    let userId: string;

    beforeEach(() => {
      userId = 'test-user-123';
      createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      mockQueryRunner = TestDataFactory.createMockQueryRunner();
      
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    });

    it('should create monthly subscription successfully', async () => {
      // Arrange
      const mockVendors = TestDataFactory.createMultipleVendors(3);
      const mockMenuItems = [TestDataFactory.createVendorMenu()];
      const mockMonthlySubscription = TestDataFactory.createMonthlySubscription();
      const mockMealSubscriptions = createDto.vendorIds.map((vendorId: string) =>
        TestDataFactory.createMealSubscription({ vendorId })
      );

      vendorsService.findOne.mockResolvedValue(mockVendors[0]);
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);
      mockQueryRunner.manager.create.mockImplementation((entity: any, data: any) => ({ ...data, id: 'new-id' }));
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockMealSubscriptions[0])
        .mockResolvedValueOnce(mockMealSubscriptions[1])
        .mockResolvedValueOnce(mockMealSubscriptions[2])
        .mockResolvedValueOnce(mockMonthlySubscription);

      // Act
      const result = await service.createMonthlySubscription(userId, createDto);

      // Assert
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      vendorsService.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createMonthlySubscription(userId, createDto))
        .rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should validate vendor count limit', async () => {
      // Arrange
      createDto.vendorIds = Array.from({ length: 5 }, (_, i) => `vendor-${i + 1}`);

      // Act & Assert
      await expect(service.createMonthlySubscription(userId, createDto))
        .rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should validate past start date', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      createDto.startDate = pastDate.toISOString().split('T')[0];

      // Act & Assert
      await expect(service.createMonthlySubscription(userId, createDto))
        .rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should validate vendor availability', async () => {
      // Arrange
      vendorsService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createMonthlySubscription(userId, createDto))
        .rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should validate vendor is open', async () => {
      // Arrange
      const closedVendor = TestDataFactory.createVendor({ isOpen: false });
      vendorsService.findOne.mockResolvedValue(closedVendor);

      // Act & Assert
      await expect(service.createMonthlySubscription(userId, createDto))
        .rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should validate vendor serves meal type', async () => {
      // Arrange
      const mockVendor = TestDataFactory.createVendor();
      vendorsService.findOne.mockResolvedValue(mockVendor);
      vendorMenuService.findByVendor.mockResolvedValue([]); // No menu for meal type

      // Act & Assert
      await expect(service.createMonthlySubscription(userId, createDto))
        .rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should calculate pricing correctly', async () => {
      // Arrange
      const mockVendor = TestDataFactory.createVendor();
      const mockMenuItems = [TestDataFactory.createVendorMenu({ price: 25 })];
      const mockMonthlySubscription = TestDataFactory.createMonthlySubscription();

      vendorsService.findOne.mockResolvedValue(mockVendor);
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);
      mockQueryRunner.manager.create.mockImplementation((entity: any, data: any) => ({ ...data, id: 'new-id' }));
      mockQueryRunner.manager.save.mockResolvedValue(mockMonthlySubscription);

      // Act
      await service.createMonthlySubscription(userId, createDto);

      // Assert
      const createCall = mockQueryRunner.manager.create.mock.calls.find(
        call => call[0] === MonthlySubscription
      );
      expect(createCall).toBeDefined();
      expect(createCall[1].totalPrice).toBeGreaterThan(0);
    });
  });

  describe('getAvailableVendors', () => {
    let query: any;

    beforeEach(() => {
      query = TestDataFactory.createAvailableVendorsQuery();
    });

    it('should return available vendors successfully', async () => {
      // Arrange
      const mockVendors = TestDataFactory.createMultipleVendors(3);
      const mockMenuItems = [TestDataFactory.createVendorMenu()];
      
      vendorsService.findVendorsByLocationAndMealType.mockResolvedValue({
        data: mockVendors,
        meta: { total: 3, pages: 1 },
      });
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);

      // Act
      const result = await service.getAvailableVendors(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.vendors).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.searchParams).toBeDefined();
      expect(vendorsService.findVendorsByLocationAndMealType).toHaveBeenCalledWith(
        query.latitude,
        query.longitude,
        query.mealType,
        expect.objectContaining({
          radius: query.radius,
          page: query.page,
          limit: query.limit,
          isOpen: true,
        })
      );
    });

    it('should apply default values for optional parameters', async () => {
      // Arrange
      delete query.radius;
      delete query.page;
      delete query.limit;
      
      vendorsService.findVendorsByLocationAndMealType.mockResolvedValue({
        data: [],
        meta: { total: 0, pages: 0 },
      });

      // Act
      await service.getAvailableVendors(query);

      // Assert
      expect(vendorsService.findVendorsByLocationAndMealType).toHaveBeenCalledWith(
        query.latitude,
        query.longitude,
        query.mealType,
        expect.objectContaining({
          radius: 50, // default DELIVERY_RADIUS_KM
          page: 1,
          limit: 20,
          isOpen: true,
        })
      );
    });

    it('should filter vendors by capacity', async () => {
      // Arrange
      const mockVendors = TestDataFactory.createMultipleVendors(5);
      const mockMenuItems = [TestDataFactory.createVendorMenu()];
      
      vendorsService.findVendorsByLocationAndMealType.mockResolvedValue({
        data: mockVendors,
        meta: { total: 5, pages: 1 },
      });
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);
      
      // Mock capacity check to return false for some vendors
      jest.spyOn(service as any, 'checkVendorMonthlyCapacity')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // Act
      const result = await service.getAvailableVendors(query);

      // Assert
      expect(result.vendors.length).toBe(3); // Only vendors with capacity
    });

    it('should apply pagination correctly', async () => {
      // Arrange
      const mockVendors = TestDataFactory.createMultipleVendors(25);
      query.page = 2;
      query.limit = 10;
      
      vendorsService.findVendorsByLocationAndMealType.mockResolvedValue({
        data: mockVendors,
        meta: { total: 25, pages: 3 },
      });

      jest.spyOn(service as any, 'checkVendorMonthlyCapacity').mockResolvedValue(true);
      vendorMenuService.findByVendor.mockResolvedValue([TestDataFactory.createVendorMenu()]);

      // Act
      const result = await service.getAvailableVendors(query);

      // Assert
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
    });
  });

  describe('validateMonthlySelection', () => {
    let dto: any;

    beforeEach(() => {
      dto = TestDataFactory.createValidateMonthlySelectionDto();
    });

    it('should validate successfully with valid vendors', async () => {
      // Arrange
      const mockVendor = TestDataFactory.createVendor();
      vendorsService.findOne.mockResolvedValue(mockVendor);
      jest.spyOn(service as any, 'checkVendorMonthlyCapacity').mockResolvedValue(true);

      // Act
      const result = await service.validateMonthlySelection(dto);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.vendors).toHaveLength(dto.vendorIds.length);
      expect(result.validatedAt).toBeDefined();
    });

    it('should fail validation with too many vendors', async () => {
      // Arrange
      dto.vendorIds = Array.from({ length: 5 }, (_, i) => `vendor-${i + 1}`);

      // Act
      const result = await service.validateMonthlySelection(dto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 4 vendors allowed per subscription');
    });

    it('should fail validation with duplicate vendors', async () => {
      // Arrange
      dto.vendorIds = ['vendor-1', 'vendor-2', 'vendor-1'];

      // Act
      const result = await service.validateMonthlySelection(dto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate vendors are not allowed');
    });

    it('should handle vendor not found', async () => {
      // Arrange
      vendorsService.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateMonthlySelection(dto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.vendors.some(v => v.issues.includes('Vendor not found'))).toBe(true);
    });

    it('should handle inactive vendor', async () => {
      // Arrange
      const inactiveVendor = TestDataFactory.createVendor({ isOpen: false });
      vendorsService.findOne.mockResolvedValue(inactiveVendor);

      // Act
      const result = await service.validateMonthlySelection(dto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.vendors.some(v => v.issues.includes('Vendor inactive'))).toBe(true);
    });

    it('should calculate distance correctly', async () => {
      // Arrange
      const mockVendor = TestDataFactory.createVendor({
        location: {
          type: 'Point',
          coordinates: [55.2708, 25.2048], // Dubai coordinates
        },
      });
      vendorsService.findOne.mockResolvedValue(mockVendor);
      jest.spyOn(service as any, 'checkVendorMonthlyCapacity').mockResolvedValue(true);

      // Act
      const result = await service.validateMonthlySelection(dto);

      // Assert
      expect(result.vendors[0].distance).toBeGreaterThanOrEqual(0);
      expect(result.vendors[0].canDeliver).toBe(true);
    });

    it('should handle vendor outside delivery radius', async () => {
      // Arrange
      const farVendor = TestDataFactory.createVendor({
        location: {
          type: 'Point',
          coordinates: [0, 0], // Very far from user location
        },
      });
      vendorsService.findOne.mockResolvedValue(farVendor);

      // Act
      const result = await service.validateMonthlySelection(dto);

      // Assert
      expect(result.vendors[0].canDeliver).toBe(false);
      expect(result.vendors[0].issues.some(issue => issue.includes('Outside delivery radius'))).toBe(true);
    });
  });

  describe('getMonthlyPreview', () => {
    let query: any;

    beforeEach(() => {
      query = TestDataFactory.createMonthlyPreviewQuery();
    });

    it('should generate preview successfully', async () => {
      // Arrange
      const mockVendors = TestDataFactory.createMultipleVendors(3);
      const mockMenuItems = [TestDataFactory.createVendorMenu({ price: 25 })];

      vendorsService.findOne
        .mockResolvedValueOnce(mockVendors[0])
        .mockResolvedValueOnce(mockVendors[1])
        .mockResolvedValueOnce(mockVendors[2]);
      
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);

      // Act
      const result = await service.getMonthlyPreview(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.subscription).toBeDefined();
      expect(result.vendorBreakdown).toBeDefined();
      expect(result.costBreakdown).toBeDefined();
      expect(result.estimatedSavings).toBeDefined();
      expect(result.savingsPercentage).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject preview with too many vendors', async () => {
      // Arrange
      query.vendorIds = Array.from({ length: 5 }, (_, i) => `vendor-${i + 1}`).join(',');

      // Act & Assert
      await expect(service.getMonthlyPreview(query))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle vendor not found', async () => {
      // Arrange
      vendorsService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMonthlyPreview(query))
        .rejects.toThrow(NotFoundException);
    });

    it('should calculate pricing correctly', async () => {
      // Arrange
      const mockVendor = TestDataFactory.createVendor();
      const mockMenuItems = [TestDataFactory.createVendorMenu({ price: 20 })];

      vendorsService.findOne.mockResolvedValue(mockVendor);
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);

      // Act
      const result = await service.getMonthlyPreview(query);

      // Assert
      expect(result.costBreakdown.subtotal).toBeGreaterThan(0);
      expect(result.costBreakdown.tax).toBeGreaterThan(0);
      expect(result.costBreakdown.total).toBeGreaterThan(result.costBreakdown.subtotal);
      expect(result.costBreakdown.currency).toBe('AED');
    });

    it('should set expiry time correctly', async () => {
      // Arrange
      const mockVendor = TestDataFactory.createVendor();
      const mockMenuItems = [TestDataFactory.createVendorMenu()];

      vendorsService.findOne.mockResolvedValue(mockVendor);
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);

      const beforeTime = new Date();

      // Act
      const result = await service.getMonthlyPreview(query);

      // Assert
      expect(result.expiresAt.getTime()).toBeGreaterThan(beforeTime.getTime());
      expect(result.expiresAt.getTime() - result.generatedAt.getTime()).toBe(30 * 60 * 1000); // 30 minutes
    });
  });

  describe('findMonthlySubscription', () => {
    const userId = 'test-user-123';
    const subscriptionId = 'test-subscription-123';

    it('should find monthly subscription successfully', async () => {
      // Arrange
      const mockSubscription = TestDataFactory.createMonthlySubscription({
        id: subscriptionId,
        userId,
      });
      
      monthlySubscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.findMonthlySubscription(userId, subscriptionId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(subscriptionId);
      expect(monthlySubscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { id: subscriptionId, userId },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      // Arrange
      monthlySubscriptionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findMonthlySubscription(userId, subscriptionId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when subscription belongs to different user', async () => {
      // Arrange
      const otherUserSubscription = TestDataFactory.createMonthlySubscription({
        id: subscriptionId,
        userId: 'different-user-123',
      });
      
      monthlySubscriptionRepository.findOne.mockResolvedValue(null); // findOne with userId filter returns null

      // Act & Assert
      await expect(service.findMonthlySubscription(userId, subscriptionId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Private Helper Methods', () => {
    describe('calculateDistanceBetweenPoints', () => {
      it('should calculate distance correctly', () => {
        // Arrange - Dubai coordinates
        const lat1 = 25.2048;
        const lon1 = 55.2708;
        const lat2 = 25.2582;
        const lon2 = 55.3047;

        // Act
        const distance = service['calculateDistanceBetweenPoints'](lat1, lon1, lat2, lon2);

        // Assert
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(10); // Should be less than 10km within Dubai
      });

      it('should return 0 for same coordinates', () => {
        // Arrange
        const lat = 25.2048;
        const lon = 55.2708;

        // Act
        const distance = service['calculateDistanceBetweenPoints'](lat, lon, lat, lon);

        // Assert
        expect(distance).toBe(0);
      });
    });

    describe('calculateEndDate', () => {
      it('should calculate end date correctly', () => {
        // Arrange
        const startDate = new Date('2024-01-01');

        // Act
        const endDate = service['calculateEndDate'](startDate);

        // Assert
        expect(endDate.getDate()).toBe(startDate.getDate() + 28);
        expect(endDate.getMonth()).toBe(startDate.getMonth());
        expect(endDate.getFullYear()).toBe(startDate.getFullYear());
      });

      it('should handle month boundary correctly', () => {
        // Arrange
        const startDate = new Date('2024-01-15');

        // Act
        const endDate = service['calculateEndDate'](startDate);

        // Assert
        expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
        expect(Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))).toBe(28);
      });
    });

    describe('calculateWeeklyPriceFromMenu', () => {
      it('should calculate weekly price correctly', () => {
        // Arrange
        const menuItems = [
          { price: 20 },
          { price: 25 },
          { price: 30 },
        ];

        // Act
        const weeklyPrice = service['calculateWeeklyPriceFromMenu'](menuItems);

        // Assert
        const expectedAveragePrice = (20 + 25 + 30) / 3;
        const expectedWeeklyPrice = expectedAveragePrice * 7;
        expect(weeklyPrice).toBe(expectedWeeklyPrice);
      });

      it('should return 0 for empty menu', () => {
        // Arrange
        const menuItems = [];

        // Act
        const weeklyPrice = service['calculateWeeklyPriceFromMenu'](menuItems);

        // Assert
        expect(weeklyPrice).toBe(0);
      });

      it('should handle null menu items', () => {
        // Act
        const weeklyPrice = service['calculateWeeklyPriceFromMenu'](null);

        // Assert
        expect(weeklyPrice).toBe(0);
      });

      it('should use default price for items without price', () => {
        // Arrange
        const menuItems = [
          { price: 20 },
          {}, // No price property
          { price: 30 },
        ];

        // Act
        const weeklyPrice = service['calculateWeeklyPriceFromMenu'](menuItems);

        // Assert
        const expectedAveragePrice = (20 + 25 + 30) / 3; // 25 is default price
        const expectedWeeklyPrice = expectedAveragePrice * 7;
        expect(weeklyPrice).toBe(expectedWeeklyPrice);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'test-user-123';
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const mockQueryRunner = TestDataFactory.createMockQueryRunner();
      
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database connection lost'));

      // Act & Assert
      await expect(service.createMonthlySubscription(userId, createDto))
        .rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle vendor service errors', async () => {
      // Arrange
      const query = TestDataFactory.createAvailableVendorsQuery();
      vendorsService.findVendorsByLocationAndMealType.mockRejectedValue(
        new Error('External service unavailable')
      );

      // Act & Assert
      await expect(service.getAvailableVendors(query))
        .rejects.toThrow('External service unavailable');
    });

    it('should handle validation errors in preview', async () => {
      // Arrange
      const query = TestDataFactory.createMonthlyPreviewQuery();
      query.vendorIds = 'invalid,vendor,list,too,many,vendors';

      // Act & Assert
      await expect(service.getMonthlyPreview(query))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large vendor lists efficiently', async () => {
      // Arrange
      const query = TestDataFactory.createAvailableVendorsQuery();
      const largeVendorList = TestDataFactory.createMultipleVendors(100);
      
      vendorsService.findVendorsByLocationAndMealType.mockResolvedValue({
        data: largeVendorList,
        meta: { total: 100, pages: 10 },
      });

      jest.spyOn(service as any, 'checkVendorMonthlyCapacity').mockResolvedValue(true);
      vendorMenuService.findByVendor.mockResolvedValue([TestDataFactory.createVendorMenu()]);

      const startTime = performance.now();

      // Act
      const result = await service.getAvailableVendors(query);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(result.vendors).toBeDefined();
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent validation requests', async () => {
      // Arrange
      const dto = TestDataFactory.createValidateMonthlySelectionDto();
      const mockVendor = TestDataFactory.createVendor();
      
      vendorsService.findOne.mockResolvedValue(mockVendor);
      jest.spyOn(service as any, 'checkVendorMonthlyCapacity').mockResolvedValue(true);

      // Act
      const promises = Array.from({ length: 10 }, () => 
        service.validateMonthlySelection(dto)
      );

      const results = await Promise.all(promises);

      // Assert
      results.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.vendors).toBeDefined();
      });
    });

    it('should handle edge case dates', async () => {
      // Arrange
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      // Set start date to end of month
      createDto.startDate = '2024-01-31';

      const mockVendor = TestDataFactory.createVendor();
      const mockMenuItems = [TestDataFactory.createVendorMenu()];
      const mockQueryRunner = TestDataFactory.createMockQueryRunner();

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
      vendorsService.findOne.mockResolvedValue(mockVendor);
      vendorMenuService.findByVendor.mockResolvedValue(mockMenuItems);
      mockQueryRunner.manager.create.mockImplementation((entity: any, data: any) => ({ ...data, id: 'new-id' }));
      mockQueryRunner.manager.save.mockResolvedValue({ id: 'saved-subscription' });

      // Act & Assert
      await expect(service.createMonthlySubscription('user-123', createDto))
        .resolves.toBeDefined();
    });
  });
});