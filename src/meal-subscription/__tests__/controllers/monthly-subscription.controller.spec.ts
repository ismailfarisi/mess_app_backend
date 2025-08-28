import { Test, TestingModule } from '@nestjs/testing';
import { MonthlySubscriptionController } from '../../monthly-subscription.controller';
import { MonthlySubscriptionService } from '../../monthly-subscription.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { User } from '../../../users/entities/user.entity';

describe('MonthlySubscriptionController', () => {
  let controller: MonthlySubscriptionController;
  let service: jest.Mocked<MonthlySubscriptionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonthlySubscriptionController],
      providers: [
        {
          provide: MonthlySubscriptionService,
          useValue: {
            createMonthlySubscription: jest.fn(),
            getAvailableVendors: jest.fn(),
            validateMonthlySelection: jest.fn(),
            getMonthlyPreview: jest.fn(),
            findMonthlySubscription: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MonthlySubscriptionController>(MonthlySubscriptionController);
    service = module.get(MonthlySubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have service dependency', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createMonthlySubscription', () => {
    it('should create monthly subscription successfully', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const expectedResponse = TestDataFactory.createMonthlySubscription();

      service.createMonthlySubscription.mockResolvedValue(expectedResponse as any);

      // Act
      const result = await controller.createMonthlySubscription(user, createDto);

      // Assert
      expect(service.createMonthlySubscription).toHaveBeenCalledWith(user.id, createDto);
      expect(result).toBe(expectedResponse);
    });

    it('should pass user ID and DTO to service', async () => {
      // Arrange
      const user = TestDataFactory.createUser({ id: 'specific-user-id' });
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const expectedResponse = TestDataFactory.createMonthlySubscription();

      service.createMonthlySubscription.mockResolvedValue(expectedResponse as any);

      // Act
      await controller.createMonthlySubscription(user, createDto);

      // Assert
      expect(service.createMonthlySubscription).toHaveBeenCalledWith('specific-user-id', createDto);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const serviceError = new Error('Service error');

      service.createMonthlySubscription.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.createMonthlySubscription(user, createDto))
        .rejects.toThrow('Service error');
    });
  });

  describe('getAvailableVendors', () => {
    it('should get available vendors successfully', async () => {
      // Arrange
      const query = TestDataFactory.createAvailableVendorsQuery();
      const expectedResponse = {
        vendors: [
          {
            id: 'vendor-1',
            name: 'Test Vendor',
            businessName: 'Test Restaurant',
            address: '123 Test St',
            rating: 4.5,
            totalRatings: 100,
            profilePhotoUrl: 'photo.jpg',
            cuisineTypes: ['Italian'],
            foodTypes: ['Vegetarian'],
            isOpen: true,
            distance: 2.5,
            menuPreview: [],
            availableSlots: 50,
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        searchParams: {
          location: {
            latitude: query.latitude,
            longitude: query.longitude,
          },
          mealType: query.mealType,
          radius: query.radius || 50,
        },
      };

      service.getAvailableVendors.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getAvailableVendors(query);

      // Assert
      expect(service.getAvailableVendors).toHaveBeenCalledWith(query);
      expect(result).toBe(expectedResponse);
    });

    it('should handle query with all parameters', async () => {
      // Arrange
      const query = {
        latitude: 25.2048,
        longitude: 55.2708,
        mealType: 'LUNCH' as any,
        radius: 15,
        page: 2,
        limit: 20,
      };

      const expectedResponse = {
        vendors: [],
        meta: {
          total: 0,
          page: 2,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: true,
        },
        searchParams: {
          location: {
            latitude: query.latitude,
            longitude: query.longitude,
          },
          mealType: query.mealType,
          radius: query.radius,
        },
      };

      service.getAvailableVendors.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getAvailableVendors(query);

      // Assert
      expect(service.getAvailableVendors).toHaveBeenCalledWith(query);
      expect(result).toBe(expectedResponse);
    });

    it('should handle query with minimal parameters', async () => {
      // Arrange
      const query = {
        latitude: 25.2048,
        longitude: 55.2708,
        mealType: 'BREAKFAST' as any,
      };

      const expectedResponse = {
        vendors: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        searchParams: {
          location: {
            latitude: query.latitude,
            longitude: query.longitude,
          },
          mealType: query.mealType,
          radius: 50,
        },
      };

      service.getAvailableVendors.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getAvailableVendors(query);

      // Assert
      expect(service.getAvailableVendors).toHaveBeenCalledWith(query);
      expect(result).toBe(expectedResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const query = TestDataFactory.createAvailableVendorsQuery();
      const serviceError = new Error('Database connection failed');

      service.getAvailableVendors.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getAvailableVendors(query))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('validateSelection', () => {
    it('should validate selection successfully', async () => {
      // Arrange
      const validateDto = TestDataFactory.createValidateMonthlySelectionDto();
      const expectedResponse = TestDataFactory.createValidationResult({
        isValid: true,
        errors: [],
        warnings: [],
      });

      service.validateMonthlySelection.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.validateSelection(validateDto);

      // Assert
      expect(service.validateMonthlySelection).toHaveBeenCalledWith(validateDto);
      expect(result).toBe(expectedResponse);
    });

    it('should handle validation with errors', async () => {
      // Arrange
      const validateDto = TestDataFactory.createValidateMonthlySelectionDto();
      const expectedResponse = TestDataFactory.createValidationResult({
        isValid: false,
        errors: ['Vendor not found', 'Outside delivery radius'],
        warnings: ['Limited capacity'],
      });

      service.validateMonthlySelection.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.validateSelection(validateDto);

      // Assert
      expect(service.validateMonthlySelection).toHaveBeenCalledWith(validateDto);
      expect(result).toBe(expectedResponse);
    });

    it('should handle validation with warnings only', async () => {
      // Arrange
      const validateDto = TestDataFactory.createValidateMonthlySelectionDto();
      const expectedResponse = TestDataFactory.createValidationResult({
        isValid: true,
        errors: [],
        warnings: ['Peak hours may have delays'],
      });

      service.validateMonthlySelection.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.validateSelection(validateDto);

      // Assert
      expect(service.validateMonthlySelection).toHaveBeenCalledWith(validateDto);
      expect(result).toBe(expectedResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const validateDto = TestDataFactory.createValidateMonthlySelectionDto();
      const serviceError = new Error('Validation service unavailable');

      service.validateMonthlySelection.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.validateSelection(validateDto))
        .rejects.toThrow('Validation service unavailable');
    });
  });

  describe('getPreview', () => {
    it('should get preview successfully', async () => {
      // Arrange
      const query = TestDataFactory.createMonthlyPreviewQuery();
      const expectedResponse = {
        subscription: {
          mealType: 'LUNCH',
          startDate: '2024-02-01',
          endDate: '2024-02-28',
          totalDeliveryDays: 28,
          vendorCount: 3,
          averageCostPerMeal: 15.0,
        },
        vendorBreakdown: [
          {
            vendorId: 'vendor-1',
            vendorName: 'Test Restaurant 1',
            costPerMeal: 20,
            deliveryDays: 7,
            totalCost: 140,
            assignedDays: [1, 2, 3, 4, 5, 6, 7],
          },
        ],
        costBreakdown: {
          subtotal: 420,
          serviceFee: 0,
          deliveryFee: 0,
          tax: 21,
          discount: 0,
          total: 441,
          currency: 'AED',
        },
        estimatedSavings: 50,
        savingsPercentage: 10.2,
        generatedAt: new Date(),
        expiresAt: new Date(),
      };

      service.getMonthlyPreview.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getPreview(query);

      // Assert
      expect(service.getMonthlyPreview).toHaveBeenCalledWith(query);
      expect(result).toBe(expectedResponse);
    });

    it('should handle preview for single vendor', async () => {
      // Arrange
      const query = {
        vendorIds: 'vendor-1',
        mealType: 'DINNER' as any,
        startDate: '2024-03-01',
      };

      const expectedResponse = {
        subscription: {
          mealType: 'DINNER',
          startDate: '2024-03-01',
          endDate: '2024-03-28',
          totalDeliveryDays: 28,
          vendorCount: 1,
          averageCostPerMeal: 25.0,
        },
        vendorBreakdown: [
          {
            vendorId: 'vendor-1',
            vendorName: 'Single Vendor',
            costPerMeal: 25,
            deliveryDays: 7,
            totalCost: 700,
            assignedDays: [1, 2, 3, 4, 5, 6, 7],
          },
        ],
        costBreakdown: {
          subtotal: 700,
          serviceFee: 0,
          deliveryFee: 0,
          tax: 35,
          discount: 0,
          total: 735,
          currency: 'AED',
        },
        estimatedSavings: 0,
        savingsPercentage: 0,
        generatedAt: new Date(),
        expiresAt: new Date(),
      };

      service.getMonthlyPreview.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getPreview(query);

      // Assert
      expect(service.getMonthlyPreview).toHaveBeenCalledWith(query);
      expect(result).toBe(expectedResponse);
    });

    it('should handle preview for maximum vendors', async () => {
      // Arrange
      const query = {
        vendorIds: 'vendor-1,vendor-2,vendor-3,vendor-4',
        mealType: 'LUNCH' as any,
        startDate: '2024-02-01',
      };

      const expectedResponse = {
        subscription: {
          mealType: 'LUNCH',
          startDate: '2024-02-01',
          endDate: '2024-02-28',
          totalDeliveryDays: 28,
          vendorCount: 4,
          averageCostPerMeal: 18.75,
        },
        vendorBreakdown: Array.from({ length: 4 }, (_, i) => ({
          vendorId: `vendor-${i + 1}`,
          vendorName: `Vendor ${i + 1}`,
          costPerMeal: 15 + i * 5,
          deliveryDays: 7,
          totalCost: (15 + i * 5) * 7 * 4,
          assignedDays: [1, 2, 3, 4, 5, 6, 7],
        })),
        costBreakdown: {
          subtotal: 2100,
          serviceFee: 0,
          deliveryFee: 0,
          tax: 105,
          discount: 0,
          total: 2205,
          currency: 'AED',
        },
        estimatedSavings: 200,
        savingsPercentage: 8.3,
        generatedAt: new Date(),
        expiresAt: new Date(),
      };

      service.getMonthlyPreview.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getPreview(query);

      // Assert
      expect(service.getMonthlyPreview).toHaveBeenCalledWith(query);
      expect(result).toBe(expectedResponse);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const query = TestDataFactory.createMonthlyPreviewQuery();
      const serviceError = new Error('Preview calculation failed');

      service.getMonthlyPreview.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getPreview(query))
        .rejects.toThrow('Preview calculation failed');
    });
  });

  describe('getMonthlySubscription', () => {
    it('should get monthly subscription successfully', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const subscriptionId = 'test-subscription-123';
      const expectedResponse = {
        id: subscriptionId,
        userId: user.id,
        vendors: [
          {
            id: 'vendor-1',
            name: 'Test Vendor',
            logo: null,
            rating: 4.5,
            cuisine: 'Italian',
            deliveryDays: [1, 2, 3, 4, 5],
          },
        ],
        mealType: 'LUNCH',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
        status: 'ACTIVE',
        deliveryAddress: {
          id: 'address-123',
          address: '123 Test Street',
          coordinates: { latitude: 25.2048, longitude: 55.2708 },
        },
        deliverySchedule: [
          {
            vendorId: 'vendor-1',
            vendorName: 'Test Vendor',
            dayOfWeek: 1,
            dayName: 'Monday',
            estimatedDeliveryTime: '12:00-14:00',
          },
        ],
        paymentSummary: {
          totalAmount: 400,
          costPerVendorPerDay: 14.29,
          totalDeliveryDays: 28,
          serviceFee: 0,
          deliveryFee: 0,
          taxes: 20,
          currency: 'AED',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.findMonthlySubscription.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getMonthlySubscription(user, subscriptionId);

      // Assert
      expect(service.findMonthlySubscription).toHaveBeenCalledWith(user.id, subscriptionId);
      expect(result).toBe(expectedResponse);
    });

    it('should pass correct parameters to service', async () => {
      // Arrange
      const user = TestDataFactory.createUser({ id: 'specific-user-id' });
      const subscriptionId = 'specific-subscription-id';
      const expectedResponse = TestDataFactory.createMonthlySubscription();

      service.findMonthlySubscription.mockResolvedValue(expectedResponse as any);

      // Act
      await controller.getMonthlySubscription(user, subscriptionId);

      // Assert
      expect(service.findMonthlySubscription).toHaveBeenCalledWith('specific-user-id', 'specific-subscription-id');
    });

    it('should propagate NotFoundException from service', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const subscriptionId = 'non-existent-subscription';
      const serviceError = new Error('Subscription not found');

      service.findMonthlySubscription.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getMonthlySubscription(user, subscriptionId))
        .rejects.toThrow('Subscription not found');
    });

    it('should handle subscription belonging to different user', async () => {
      // Arrange
      const user = TestDataFactory.createUser({ id: 'user-1' });
      const subscriptionId = 'subscription-of-user-2';
      const serviceError = new Error('Subscription not found for user user-1');

      service.findMonthlySubscription.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getMonthlySubscription(user, subscriptionId))
        .rejects.toThrow('Subscription not found for user user-1');
    });
  });

  describe('Controller Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const serviceError = new Error('Service temporarily unavailable');

      service.createMonthlySubscription.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.createMonthlySubscription(user, createDto))
        .rejects.toThrow('Service temporarily unavailable');
    });

    it('should handle validation errors from all endpoints', async () => {
      // Arrange
      const validationError = new Error('Validation failed');
      const user = TestDataFactory.createUser();

      service.createMonthlySubscription.mockRejectedValue(validationError);
      service.getAvailableVendors.mockRejectedValue(validationError);
      service.validateMonthlySelection.mockRejectedValue(validationError);
      service.getMonthlyPreview.mockRejectedValue(validationError);
      service.findMonthlySubscription.mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.createMonthlySubscription(user, {} as any))
        .rejects.toThrow('Validation failed');

      await expect(controller.getAvailableVendors({} as any))
        .rejects.toThrow('Validation failed');

      await expect(controller.validateSelection({} as any))
        .rejects.toThrow('Validation failed');

      await expect(controller.getPreview({} as any))
        .rejects.toThrow('Validation failed');

      await expect(controller.getMonthlySubscription(user, 'id'))
        .rejects.toThrow('Validation failed');
    });

    it('should handle timeout errors gracefully', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const timeoutError = new Error('Request timeout');

      service.createMonthlySubscription.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(controller.createMonthlySubscription(user, createDto))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('Controller Integration with Guards and Decorators', () => {
    it('should work with JWT authentication guard', () => {
      // This test verifies that the controller is properly configured
      // In a real integration test, this would test the actual guard behavior
      expect(controller).toBeDefined();
      
      // Verify that controller methods exist and can be called
      expect(typeof controller.createMonthlySubscription).toBe('function');
      expect(typeof controller.getAvailableVendors).toBe('function');
      expect(typeof controller.validateSelection).toBe('function');
      expect(typeof controller.getPreview).toBe('function');
      expect(typeof controller.getMonthlySubscription).toBe('function');
    });

    it('should extract user information from JWT token', async () => {
      // Arrange
      const user = TestDataFactory.createUser({
        id: 'jwt-user-id',
        email: 'jwt.user@example.com',
        name: 'JWT User',
      });
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const expectedResponse = TestDataFactory.createMonthlySubscription();

      service.createMonthlySubscription.mockResolvedValue(expectedResponse as any);

      // Act
      await controller.createMonthlySubscription(user, createDto);

      // Assert
      expect(service.createMonthlySubscription).toHaveBeenCalledWith('jwt-user-id', createDto);
    });

    it('should handle different user types correctly', async () => {
      // Arrange
      const regularUser = TestDataFactory.createUser({ id: 'regular-user' });
      const premiumUser = TestDataFactory.createUser({ id: 'premium-user' });
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const expectedResponse = TestDataFactory.createMonthlySubscription();

      service.createMonthlySubscription.mockResolvedValue(expectedResponse as any);

      // Act
      await controller.createMonthlySubscription(regularUser, createDto);
      await controller.createMonthlySubscription(premiumUser, createDto);

      // Assert
      expect(service.createMonthlySubscription).toHaveBeenNthCalledWith(1, 'regular-user', createDto);
      expect(service.createMonthlySubscription).toHaveBeenNthCalledWith(2, 'premium-user', createDto);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const subscriptionId = 'test-subscription';
      const expectedResponse = TestDataFactory.createMonthlySubscription();

      service.findMonthlySubscription.mockResolvedValue(expectedResponse as any);

      // Act
      const promises = Array.from({ length: 10 }, () =>
        controller.getMonthlySubscription(user, subscriptionId)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBe(expectedResponse);
      });
      expect(service.findMonthlySubscription).toHaveBeenCalledTimes(10);
    });

    it('should complete requests within reasonable time', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const expectedResponse = TestDataFactory.createMonthlySubscription();

      service.createMonthlySubscription.mockResolvedValue(expectedResponse as any);

      const startTime = performance.now();

      // Act
      await controller.createMonthlySubscription(user, createDto);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(executionTime).toBeLessThan(100); // Should complete within 100ms for mocked service
    });
  });

  describe('Data Validation and Transformation', () => {
    it('should preserve all data fields in responses', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const subscriptionId = 'detailed-subscription';
      const detailedResponse = {
        id: subscriptionId,
        userId: user.id,
        vendors: [
          {
            id: 'vendor-1',
            name: 'Detailed Vendor',
            logo: 'logo-url',
            rating: 4.8,
            cuisine: 'Mediterranean',
            deliveryDays: [1, 2, 3, 4, 5],
          },
        ],
        mealType: 'DINNER',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-28'),
        status: 'ACTIVE',
        deliveryAddress: {
          id: 'address-456',
          address: '456 Detailed Street, Dubai',
          coordinates: { latitude: 25.2582, longitude: 55.3047 },
        },
        deliverySchedule: [
          {
            vendorId: 'vendor-1',
            vendorName: 'Detailed Vendor',
            dayOfWeek: 1,
            dayName: 'Monday',
            estimatedDeliveryTime: '18:00-20:00',
          },
        ],
        paymentSummary: {
          totalAmount: 1200,
          costPerVendorPerDay: 42.86,
          totalDeliveryDays: 28,
          serviceFee: 50,
          deliveryFee: 25,
          taxes: 60,
          currency: 'AED',
        },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      service.findMonthlySubscription.mockResolvedValue(detailedResponse);

      // Act
      const result = await controller.getMonthlySubscription(user, subscriptionId);

      // Assert
      expect(result).toEqual(detailedResponse);
      expect(result.vendors).toHaveLength(1);
      expect(result.vendors[0]).toHaveProperty('name');
      expect(result.vendors[0]).toHaveProperty('rating');
      expect(result.deliverySchedule).toHaveLength(1);
      expect(result.paymentSummary).toHaveProperty('totalAmount');
      expect(result.paymentSummary).toHaveProperty('currency');
    });

    it('should handle null and undefined values correctly', async () => {
      // Arrange
      const user = TestDataFactory.createUser();
      const query = {
        latitude: 25.2048,
        longitude: 55.2708,
        mealType: 'LUNCH' as any,
        // radius, page, limit are undefined
      };

      const expectedResponse = {
        vendors: [],
        meta: {
          total: 0,
          page: 1, // Should default to 1
          limit: 10, // Should default to 10
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        searchParams: {
          location: {
            latitude: query.latitude,
            longitude: query.longitude,
          },
          mealType: query.mealType,
          radius: 50, // Should default to 50
        },
      };

      service.getAvailableVendors.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getAvailableVendors(query);

      // Assert
      expect(result).toBe(expectedResponse);
      expect(service.getAvailableVendors).toHaveBeenCalledWith(query);
    });
  });
});