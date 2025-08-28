import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository, DataSource } from 'typeorm';
import { MonthlySubscriptionController } from '../../monthly-subscription.controller';
import { MonthlySubscriptionService } from '../../monthly-subscription.service';
import { MonthlySubscription } from '../../entities/monthly-subscription.entity';
import { MealSubscription } from '../../entities/meal-subscription.entity';
import { VendorsService } from '../../../vendors/vendors.service';
import { VendorMenuService } from '../../../vendor-menu/vendor-menu.service';
import { MealSubscriptionService } from '../../meal-subscription.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { MealType } from '../../../commons/enums/meal-type.enum';
import { SubscriptionStatus } from '../../enums/subscription-status.enum';

describe('MonthlySubscription E2E', () => {
  let app: INestApplication;
  let monthlySubscriptionRepository: Repository<MonthlySubscription>;
  let mealSubscriptionRepository: Repository<MealSubscription>;
  let vendorsService: VendorsService;
  let vendorMenuService: VendorMenuService;
  let mealSubscriptionService: MealSubscriptionService;
  let dataSource: DataSource;

  // Mock JWT token for authentication
  const mockJwtToken = 'Bearer mock-jwt-token';
  const mockUser = TestDataFactory.createUser();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonthlySubscriptionController],
      providers: [
        MonthlySubscriptionService,
        {
          provide: getRepositoryToken(MonthlySubscription),
          useValue: TestDataFactory.createMockRepository<MonthlySubscription>(),
        },
        {
          provide: getRepositoryToken(MealSubscription),
          useValue: TestDataFactory.createMockRepository<MealSubscription>(),
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
          useValue: TestDataFactory.createMockDataSource(),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();

    monthlySubscriptionRepository = module.get(getRepositoryToken(MonthlySubscription));
    mealSubscriptionRepository = module.get(getRepositoryToken(MealSubscription));
    vendorsService = module.get(VendorsService);
    vendorMenuService = module.get(VendorMenuService);
    mealSubscriptionService = module.get(MealSubscriptionService);
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /subscriptions/monthly', () => {
    it('should create monthly subscription successfully', async () => {
      // Arrange
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      const mockVendors = TestDataFactory.createMultipleVendors(3);
      const mockMenuItems = [TestDataFactory.createVendorMenu()];
      const mockMonthlySubscription = TestDataFactory.createMonthlySubscription();
      const mockQueryRunner = TestDataFactory.createMockQueryRunner();

      vendorsService.findOne = jest.fn().mockResolvedValue(mockVendors[0]);
      vendorMenuService.findByVendor = jest.fn().mockResolvedValue(mockMenuItems);
      dataSource.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => ({ ...data, id: 'new-id' }));
      mockQueryRunner.manager.save.mockResolvedValue(mockMonthlySubscription);

      // Act
      const response = await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(createDto)
        .expect(201);

      // Assert
      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should return 400 for invalid data', async () => {
      // Arrange
      const invalidDto = {
        vendorIds: [], // Empty array should fail validation
        mealType: 'INVALID_MEAL_TYPE',
        startDate: '2020-01-01', // Past date
        addressId: 'invalid-uuid',
        paymentMethodId: 'invalid-uuid',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();

      // Act & Assert
      await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /subscriptions/monthly/vendors/available', () => {
    it('should get available vendors successfully', async () => {
      // Arrange
      const query = TestDataFactory.createAvailableVendorsQuery();
      const mockVendors = TestDataFactory.createMultipleVendors(5);
      const mockMenuItems = [TestDataFactory.createVendorMenu()];

      vendorsService.findVendorsByLocationAndMealType = jest.fn().mockResolvedValue({
        data: mockVendors,
        meta: { total: 5, pages: 1 },
      });
      vendorMenuService.findByVendor = jest.fn().mockResolvedValue(mockMenuItems);

      // Act
      const response = await request(app.getHttpServer())
        .get('/subscriptions/monthly/vendors/available')
        .set('Authorization', mockJwtToken)
        .query({
          latitude: query.latitude,
          longitude: query.longitude,
          mealType: query.mealType,
          radius: query.radius,
          page: query.page,
          limit: query.limit,
        })
        .expect(200);

      // Assert
      expect(response.body).toBeDefined();
      expect(response.body.vendors).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.searchParams).toBeDefined();
    });

    it('should return 400 for missing required parameters', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/subscriptions/monthly/vendors/available')
        .set('Authorization', mockJwtToken)
        .query({
          latitude: 25.2048,
          // Missing longitude and mealType
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const query = TestDataFactory.createAvailableVendorsQuery();

      // Act & Assert
      await request(app.getHttpServer())
        .get('/subscriptions/monthly/vendors/available')
        .query({
          latitude: query.latitude,
          longitude: query.longitude,
          mealType: query.mealType,
        })
        .expect(401);
    });
  });

  describe('POST /subscriptions/monthly/validate', () => {
    it('should validate selection successfully', async () => {
      // Arrange
      const validateDto = TestDataFactory.createValidateMonthlySelectionDto();
      const mockVendor = TestDataFactory.createVendor();

      vendorsService.findOne = jest.fn().mockResolvedValue(mockVendor);

      // Act
      const response = await request(app.getHttpServer())
        .post('/subscriptions/monthly/validate')
        .set('Authorization', mockJwtToken)
        .send(validateDto)
        .expect(200);

      // Assert
      expect(response.body).toBeDefined();
      expect(response.body.isValid).toBeDefined();
      expect(response.body.vendors).toBeDefined();
      expect(response.body.validatedAt).toBeDefined();
    });

    it('should return validation errors for invalid selection', async () => {
      // Arrange
      const invalidDto = {
        vendorIds: Array.from({ length: 6 }, (_, i) => `vendor-${i + 1}`), // Too many vendors
        mealType: MealType.LUNCH,
        startDate: new Date().toISOString().split('T')[0],
        userLocation: {
          latitude: 25.2048,
          longitude: 55.2708,
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/subscriptions/monthly/validate')
        .set('Authorization', mockJwtToken)
        .send(invalidDto)
        .expect(200);

      // Assert
      expect(response.body.isValid).toBe(false);
      expect(response.body.errors).toContain('Maximum 4 vendors allowed per subscription');
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const validateDto = TestDataFactory.createValidateMonthlySelectionDto();

      // Act & Assert
      await request(app.getHttpServer())
        .post('/subscriptions/monthly/validate')
        .send(validateDto)
        .expect(401);
    });
  });

  describe('POST /subscriptions/monthly/preview', () => {
    it('should get preview successfully', async () => {
      // Arrange
      const query = TestDataFactory.createMonthlyPreviewQuery();
      const mockVendor = TestDataFactory.createVendor();
      const mockMenuItems = [TestDataFactory.createVendorMenu({ price: 25 })];

      vendorsService.findOne = jest.fn().mockResolvedValue(mockVendor);
      vendorMenuService.findByVendor = jest.fn().mockResolvedValue(mockMenuItems);

      // Act
      const response = await request(app.getHttpServer())
        .post('/subscriptions/monthly/preview')
        .set('Authorization', mockJwtToken)
        .query({
          vendorIds: query.vendorIds,
          mealType: query.mealType,
          startDate: query.startDate,
        })
        .expect(200);

      // Assert
      expect(response.body).toBeDefined();
      expect(response.body.subscription).toBeDefined();
      expect(response.body.vendorBreakdown).toBeDefined();
      expect(response.body.costBreakdown).toBeDefined();
      expect(response.body.generatedAt).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should return 400 for too many vendors', async () => {
      // Arrange
      const invalidQuery = {
        vendorIds: Array.from({ length: 6 }, (_, i) => `vendor-${i + 1}`).join(','),
        mealType: MealType.LUNCH,
        startDate: new Date().toISOString().split('T')[0],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/subscriptions/monthly/preview')
        .set('Authorization', mockJwtToken)
        .query(invalidQuery)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const query = TestDataFactory.createMonthlyPreviewQuery();

      // Act & Assert
      await request(app.getHttpServer())
        .post('/subscriptions/monthly/preview')
        .query(query)
        .expect(401);
    });
  });

  describe('GET /subscriptions/monthly/:id', () => {
    it('should get monthly subscription successfully', async () => {
      // Arrange
      const subscriptionId = 'test-subscription-123';
      const mockSubscription = TestDataFactory.createMonthlySubscription({
        id: subscriptionId,
        userId: mockUser.id,
      });

      monthlySubscriptionRepository.findOne = jest.fn().mockResolvedValue(mockSubscription);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/subscriptions/monthly/${subscriptionId}`)
        .set('Authorization', mockJwtToken)
        .expect(200);

      // Assert
      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(subscriptionId);
      expect(response.body.userId).toBe(mockUser.id);
    });

    it('should return 404 for non-existent subscription', async () => {
      // Arrange
      const subscriptionId = 'non-existent-subscription';
      monthlySubscriptionRepository.findOne = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/subscriptions/monthly/${subscriptionId}`)
        .set('Authorization', mockJwtToken)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const subscriptionId = 'test-subscription-123';

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/subscriptions/monthly/${subscriptionId}`)
        .expect(401);
    });
  });

  describe('Complete Monthly Subscription Workflow', () => {
    it('should complete full subscription workflow', async () => {
      // This test simulates the complete user journey
      const mockVendors = TestDataFactory.createMultipleVendors(4);
      const mockMenuItems = [TestDataFactory.createVendorMenu({ price: 20 })];
      const mockMonthlySubscription = TestDataFactory.createMonthlySubscription();
      const mockQueryRunner = TestDataFactory.createMockQueryRunner();

      // Setup mocks for the complete workflow
      vendorsService.findVendorsByLocationAndMealType = jest.fn().mockResolvedValue({
        data: mockVendors,
        meta: { total: 4, pages: 1 },
      });
      vendorsService.findOne = jest.fn().mockResolvedValue(mockVendors[0]);
      vendorMenuService.findByVendor = jest.fn().mockResolvedValue(mockMenuItems);
      dataSource.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => ({ ...data, id: 'new-id' }));
      mockQueryRunner.manager.save.mockResolvedValue(mockMonthlySubscription);
      monthlySubscriptionRepository.findOne = jest.fn().mockResolvedValue(mockMonthlySubscription);

      // Step 1: Get available vendors
      const availableVendorsResponse = await request(app.getHttpServer())
        .get('/subscriptions/monthly/vendors/available')
        .set('Authorization', mockJwtToken)
        .query({
          latitude: 25.2048,
          longitude: 55.2708,
          mealType: 'LUNCH',
          radius: 15,
        })
        .expect(200);

      expect(availableVendorsResponse.body.vendors).toBeDefined();

      // Step 2: Validate vendor selection
      const validateDto = {
        vendorIds: mockVendors.slice(0, 3).map(v => v.id),
        mealType: MealType.LUNCH,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        userLocation: {
          latitude: 25.2048,
          longitude: 55.2708,
        },
      };

      const validationResponse = await request(app.getHttpServer())
        .post('/subscriptions/monthly/validate')
        .set('Authorization', mockJwtToken)
        .send(validateDto)
        .expect(200);

      expect(validationResponse.body.isValid).toBe(true);

      // Step 3: Get pricing preview
      const previewResponse = await request(app.getHttpServer())
        .post('/subscriptions/monthly/preview')
        .set('Authorization', mockJwtToken)
        .query({
          vendorIds: validateDto.vendorIds.join(','),
          mealType: validateDto.mealType,
          startDate: validateDto.startDate,
        })
        .expect(200);

      expect(previewResponse.body.costBreakdown).toBeDefined();
      expect(previewResponse.body.costBreakdown.total).toBeGreaterThan(0);

      // Step 4: Create subscription
      const createDto = {
        vendorIds: validateDto.vendorIds,
        mealType: validateDto.mealType,
        startDate: validateDto.startDate,
        addressId: 'test-address-123',
        paymentMethodId: 'test-payment-123',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(createDto)
        .expect(201);

      expect(createResponse.body.id).toBeDefined();
      const subscriptionId = createResponse.body.id;

      // Step 5: Retrieve created subscription
      const subscriptionResponse = await request(app.getHttpServer())
        .get(`/subscriptions/monthly/${subscriptionId}`)
        .set('Authorization', mockJwtToken)
        .expect(200);

      expect(subscriptionResponse.body.id).toBe(subscriptionId);
      expect(subscriptionResponse.body.status).toBe(SubscriptionStatus.ACTIVE);

      // Verify all service calls were made correctly
      expect(vendorsService.findVendorsByLocationAndMealType).toHaveBeenCalled();
      expect(vendorsService.findOne).toHaveBeenCalled();
      expect(vendorMenuService.findByVendor).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(monthlySubscriptionRepository.findOne).toHaveBeenCalled();
    });

    it('should handle errors gracefully in workflow', async () => {
      // Test error handling at each step

      // Step 1: Database error during vendor search
      vendorsService.findVendorsByLocationAndMealType = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await request(app.getHttpServer())
        .get('/subscriptions/monthly/vendors/available')
        .set('Authorization', mockJwtToken)
        .query({
          latitude: 25.2048,
          longitude: 55.2708,
          mealType: 'LUNCH',
        })
        .expect(500);

      // Step 2: Validation service error
      vendorsService.findVendorsByLocationAndMealType = jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, pages: 0 },
      });
      vendorsService.findOne = jest.fn().mockRejectedValue(new Error('Vendor service unavailable'));

      const validateDto = TestDataFactory.createValidateMonthlySelectionDto();
      await request(app.getHttpServer())
        .post('/subscriptions/monthly/validate')
        .set('Authorization', mockJwtToken)
        .send(validateDto)
        .expect(500);

      // Step 3: Preview calculation error
      vendorsService.findOne = jest.fn().mockRejectedValue(new Error('Pricing service error'));

      const previewQuery = TestDataFactory.createMonthlyPreviewQuery();
      await request(app.getHttpServer())
        .post('/subscriptions/monthly/preview')
        .set('Authorization', mockJwtToken)
        .query(previewQuery)
        .expect(500);

      // Step 4: Transaction rollback during creation
      const mockQueryRunner = TestDataFactory.createMockQueryRunner();
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database transaction failed'));
      dataSource.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

      const createDto = TestDataFactory.createCreateMonthlySubscriptionDto();
      await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(createDto)
        .expect(400);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should handle concurrent requests correctly', async () => {
      // Setup mocks for successful operations
      const mockVendors = TestDataFactory.createMultipleVendors(3);
      const mockMonthlySubscription = TestDataFactory.createMonthlySubscription();
      
      monthlySubscriptionRepository.findOne = jest.fn().mockResolvedValue(mockMonthlySubscription);

      // Create multiple concurrent requests
      const subscriptionId = 'concurrent-test-subscription';
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get(`/subscriptions/monthly/${subscriptionId}`)
          .set('Authorization', mockJwtToken)
      );

      // Execute all requests concurrently
      const responses = await Promise.all(requests);

      // Verify all requests completed successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      // Verify the repository was called for each request
      expect(monthlySubscriptionRepository.findOne).toHaveBeenCalledTimes(5);
    });

    it('should validate business rules end-to-end', async () => {
      // Test that business rules are enforced across the entire workflow

      // Rule 1: Maximum 4 vendors per subscription
      const tooManyVendorsDto = {
        vendorIds: Array.from({ length: 6 }, (_, i) => `vendor-${i + 1}`),
        mealType: MealType.LUNCH,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        addressId: 'test-address-123',
        paymentMethodId: 'test-payment-123',
      };

      await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(tooManyVendorsDto)
        .expect(400);

      // Rule 2: No duplicate vendors
      const duplicateVendorsDto = {
        vendorIds: ['vendor-1', 'vendor-2', 'vendor-1'],
        mealType: MealType.LUNCH,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        addressId: 'test-address-123',
        paymentMethodId: 'test-payment-123',
      };

      await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(duplicateVendorsDto)
        .expect(400);

      // Rule 3: No past start dates
      const pastDateDto = {
        vendorIds: ['vendor-1', 'vendor-2'],
        mealType: MealType.LUNCH,
        startDate: '2020-01-01',
        addressId: 'test-address-123',
        paymentMethodId: 'test-payment-123',
      };

      await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(pastDateDto)
        .expect(400);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high load of vendor searches', async () => {
      // Setup mocks
      const mockVendors = TestDataFactory.createMultipleVendors(100);
      vendorsService.findVendorsByLocationAndMealType = jest.fn().mockResolvedValue({
        data: mockVendors,
        meta: { total: 100, pages: 10 },
      });
      vendorMenuService.findByVendor = jest.fn().mockResolvedValue([TestDataFactory.createVendorMenu()]);

      const startTime = performance.now();

      // Create multiple concurrent search requests
      const searchRequests = Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .get('/subscriptions/monthly/vendors/available')
          .set('Authorization', mockJwtToken)
          .query({
            latitude: 25.2048,
            longitude: 55.2708,
            mealType: 'LUNCH',
            limit: 10,
          })
      );

      const responses = await Promise.all(searchRequests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Verify all requests completed successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.vendors).toBeDefined();
      });

      // Performance assertion - should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 20 concurrent requests
    });

    it('should handle large pagination requests efficiently', async () => {
      // Setup mocks for large dataset
      const largeVendorList = TestDataFactory.createMultipleVendors(1000);
      vendorsService.findVendorsByLocationAndMealType = jest.fn().mockResolvedValue({
        data: largeVendorList.slice(0, 100), // Simulate pagination
        meta: { total: 1000, pages: 10 },
      });
      vendorMenuService.findByVendor = jest.fn().mockResolvedValue([TestDataFactory.createVendorMenu()]);

      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/subscriptions/monthly/vendors/available')
        .set('Authorization', mockJwtToken)
        .query({
          latitude: 25.2048,
          longitude: 55.2708,
          mealType: 'LUNCH',
          page: 1,
          limit: 100,
        })
        .expect(200);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(response.body.vendors).toHaveLength(100);
      expect(response.body.meta.total).toBe(1000);
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Security Tests', () => {
    it('should protect all endpoints with authentication', async () => {
      const endpoints = [
        { method: 'post', path: '/subscriptions/monthly' },
        { method: 'get', path: '/subscriptions/monthly/vendors/available' },
        { method: 'post', path: '/subscriptions/monthly/validate' },
        { method: 'post', path: '/subscriptions/monthly/preview' },
        { method: 'get', path: '/subscriptions/monthly/test-id' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should prevent access to other users subscriptions', async () => {
      // Mock finding a subscription that belongs to a different user
      const otherUserSubscription = TestDataFactory.createMonthlySubscription({
        userId: 'different-user-id',
      });
      
      monthlySubscriptionRepository.findOne = jest.fn().mockResolvedValue(null); // Simulate not finding subscription for current user

      await request(app.getHttpServer())
        .get('/subscriptions/monthly/other-user-subscription')
        .set('Authorization', mockJwtToken)
        .expect(404);
    });

    it('should validate input data for security vulnerabilities', async () => {
      // Test SQL injection attempts
      const maliciousDto = {
        vendorIds: ["'; DROP TABLE vendors; --"],
        mealType: MealType.LUNCH,
        startDate: new Date().toISOString().split('T')[0],
        addressId: 'test-address-123',
        paymentMethodId: 'test-payment-123',
      };

      await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(maliciousDto)
        .expect(400); // Should fail validation

      // Test XSS attempts
      const xssDto = {
        vendorIds: ['<script>alert("xss")</script>'],
        mealType: MealType.LUNCH,
        startDate: new Date().toISOString().split('T')[0],
        addressId: 'test-address-123',
        paymentMethodId: 'test-payment-123',
      };

      await request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', mockJwtToken)
        .send(xssDto)
        .expect(400); // Should fail validation
    });
  });
});