import { User } from '../../../users/entities/user.entity';
import { Vendor } from '../../../vendors/entities/vendor.entity';
import { MonthlySubscription } from '../../entities/monthly-subscription.entity';
import { MealSubscription } from '../../entities/meal-subscription.entity';
import { SubscriptionStatus } from '../../enums/subscription-status.enum';
import { MealType } from '../../../commons/enums/meal-type.enum';
import { VendorMenuStatus } from '../../../commons/enums/vendor-menu-status.enum';
import { Point } from 'geojson';
import { VendorMenu } from '../../../vendor-menu/entities/vendor-menu.entity';

export class TestDataFactory {
  static createUser(overrides: Partial<User> = {}): User {
    const defaultUser: Partial<User> = {
      id: 'test-user-id-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+971501234567',
      password: 'hashed-password',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    return Object.assign(new User(), { ...defaultUser, ...overrides });
  }

  static createVendor(overrides: Partial<Vendor> = {}): Vendor {
    const location: Point = {
      type: 'Point',
      coordinates: [55.2708, 25.2048], // Dubai coordinates
    };

    const businessHours = {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
      wednesday: { open: '09:00', close: '22:00' },
      thursday: { open: '09:00', close: '22:00' },
      friday: { open: '09:00', close: '22:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '21:00' },
    };

    const defaultVendor: Partial<Vendor> = {
      id: 'test-vendor-id-123',
      userId: 'test-user-id-123',
      businessName: 'Test Restaurant',
      address: '123 Test Street, Dubai',
      location,
      serviceRadius: 15,
      description: 'A test restaurant for unit testing',
      profilePhotoUrl: 'https://example.com/photo.jpg',
      coverPhotoUrl: 'https://example.com/cover.jpg',
      cuisineTypes: ['Italian', 'Mediterranean'],
      foodTypes: ['Vegetarian', 'Non-Vegetarian'],
      businessHours,
      acceptedPaymentMethods: ['cash', 'card'],
      minimumOrderAmount: 25,
      rating: 4.5,
      totalRatings: 150,
      averageDeliveryTime: 30,
      isOpen: true,
      closureMessage: null,
      monthlyCapacity: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    return Object.assign(new Vendor(), { ...defaultVendor, ...overrides });
  }

  static createVendorMenu(overrides: Partial<VendorMenu> = {}): VendorMenu {
    const weeklyMenu = {
      monday: {
        items: ['Pasta Primavera', 'Caesar Salad'],
        sideDishes: ['Garlic Bread', 'Side Salad'],
        extras: ['Extra Cheese', 'Olives'],
      },
      tuesday: {
        items: ['Grilled Chicken', 'Vegetable Soup'],
        sideDishes: ['Rice', 'Roasted Vegetables'],
        extras: ['Extra Sauce', 'Lemon'],
      },
      wednesday: {
        items: ['Fish Fillet', 'Rice Pilaf'],
        sideDishes: ['Steamed Vegetables', 'Quinoa'],
        extras: ['Herbs', 'Butter'],
      },
      thursday: {
        items: ['Beef Stir Fry', 'Garlic Bread'],
        sideDishes: ['Noodles', 'Mixed Salad'],
        extras: ['Soy Sauce', 'Sesame Seeds'],
      },
      friday: {
        items: ['Seafood Pasta', 'Greek Salad'],
        sideDishes: ['Focaccia', 'Olives'],
        extras: ['Parmesan', 'Balsamic'],
      },
      saturday: {
        items: ['Weekend Special', 'Soup of the Day'],
        sideDishes: ['Artisan Bread', 'Fresh Salad'],
        extras: ['Special Sauce', 'Fresh Herbs'],
      },
      sunday: {
        items: ['Sunday Roast', 'Seasonal Vegetables'],
        sideDishes: ['Mashed Potatoes', 'Gravy'],
        extras: ['Yorkshire Pudding', 'Mint Sauce'],
      },
    };

    const defaultMenu: Partial<VendorMenu> = {
      id: 'test-menu-id-123',
      vendorId: 'test-vendor-id-123',
      mealType: MealType.LUNCH,
      description: 'Weekly lunch menu',
      price: 25,
      weeklyMenu,
      isActive: true,
      status: VendorMenuStatus.ACTIVE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    return Object.assign(new VendorMenu(), { ...defaultMenu, ...overrides });
  }

  static createMonthlySubscription(
    overrides: Partial<MonthlySubscription> = {},
  ): MonthlySubscription {
    const defaultSubscription: Partial<MonthlySubscription> = {
      id: 'test-monthly-sub-123',
      userId: 'test-user-id-123',
      vendorIds: ['vendor-1', 'vendor-2', 'vendor-3'],
      individualSubscriptionIds: ['sub-1', 'sub-2', 'sub-3'],
      mealType: MealType.LUNCH,
      totalPrice: 899.99,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28'),
      status: SubscriptionStatus.ACTIVE,
      addressId: 'test-address-123',
      paymentId: 'test-payment-123',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    };

    return Object.assign(new MonthlySubscription(), {
      ...defaultSubscription,
      ...overrides,
    });
  }

  static createMealSubscription(
    overrides: Partial<MealSubscription> = {},
  ): MealSubscription {
    const defaultSubscription: Partial<MealSubscription> = {
      id: 'test-meal-sub-123',
      userId: 'test-user-id-123',
      vendorId: 'test-vendor-id-123',
      mealType: MealType.LUNCH,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28'),
      price: 299.99,
      status: SubscriptionStatus.ACTIVE,
      monthlySubscriptionId: 'test-monthly-sub-123',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    };

    return Object.assign(new MealSubscription(), {
      ...defaultSubscription,
      ...overrides,
    });
  }

  static createMultipleVendors(count: number): Vendor[] {
    const vendors: Vendor[] = [];
    const locations = [
      [55.2708, 25.2048], // Dubai
      [55.3047, 25.2582], // Business Bay
      [55.1562, 25.0657], // JBR
      [55.3826, 25.3548], // Deira
    ];

    const businessNames = [
      'Italian Corner',
      'Spice Garden',
      'Mediterranean Delights',
      'Fresh & Healthy',
      'The Gourmet Kitchen',
    ];

    const cuisineTypes = [
      ['Italian', 'European'],
      ['Indian', 'Asian'],
      ['Mediterranean', 'Lebanese'],
      ['Healthy', 'Salads'],
      ['International', 'Fusion'],
    ];

    for (let i = 0; i < count; i++) {
      const location: Point = {
        type: 'Point',
        coordinates: locations[i % locations.length],
      };

      vendors.push(
        this.createVendor({
          id: `test-vendor-${i + 1}`,
          userId: `test-user-${i + 1}`,
          businessName: businessNames[i % businessNames.length],
          location,
          cuisineTypes: cuisineTypes[i % cuisineTypes.length],
          rating: 4.0 + Math.random(),
          totalRatings: Math.floor(Math.random() * 200) + 50,
          monthlyCapacity: 50 + Math.floor(Math.random() * 50),
        }),
      );
    }

    return vendors;
  }

  static createUserAddress(overrides: any = {}): any {
    const defaultAddress = {
      id: 'test-address-123',
      userId: 'test-user-id-123',
      title: 'Home',
      addressLine1: '123 Test Street',
      addressLine2: 'Apt 4B',
      city: 'Dubai',
      country: 'UAE',
      latitude: 25.2048,
      longitude: 55.2708,
      isDefault: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    return { ...defaultAddress, ...overrides };
  }

  static createPaymentMethod(overrides: any = {}): any {
    const defaultPayment = {
      id: 'test-payment-123',
      userId: 'test-user-id-123',
      type: 'card',
      cardLastFour: '4242',
      cardBrand: 'visa',
      isDefault: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    return { ...defaultPayment, ...overrides };
  }

  static createValidationResult(overrides: any = {}): any {
    const defaultResult = {
      isValid: true,
      vendors: [],
      delivery: {
        canDeliver: true,
        estimatedDeliveryTime: 30,
        deliveryFee: 0,
        issues: [],
      },
      schedule: {
        isValidStartDate: true,
        deliveryDaysCount: 28,
        issues: [],
      },
      errors: [],
      warnings: [],
      validatedAt: new Date(),
    };

    return { ...defaultResult, ...overrides };
  }

  static createAvailableVendorsQuery(overrides: any = {}): any {
    const defaultQuery = {
      latitude: 25.2048,
      longitude: 55.2708,
      mealType: MealType.LUNCH,
      radius: 10,
      page: 1,
      limit: 10,
    };

    return { ...defaultQuery, ...overrides };
  }

  static createMonthlyPreviewQuery(overrides: any = {}): any {
    const defaultQuery = {
      vendorIds: 'vendor-1,vendor-2,vendor-3',
      mealType: MealType.LUNCH,
      startDate: '2024-02-01',
    };

    return { ...defaultQuery, ...overrides };
  }

  static createCreateMonthlySubscriptionDto(overrides: any = {}): any {
    const defaultDto = {
      vendorIds: ['vendor-1', 'vendor-2', 'vendor-3'],
      mealType: MealType.LUNCH,
      startDate: '2024-02-01',
      addressId: 'test-address-123',
      paymentMethodId: 'test-payment-123',
    };

    return { ...defaultDto, ...overrides };
  }

  static createValidateMonthlySelectionDto(overrides: any = {}): any {
    const defaultDto = {
      vendorIds: ['vendor-1', 'vendor-2', 'vendor-3'],
      mealType: MealType.LUNCH,
      startDate: '2024-02-01',
      userLocation: {
        latitude: 25.2048,
        longitude: 55.2708,
      },
    };

    return { ...defaultDto, ...overrides };
  }

  static createMockQueryRunner(): any {
    return {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getRepository: jest.fn(),
      },
    };
  }

  static createMockRepository<T>(): any {
    return {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getManyAndCount: jest.fn(),
        getCount: jest.fn(),
      })),
      query: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };
  }

  static createMockDataSource(): any {
    return {
      createQueryRunner: jest.fn(() => this.createMockQueryRunner()),
      getRepository: jest.fn(() => this.createMockRepository()),
      transaction: jest.fn(),
    };
  }
}
