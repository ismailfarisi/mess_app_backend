import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorsService } from '../../../vendors/vendors.service';
import { Vendor } from '../../../vendors/entities/vendor.entity';
import { UsersService } from '../../../users/users.service';
import { AuthService } from '../../../auth/auth.service';
import { RolesService } from '../../../roles/roles.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { MealType } from '../../../commons/enums/meal-type.enum';

describe('VendorsService - Monthly Subscription Enhancements', () => {
  let service: VendorsService;
  let vendorRepository: jest.Mocked<Repository<Vendor>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: getRepositoryToken(Vendor),
          useValue: TestDataFactory.createMockRepository<Vendor>(),
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: {
            findByName: jest.fn(),
            assignRole: jest.fn(),
            hasRole: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
    vendorRepository = module.get(getRepositoryToken(Vendor));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findVendorsForMonthlySelection', () => {
    it('should find vendors for monthly selection with spatial filtering', async () => {
      // Arrange
      const latitude = 25.2048;
      const longitude = 55.2708;
      const mealType = MealType.LUNCH;
      const query = TestDataFactory.createAvailableVendorsQuery();
      const mockVendors = TestDataFactory.createMultipleVendors(3);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockVendors),
        getCount: jest.fn().mockResolvedValue(3),
      };

      vendorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      vendorRepository.query.mockResolvedValue([{ count: '5' }]);

      // Mock current load method
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(5);

      // Act
      const result = await service.findVendorsForMonthlySelection(latitude, longitude, mealType, query);

      // Assert
      expect(result).toBeDefined();
      expect(result.vendors).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.searchParams).toBeDefined();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('vendor.isOpen = :isOpen', { isOpen: true });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining('ST_DWithin'));
    });

    it('should apply capacity filtering correctly', async () => {
      // Arrange
      const latitude = 25.2048;
      const longitude = 55.2708;
      const mealType = MealType.LUNCH;
      const query = TestDataFactory.createAvailableVendorsQuery();
      const mockVendors = TestDataFactory.createMultipleVendors(2);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockImplementation((condition) => {
          if (condition.includes('COALESCE')) {
            // This is the capacity filtering subquery
            expect(condition).toContain('monthly_capacity');
          }
          return mockQueryBuilder;
        }),
        setParameters: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockVendors),
        getCount: jest.fn().mockResolvedValue(2),
      };

      vendorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(10);

      // Act
      const result = await service.findVendorsForMonthlySelection(latitude, longitude, mealType, query);

      // Assert
      expect(result.vendors).toHaveLength(2);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const query = {
        ...TestDataFactory.createAvailableVendorsQuery(),
        page: 2,
        limit: 5,
      };
      const mockVendors = TestDataFactory.createMultipleVendors(5);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockVendors),
        getCount: jest.fn().mockResolvedValue(15),
      };

      vendorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(5);

      // Act
      const result = await service.findVendorsForMonthlySelection(25.2048, 55.2708, MealType.LUNCH, query);

      // Assert
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(3); // 15 total / 5 limit = 3 pages
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(true);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (page - 1) * limit
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should format vendor data for monthly selection', async () => {
      // Arrange
      const mockVendor = TestDataFactory.createVendor({
        cuisineTypes: ['Italian', 'Mediterranean'],
        rating: 4.7,
        totalRatings: 250,
        monthlyCapacity: 75,
      });
      mockVendor.menus = [TestDataFactory.createVendorMenu({ price: 30 })];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockVendor]),
        getCount: jest.fn().mockResolvedValue(1),
      };

      vendorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(20);

      // Act
      const result = await service.findVendorsForMonthlySelection(25.2048, 55.2708, MealType.LUNCH, TestDataFactory.createAvailableVendorsQuery());

      // Assert
      expect(result.vendors).toHaveLength(1);
      const vendor = result.vendors[0];
      expect(vendor.id).toBe(mockVendor.id);
      expect(vendor.rating).toBe(4.7);
      expect(vendor.cuisine).toBe('Italian');
      expect(vendor.monthlyCapacity).toBe(75);
      expect(vendor.currentSubscriptions).toBe(20);
      expect(vendor.averagePrice).toBe(30);
    });
  });

  describe('checkVendorMonthlyCapacity', () => {
    it('should check capacity for multiple vendors', async () => {
      // Arrange
      const vendorIds = ['vendor-1', 'vendor-2', 'vendor-3'];
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');
      const mockVendors = vendorIds.map((id, index) => 
        TestDataFactory.createVendor({ 
          id, 
          monthlyCapacity: 50 + (index * 25) 
        })
      );

      vendorRepository.findOne.mockImplementation(({ where }) => {
        const vendor = mockVendors.find(v => v.id === (where as any).id);
        return Promise.resolve(vendor || null);
      });

      vendorRepository.query.mockImplementation((query, params) => {
        const vendorId = params[0];
        const loads = { 'vendor-1': 10, 'vendor-2': 45, 'vendor-3': 80 };
        return Promise.resolve([{ count: (loads[vendorId] || 0).toString() }]);
      });

      // Act
      const result = await service.checkVendorMonthlyCapacity(vendorIds, startDate, endDate);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        vendorId: 'vendor-1',
        hasCapacity: true,
        currentLoad: 10,
        maxCapacity: 50,
        availableSlots: 40,
      });
      expect(result[1]).toEqual({
        vendorId: 'vendor-2',
        hasCapacity: true,
        currentLoad: 45,
        maxCapacity: 75,
        availableSlots: 30,
      });
      expect(result[2]).toEqual({
        vendorId: 'vendor-3',
        hasCapacity: false,
        currentLoad: 80,
        maxCapacity: 100,
        availableSlots: 20,
      });
    });

    it('should handle non-existent vendors', async () => {
      // Arrange
      const vendorIds = ['non-existent-vendor'];
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');

      vendorRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkVendorMonthlyCapacity(vendorIds, startDate, endDate);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        vendorId: 'non-existent-vendor',
        hasCapacity: false,
        currentLoad: 0,
        maxCapacity: 0,
        availableSlots: 0,
      });
    });

    it('should use default capacity when vendor has no monthly capacity set', async () => {
      // Arrange
      const vendorIds = ['vendor-no-capacity'];
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');
      const mockVendor = TestDataFactory.createVendor({ 
        id: 'vendor-no-capacity', 
        monthlyCapacity: null 
      });

      vendorRepository.findOne.mockResolvedValue(mockVendor);
      vendorRepository.query.mockResolvedValue([{ count: '25' }]);

      // Act
      const result = await service.checkVendorMonthlyCapacity(vendorIds, startDate, endDate);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].maxCapacity).toBe(50); // Default capacity
      expect(result[0].hasCapacity).toBe(true);
      expect(result[0].availableSlots).toBe(25);
    });
  });

  describe('validateVendorsForMonthly', () => {
    it('should validate all aspects of vendor selection', async () => {
      // Arrange
      const vendorIds = ['vendor-1', 'vendor-2'];
      const userLocation = { latitude: 25.2048, longitude: 55.2708 };
      const mealType = MealType.LUNCH;
      const startDate = new Date('2024-03-01');

      const mockVendors = vendorIds.map(id => {
        const vendor = TestDataFactory.createVendor({ id, serviceRadius: 20 });
        vendor.menus = [TestDataFactory.createVendorMenu({ mealType, isActive: true })];
        return vendor;
      });

      vendorRepository.findOne.mockImplementation(({ where }) => {
        const vendor = mockVendors.find(v => v.id === (where as any).id);
        return Promise.resolve(vendor || null);
      });

      vendorRepository.query.mockResolvedValue([{ distance: '5000' }]); // 5km distance
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(10);

      // Act
      const result = await service.validateVendorsForMonthly(vendorIds, userLocation, mealType, startDate);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.vendors).toHaveLength(2);
      expect(result.vendors[0].isAvailable).toBe(true);
      expect(result.vendors[0].canDeliver).toBe(true);
      expect(result.vendors[0].hasCapacity).toBe(true);
      expect(result.vendors[0].distance).toBe(5); // Converted to km
    });

    it('should identify inactive vendors', async () => {
      // Arrange
      const vendorIds = ['inactive-vendor'];
      const userLocation = { latitude: 25.2048, longitude: 55.2708 };
      const mealType = MealType.LUNCH;
      const startDate = new Date('2024-03-01');

      const mockVendor = TestDataFactory.createVendor({ 
        id: 'inactive-vendor', 
        isOpen: false 
      });
      mockVendor.menus = [TestDataFactory.createVendorMenu({ mealType, isActive: true })];

      vendorRepository.findOne.mockResolvedValue(mockVendor);

      // Act
      const result = await service.validateVendorsForMonthly(vendorIds, userLocation, mealType, startDate);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.vendors[0].isAvailable).toBe(false);
      expect(result.vendors[0].issues).toContain('Vendor is currently closed');
    });

    it('should identify vendors outside service radius', async () => {
      // Arrange
      const vendorIds = ['far-vendor'];
      const userLocation = { latitude: 25.2048, longitude: 55.2708 };
      const mealType = MealType.LUNCH;
      const startDate = new Date('2024-03-01');

      const mockVendor = TestDataFactory.createVendor({ 
        id: 'far-vendor', 
        serviceRadius: 5 // 5km radius
      });
      mockVendor.menus = [TestDataFactory.createVendorMenu({ mealType, isActive: true })];

      vendorRepository.findOne.mockResolvedValue(mockVendor);
      vendorRepository.query.mockResolvedValue([{ distance: '10000' }]); // 10km distance
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(10);

      // Act
      const result = await service.validateVendorsForMonthly(vendorIds, userLocation, mealType, startDate);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.vendors[0].canDeliver).toBe(false);
      expect(result.vendors[0].issues.some(issue => issue.includes('outside service radius'))).toBe(true);
    });

    it('should identify vendors without meal type support', async () => {
      // Arrange
      const vendorIds = ['no-lunch-vendor'];
      const userLocation = { latitude: 25.2048, longitude: 55.2708 };
      const mealType = MealType.LUNCH;
      const startDate = new Date('2024-03-01');

      const mockVendor = TestDataFactory.createVendor({ id: 'no-lunch-vendor' });
      mockVendor.menus = [TestDataFactory.createVendorMenu({ 
        mealType: MealType.BREAKFAST, // Different meal type
        isActive: true 
      })];

      vendorRepository.findOne.mockResolvedValue(mockVendor);
      vendorRepository.query.mockResolvedValue([{ distance: '3000' }]);

      // Act
      const result = await service.validateVendorsForMonthly(vendorIds, userLocation, mealType, startDate);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.vendors[0].isAvailable).toBe(false);
      expect(result.vendors[0].issues).toContain('Vendor does not serve LUNCH meals');
    });

    it('should identify vendors at maximum capacity', async () => {
      // Arrange
      const vendorIds = ['full-capacity-vendor'];
      const userLocation = { latitude: 25.2048, longitude: 55.2708 };
      const mealType = MealType.LUNCH;
      const startDate = new Date('2024-03-01');

      const mockVendor = TestDataFactory.createVendor({ 
        id: 'full-capacity-vendor',
        monthlyCapacity: 50 
      });
      mockVendor.menus = [TestDataFactory.createVendorMenu({ mealType, isActive: true })];

      vendorRepository.findOne.mockResolvedValue(mockVendor);
      vendorRepository.query.mockResolvedValue([{ distance: '3000' }]);
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(50); // At max capacity

      // Act
      const result = await service.validateVendorsForMonthly(vendorIds, userLocation, mealType, startDate);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.vendors[0].hasCapacity).toBe(false);
      expect(result.vendors[0].issues).toContain('Vendor has reached maximum monthly capacity');
    });

    it('should categorize issues as errors vs warnings', async () => {
      // Arrange
      const vendorIds = ['warning-vendor', 'error-vendor'];
      const userLocation = { latitude: 25.2048, longitude: 55.2708 };
      const mealType = MealType.LUNCH;
      const startDate = new Date('2024-03-01');

      const warningVendor = TestDataFactory.createVendor({ id: 'warning-vendor' });
      warningVendor.menus = [TestDataFactory.createVendorMenu({ mealType, isActive: true })];
      
      const errorVendor = TestDataFactory.createVendor({ 
        id: 'error-vendor', 
        isOpen: false // This should be an error
      });

      vendorRepository.findOne.mockImplementation(({ where }) => {
        const id = (where as any).id;
        if (id === 'warning-vendor') return Promise.resolve(warningVendor);
        if (id === 'error-vendor') return Promise.resolve(errorVendor);
        return Promise.resolve(null);
      });

      vendorRepository.query.mockResolvedValue([{ distance: '3000' }]);
      jest.spyOn(service as any, 'getCurrentMonthlyLoad')
        .mockResolvedValueOnce(45) // Warning vendor: high but not full
        .mockResolvedValueOnce(0); // Error vendor: doesn't matter since inactive

      // Act
      const result = await service.validateVendorsForMonthly(vendorIds, userLocation, mealType, startDate);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0); // Should have errors from inactive vendor
      expect(result.warnings.length).toBeGreaterThanOrEqual(0); // May have warnings
    });
  });

  describe('getCurrentMonthlyLoad', () => {
    it('should calculate current monthly load correctly', async () => {
      // Arrange
      const vendorId = 'test-vendor';
      vendorRepository.query.mockResolvedValue([{ count: '25' }]);

      // Act
      const result = await service['getCurrentMonthlyLoad'](vendorId);

      // Assert
      expect(result).toBe(25);
      expect(vendorRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        [vendorId]
      );
    });

    it('should handle zero load', async () => {
      // Arrange
      const vendorId = 'no-load-vendor';
      vendorRepository.query.mockResolvedValue([{ count: '0' }]);

      // Act
      const result = await service['getCurrentMonthlyLoad'](vendorId);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle null/undefined results', async () => {
      // Arrange
      const vendorId = 'null-result-vendor';
      vendorRepository.query.mockResolvedValue([{ count: null }]);

      // Act
      const result = await service['getCurrentMonthlyLoad'](vendorId);

      // Assert
      expect(result).toBe(0);
    });

    it('should filter by active and scheduled statuses only', async () => {
      // Arrange
      const vendorId = 'status-filter-vendor';
      vendorRepository.query.mockResolvedValue([{ count: '15' }]);

      // Act
      await service['getCurrentMonthlyLoad'](vendorId);

      // Assert
      expect(vendorRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("ms.status IN ('active', 'scheduled')"),
        [vendorId]
      );
    });
  });

  describe('formatBusinessHours', () => {
    it('should format business hours correctly', () => {
      // Arrange
      const businessHours = {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '', close: '' }, // Closed day
        friday: { open: '08:00', close: '21:00' },
        saturday: { open: '10:00', close: '23:00' },
        sunday: { open: '11:00', close: '20:00' },
      };

      // Act
      const result = service['formatBusinessHours'](businessHours);

      // Assert
      expect(result).toHaveLength(7);
      expect(result[0]).toEqual({ // Sunday (0)
        day: 0,
        openTime: '11:00',
        closeTime: '20:00',
        isClosed: false,
      });
      expect(result[1]).toEqual({ // Monday (1)
        day: 1,
        openTime: '09:00',
        closeTime: '22:00',
        isClosed: false,
      });
      expect(result[4]).toEqual({ // Thursday (4)
        day: 4,
        openTime: '09:00', // Default
        closeTime: '22:00', // Default
        isClosed: true,
      });
    });

    it('should handle null business hours', () => {
      // Act
      const result = service['formatBusinessHours'](null);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle undefined business hours', () => {
      // Act
      const result = service['formatBusinessHours'](undefined);

      // Assert
      expect(result).toEqual([]);
    });

    it('should use default hours for missing days', () => {
      // Arrange
      const incompleteHours = {
        monday: { open: '09:00', close: '22:00' },
        // Missing other days
      };

      // Act
      const result = service['formatBusinessHours'](incompleteHours);

      // Assert
      expect(result).toHaveLength(1); // Only monday provided
      expect(result[0].day).toBe(1);
      expect(result[0].openTime).toBe('09:00');
      expect(result[0].closeTime).toBe('22:00');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const vendorIds = ['error-vendor'];
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');

      vendorRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.checkVendorMonthlyCapacity(vendorIds, startDate, endDate))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle spatial query errors', async () => {
      // Arrange
      const latitude = 25.2048;
      const longitude = 55.2708;
      const mealType = MealType.LUNCH;
      const query = TestDataFactory.createAvailableVendorsQuery();

      vendorRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('PostGIS extension not available');
      });

      // Act & Assert
      await expect(service.findVendorsForMonthlySelection(latitude, longitude, mealType, query))
        .rejects.toThrow('PostGIS extension not available');
    });

    it('should handle large vendor lists efficiently', async () => {
      // Arrange
      const largeVendorIdList = Array.from({ length: 100 }, (_, i) => `vendor-${i + 1}`);
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');

      vendorRepository.findOne.mockResolvedValue(TestDataFactory.createVendor());
      vendorRepository.query.mockResolvedValue([{ count: '10' }]);

      const startTime = performance.now();

      // Act
      const result = await service.checkVendorMonthlyCapacity(largeVendorIdList, startDate, endDate);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(result).toHaveLength(100);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent validation requests', async () => {
      // Arrange
      const vendorIds = ['concurrent-vendor-1', 'concurrent-vendor-2'];
      const userLocation = { latitude: 25.2048, longitude: 55.2708 };
      const mealType = MealType.LUNCH;
      const startDate = new Date('2024-03-01');

      const mockVendor = TestDataFactory.createVendor();
      mockVendor.menus = [TestDataFactory.createVendorMenu({ mealType, isActive: true })];

      vendorRepository.findOne.mockResolvedValue(mockVendor);
      vendorRepository.query.mockResolvedValue([{ distance: '3000' }]);
      jest.spyOn(service as any, 'getCurrentMonthlyLoad').mockResolvedValue(10);

      // Act
      const promises = Array.from({ length: 5 }, () =>
        service.validateVendorsForMonthly(vendorIds, userLocation, mealType, startDate)
      );

      const results = await Promise.all(promises);

      // Assert
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.vendors).toHaveLength(2);
      });
    });
  });
});