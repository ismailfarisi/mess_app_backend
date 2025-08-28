# Phase 1: Monthly Vendor Selection APIs - Architecture Specification

## Executive Summary

This document provides a comprehensive architecture specification for implementing a monthly meal subscription system where customers can select up to 4 vendors per month with the same meal type. The system extends the existing NestJS/TypeORM codebase while maintaining consistency with established patterns.

### Business Requirements Clarification
- **Meal Type Constraint**: All 4 vendors in a monthly subscription must offer the same meal type
- **Pricing**: No discounts applied initially - total cost is sum of individual vendor subscriptions
- **Billing Cycle**: Flexible start dates - users can start monthly subscriptions anytime
- **Individual Subscriptions**: Kept separate from monthly subscriptions (no migration)

## 1. Database Schema Design

### 1.1 MonthlySubscription Entity

```typescript
// src/monthly-subscription/entities/monthly-subscription.entity.ts
@Entity('monthly_subscriptions')
export class MonthlySubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: MealType,
  })
  mealType: MealType;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('jsonb')
  selectedVendors: {
    vendorId: string;
    menuId: string;
    price: number;
    businessName: string;
  }[];

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => MealSubscription, (subscription) => subscription.monthlySubscriptionId)
  individualSubscriptions: MealSubscription[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.2 MealSubscription Entity Updates

```typescript
// Add to existing MealSubscription entity
@Column('uuid', { nullable: true })
monthlySubscriptionId: string;

@ManyToOne(() => MonthlySubscription, (monthlySubscription) => monthlySubscription.individualSubscriptions)
@JoinColumn({ name: 'monthlySubscriptionId' })
monthlySubscription: MonthlySubscription;
```

### 1.3 Database Migration Strategy

```sql
-- Migration: AddMonthlySubscriptionTable
CREATE TABLE monthly_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "mealType" meal_type_enum NOT NULL,
  status subscription_status_enum DEFAULT 'active',
  "totalPrice" DECIMAL(10,2) NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "selectedVendors" JSONB NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Add index for efficient queries
CREATE INDEX idx_monthly_subscriptions_user_status ON monthly_subscriptions("userId", status);
CREATE INDEX idx_monthly_subscriptions_meal_type ON monthly_subscriptions("mealType");
CREATE INDEX idx_monthly_subscriptions_dates ON monthly_subscriptions("startDate", "endDate");

-- Add monthly subscription reference to meal_subscriptions
ALTER TABLE meal_subscriptions ADD COLUMN "monthlySubscriptionId" UUID REFERENCES monthly_subscriptions(id) ON DELETE CASCADE;
CREATE INDEX idx_meal_subscriptions_monthly ON meal_subscriptions("monthlySubscriptionId");
```

## 2. DTO Architecture

### 2.1 Request DTOs

```typescript
// src/monthly-subscription/dto/create-monthly-subscription.dto.ts
export class CreateMonthlySubscriptionDto {
  @IsEnum(MealType)
  @ApiProperty({ enum: MealType, description: 'Type of meal for all vendors' })
  mealType: MealType;

  @IsDateString()
  @ApiProperty({ description: 'Subscription start date (YYYY-MM-DD)' })
  startDate: string;

  @IsDateString()
  @ApiProperty({ description: 'Subscription end date (YYYY-MM-DD)' })
  endDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => VendorSelectionDto)
  @ApiProperty({ type: [VendorSelectionDto], description: 'Selected vendors (1-4)' })
  selectedVendors: VendorSelectionDto[];
}

export class VendorSelectionDto {
  @IsUUID()
  @ApiProperty({ description: 'Vendor UUID' })
  vendorId: string;

  @IsUUID()
  @ApiProperty({ description: 'Menu UUID' })
  menuId: string;
}

// src/monthly-subscription/dto/validate-selection.dto.ts
export class ValidateSelectionDto {
  @IsEnum(MealType)
  @ApiProperty({ enum: MealType })
  mealType: MealType;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @ApiProperty({ description: 'Customer latitude' })
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @ApiProperty({ description: 'Customer longitude' })
  longitude: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => VendorSelectionDto)
  @ApiProperty({ type: [VendorSelectionDto] })
  selectedVendors: VendorSelectionDto[];
}

// src/monthly-subscription/dto/monthly-vendor-query.dto.ts
export class MonthlyVendorQueryDto extends QueryVendorDto {
  @IsEnum(MealType)
  @ApiProperty({ enum: MealType, description: 'Required meal type for monthly subscription' })
  mealType: MealType;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @ApiProperty({ description: 'Customer latitude' })
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @ApiProperty({ description: 'Customer longitude' })
  longitude: number;
}

// src/monthly-subscription/dto/cost-preview.dto.ts
export class CostPreviewDto {
  @IsEnum(MealType)
  @ApiProperty({ enum: MealType })
  mealType: MealType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => VendorSelectionDto)
  @ApiProperty({ type: [VendorSelectionDto] })
  selectedVendors: VendorSelectionDto[];
}
```

### 2.2 Response DTOs

```typescript
// src/monthly-subscription/dto/monthly-subscription-response.dto.ts
export class MonthlySubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MealType })
  mealType: MealType;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ type: [SelectedVendorDto] })
  selectedVendors: SelectedVendorDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SelectedVendorDto {
  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  menuId: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  address: string;

  @ApiProperty()
  rating: number;
}

// src/monthly-subscription/dto/validation-response.dto.ts
export class ValidationResponseDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty({ type: [ValidationErrorDto] })
  errors: ValidationErrorDto[];

  @ApiProperty()
  totalCost: number;
}

export class ValidationErrorDto {
  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  menuId: string;

  @ApiProperty()
  error: string;

  @ApiProperty()
  code: 'VENDOR_NOT_FOUND' | 'MENU_NOT_FOUND' | 'MEAL_TYPE_MISMATCH' | 'VENDOR_UNAVAILABLE' | 'LOCATION_OUT_OF_RANGE';
}

// src/monthly-subscription/dto/cost-preview-response.dto.ts
export class CostPreviewResponseDto {
  @ApiProperty({ type: [VendorCostDto] })
  vendorCosts: VendorCostDto[];

  @ApiProperty()
  totalMonthlyCost: number;

  @ApiProperty()
  savings: number; // Future use for discounts

  @ApiProperty()
  breakdown: {
    subtotal: number;
    discount: number;
    total: number;
  };
}

export class VendorCostDto {
  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  menuDescription: string;

  @ApiProperty()
  price: number;
}
```

## 3. Service Layer Design

### 3.1 MonthlySubscriptionService

```typescript
// src/monthly-subscription/monthly-subscription.service.ts
@Injectable()
export class MonthlySubscriptionService {
  constructor(
    @InjectRepository(MonthlySubscription)
    private readonly monthlySubscriptionRepository: Repository<MonthlySubscription>,
    private readonly mealSubscriptionService: MealSubscriptionService,
    private readonly vendorsService: VendorsService,
    private readonly vendorMenuService: VendorMenuService,
  ) {}

  // Core business methods
  async createMonthlySubscription(userId: string, createDto: CreateMonthlySubscriptionDto): Promise<MonthlySubscription>
  async getAvailableVendorsForMonthly(query: MonthlyVendorQueryDto): Promise<VendorsListResponseDto>
  async validateVendorSelection(validateDto: ValidateSelectionDto): Promise<ValidationResponseDto>
  async getCostPreview(costDto: CostPreviewDto): Promise<CostPreviewResponseDto>
  async findMonthlySubscription(userId: string, id: string): Promise<MonthlySubscription>
  
  // Helper methods
  private async validateVendorAndMenu(vendorId: string, menuId: string, mealType: MealType): Promise<ValidationErrorDto | null>
  private async checkVendorAvailability(vendorId: string, latitude: number, longitude: number): Promise<boolean>
  private async calculateTotalCost(selectedVendors: VendorSelectionDto[]): Promise<number>
  private async createIndividualSubscriptions(monthlySubscription: MonthlySubscription): Promise<void>
}
```

### 3.2 Business Logic Methods Implementation

```typescript
// Key business logic implementations

async createMonthlySubscription(userId: string, createDto: CreateMonthlySubscriptionDto): Promise<MonthlySubscription> {
  // 1. Validate all selected vendors and menus
  const validationResults = await Promise.all(
    createDto.selectedVendors.map(selection => 
      this.validateVendorAndMenu(selection.vendorId, selection.menuId, createDto.mealType)
    )
  );

  const errors = validationResults.filter(result => result !== null);
  if (errors.length > 0) {
    throw new BadRequestException('Invalid vendor selections', errors);
  }

  // 2. Calculate total cost
  const totalPrice = await this.calculateTotalCost(createDto.selectedVendors);

  // 3. Build selected vendors data
  const selectedVendorsData = await this.buildSelectedVendorsData(createDto.selectedVendors);

  // 4. Create monthly subscription
  const monthlySubscription = this.monthlySubscriptionRepository.create({
    userId,
    mealType: createDto.mealType,
    totalPrice,
    startDate: new Date(createDto.startDate),
    endDate: new Date(createDto.endDate),
    selectedVendors: selectedVendorsData,
  });

  const savedSubscription = await this.monthlySubscriptionRepository.save(monthlySubscription);

  // 5. Create individual meal subscriptions
  await this.createIndividualSubscriptions(savedSubscription);

  return savedSubscription;
}

async getAvailableVendorsForMonthly(query: MonthlyVendorQueryDto): Promise<VendorsListResponseDto> {
  // Leverage existing VendorsService.findVendorsByLocationAndMealType
  return await this.vendorsService.findVendorsByLocationAndMealType(
    query.latitude,
    query.longitude,
    query.mealType,
    query
  );
}
```

## 4. Controller Architecture

### 4.1 MonthlySubscriptionController

```typescript
// src/monthly-subscription/monthly-subscription.controller.ts
@ApiTags('monthly-subscriptions')
@Controller('subscriptions/monthly')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MonthlySubscriptionController {
  constructor(
    private readonly monthlySubscriptionService: MonthlySubscriptionService,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create monthly subscription',
    description: 'Create a new monthly subscription with up to 4 vendors of the same meal type'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Monthly subscription created successfully',
    type: MonthlySubscriptionResponseDto 
  })
  createMonthlySubscription(
    @GetUser() user: User,
    @Body() createDto: CreateMonthlySubscriptionDto,
  ): Promise<MonthlySubscriptionResponseDto> {
    return this.monthlySubscriptionService.createMonthlySubscription(user.id, createDto);
  }

  @Get('/vendors/available')
  @ApiOperation({ 
    summary: 'Get available vendors for monthly selection',
    description: 'Returns vendors that offer the specified meal type within service radius'
  })
  getAvailableVendors(
    @Query() query: MonthlyVendorQueryDto,
  ): Promise<VendorsListResponseDto> {
    return this.monthlySubscriptionService.getAvailableVendorsForMonthly(query);
  }

  @Post('/validate')
  @ApiOperation({ 
    summary: 'Validate vendor selection',
    description: 'Validates selected vendors for availability, meal type consistency, and location constraints'
  })
  validateSelection(
    @Body() validateDto: ValidateSelectionDto,
  ): Promise<ValidationResponseDto> {
    return this.monthlySubscriptionService.validateVendorSelection(validateDto);
  }

  @Post('/preview')
  @ApiOperation({ 
    summary: 'Get cost preview',
    description: 'Calculate total cost and breakdown for selected vendors'
  })
  getCostPreview(
    @Body() costDto: CostPreviewDto,
  ): Promise<CostPreviewResponseDto> {
    return this.monthlySubscriptionService.getCostPreview(costDto);
  }

  @Get('/:id')
  @ApiOperation({ 
    summary: 'Get monthly subscription details',
    description: 'Retrieve detailed information about a specific monthly subscription'
  })
  getMonthlySubscription(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<MonthlySubscriptionResponseDto> {
    return this.monthlySubscriptionService.findMonthlySubscription(user.id, id);
  }
}
```

### 4.2 Updated VendorsController

```typescript
// Add to existing VendorsController
@Get('monthly-selection')
@ApiOperation({
  summary: 'Get vendors available for monthly subscription',
  description: 'Extended vendor search specifically for monthly subscription selection'
})
@ApiQuery({ name: 'mealType', required: true, enum: MealType })
@ApiQuery({ name: 'latitude', required: true, type: Number })
@ApiQuery({ name: 'longitude', required: true, type: Number })
getVendorsForMonthlySelection(
  @Query() query: MonthlyVendorQueryDto,
): Promise<VendorsListResponseDto> {
  return this.vendorsService.findVendorsByLocationAndMealType(
    query.latitude,
    query.longitude,
    query.mealType,
    query
  );
}
```

## 5. Integration Strategy

### 5.1 VendorsService Extensions

```typescript
// Add to existing VendorsService
async findVendorsForMonthlySelection(
  latitude: number,
  longitude: number,
  mealType: MealType,
  query: QueryVendorDto,
): Promise<VendorResponseDto[]> {
  // Enhanced version of existing findVendorsByLocationAndMealType
  // with additional validation for monthly subscription eligibility
  const vendors = await this.findVendorsByLocationAndMealType(latitude, longitude, mealType, query);
  
  // Additional filtering for monthly subscription requirements
  return vendors.data.filter(vendor => 
    vendor.isOpen && 
    vendor.menus?.some(menu => menu.mealType === mealType && menu.isActive)
  );
}
```

### 5.2 PaymentService Integration

```typescript
// Enhanced payment processing for monthly subscriptions
export class PaymentService {
  async processMonthlySubscriptionPayment(
    monthlySubscription: MonthlySubscription,
    paymentMethod: PaymentMethod,
  ): Promise<Payment> {
    // Create payment record for monthly subscription
    const payment = this.paymentRepository.create({
      userId: monthlySubscription.userId,
      amount: monthlySubscription.totalPrice,
      paymentMethod,
      paymentDetails: {
        monthlySubscriptionId: monthlySubscription.id,
        type: 'monthly_subscription',
        vendorCount: monthlySubscription.selectedVendors.length,
        mealType: monthlySubscription.mealType,
      },
    });

    return await this.paymentRepository.save(payment);
  }
}
```

### 5.3 Database Transaction Handling

```typescript
// Transaction wrapper for monthly subscription creation
async createMonthlySubscriptionWithTransaction(
  userId: string,
  createDto: CreateMonthlySubscriptionDto,
): Promise<MonthlySubscription> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Create monthly subscription
    const monthlySubscription = await manager.save(MonthlySubscription, {
      userId,
      mealType: createDto.mealType,
      totalPrice: await this.calculateTotalCost(createDto.selectedVendors),
      startDate: new Date(createDto.startDate),
      endDate: new Date(createDto.endDate),
      selectedVendors: await this.buildSelectedVendorsData(createDto.selectedVendors),
    });

    // 2. Create individual meal subscriptions
    const individualSubscriptions = createDto.selectedVendors.map(selection => ({
      userId,
      vendorId: selection.vendorId,
      menuId: selection.menuId,
      mealType: createDto.mealType,
      startDate: new Date(createDto.startDate),
      endDate: new Date(createDto.endDate),
      monthlySubscriptionId: monthlySubscription.id,
      price: 0, // Will be populated from menu
    }));

    await manager.save(MealSubscription, individualSubscriptions);

    return monthlySubscription;
  });
}
```

## 6. Validation and Error Handling

### 6.1 Custom Validation Rules

```typescript
// src/monthly-subscription/validators/vendor-selection.validator.ts
@ValidatorConstraint({ name: 'uniqueVendors', async: false })
export class UniqueVendorsConstraint implements ValidatorConstraintInterface {
  validate(selectedVendors: VendorSelectionDto[]): boolean {
    const vendorIds = selectedVendors.map(v => v.vendorId);
    return vendorIds.length === new Set(vendorIds).size;
  }

  defaultMessage(): string {
    return 'Cannot select the same vendor multiple times';
  }
}

@ValidatorConstraint({ name: 'maxVendors', async: false })
export class MaxVendorsConstraint implements ValidatorConstraintInterface {
  validate(selectedVendors: VendorSelectionDto[]): boolean {
    return selectedVendors.length <= 4;
  }

  defaultMessage(): string {
    return 'Maximum 4 vendors allowed per monthly subscription';
  }
}
```

### 6.2 Business Logic Validation

```typescript
// src/monthly-subscription/validators/business-rules.validator.ts
export class BusinessRulesValidator {
  static async validateMealTypeConsistency(
    selectedVendors: VendorSelectionDto[],
    expectedMealType: MealType,
    vendorMenuService: VendorMenuService,
  ): Promise<ValidationErrorDto[]> {
    const errors: ValidationErrorDto[] = [];

    for (const selection of selectedVendors) {
      try {
        const menu = await vendorMenuService.findOne(selection.menuId);
        if (menu.mealType !== expectedMealType) {
          errors.push({
            vendorId: selection.vendorId,
            menuId: selection.menuId,
            error: `Menu meal type ${menu.mealType} doesn't match expected ${expectedMealType}`,
            code: 'MEAL_TYPE_MISMATCH',
          });
        }
      } catch (error) {
        errors.push({
          vendorId: selection.vendorId,
          menuId: selection.menuId,
          error: 'Menu not found',
          code: 'MENU_NOT_FOUND',
        });
      }
    }

    return errors;
  }
}
```

### 6.3 Error Handling Strategy

```typescript
// src/monthly-subscription/exceptions/monthly-subscription.exceptions.ts
export class VendorSelectionError extends BadRequestException {
  constructor(validationErrors: ValidationErrorDto[]) {
    super({
      message: 'Invalid vendor selection',
      errors: validationErrors,
      code: 'VENDOR_SELECTION_ERROR',
    });
  }
}

export class MonthlySubscriptionNotFoundError extends NotFoundException {
  constructor(id: string) {
    super({
      message: `Monthly subscription with ID ${id} not found`,
      code: 'MONTHLY_SUBSCRIPTION_NOT_FOUND',
    });
  }
}

export class VendorCapacityExceededError extends BadRequestException {
  constructor() {
    super({
      message: 'Maximum 4 vendors allowed per monthly subscription',
      code: 'VENDOR_CAPACITY_EXCEEDED',
    });
  }
}
```

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// src/monthly-subscription/monthly-subscription.service.spec.ts
describe('MonthlySubscriptionService', () => {
  describe('createMonthlySubscription', () => {
    it('should create monthly subscription with valid vendors', async () => {
      // Test successful creation
    });

    it('should throw error for duplicate vendors', async () => {
      // Test validation error
    });

    it('should throw error for more than 4 vendors', async () => {
      // Test capacity validation
    });

    it('should throw error for inconsistent meal types', async () => {
      // Test meal type validation
    });
  });

  describe('validateVendorSelection', () => {
    it('should return validation errors for invalid selections', async () => {
      // Test validation logic
    });

    it('should return success for valid selections', async () => {
      // Test successful validation
    });
  });

  describe('getCostPreview', () => {
    it('should calculate correct total cost', async () => {
      // Test cost calculation
    });
  });
});
```

### 7.2 Integration Tests

```typescript
// test/monthly-subscription.e2e-spec.ts
describe('Monthly Subscription (e2e)', () => {
  describe('POST /subscriptions/monthly', () => {
    it('should create monthly subscription successfully', async () => {
      return request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCreateDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.selectedVendors).toHaveLength(validCreateDto.selectedVendors.length);
        });
    });

    it('should return 400 for invalid vendor selection', async () => {
      return request(app.getHttpServer())
        .post('/subscriptions/monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCreateDto)
        .expect(400);
    });
  });

  describe('GET /subscriptions/monthly/vendors/available', () => {
    it('should return available vendors for meal type', async () => {
      return request(app.getHttpServer())
        .get('/subscriptions/monthly/vendors/available')
        .query({ mealType: 'lunch', latitude: 25.2048, longitude: 55.2708 })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toBeDefined();
        });
    });
  });
});
```

### 7.3 End-to-End Testing Approach

```typescript
// Complete user journey tests
describe('Monthly Subscription User Journey', () => {
  it('should complete full monthly subscription flow', async () => {
    // 1. Get available vendors
    const vendorsResponse = await getAvailableVendors();
    expect(vendorsResponse.data.length).toBeGreaterThan(0);

    // 2. Select 3 vendors
    const selectedVendors = vendorsResponse.data.slice(0, 3);

    // 3. Validate selection
    const validationResponse = await validateSelection(selectedVendors);
    expect(validationResponse.isValid).toBe(true);

    // 4. Get cost preview
    const costPreview = await getCostPreview(selectedVendors);
    expect(costPreview.totalMonthlyCost).toBeGreaterThan(0);

    // 5. Create monthly subscription
    const monthlySubscription = await createMonthlySubscription(selectedVendors);
    expect(monthlySubscription.id).toBeDefined();

    // 6. Verify individual subscriptions created
    const userSubscriptions = await getUserSubscriptions();
    expect(userSubscriptions.data.filter(s => s.monthlySubscriptionId === monthlySubscription.id))
      .toHaveLength(selectedVendors.length);
  });
});
```

## 8. Module Structure and Dependencies

```typescript
// src/monthly-subscription/monthly-subscription.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlySubscription]),
    forwardRef(() => MealSubscriptionModule),
    VendorsModule,
    VendorMenuModule,
    PaymentsModule,
  ],
  controllers: [MonthlySubscriptionController],
  providers: [
    MonthlySubscriptionService,
    BusinessRulesValidator,
  ],
  exports: [MonthlySubscriptionService],
})
export class MonthlySubscriptionModule {}
```

## 9. API Documentation Examples

### 9.1 Swagger Documentation

```typescript
// Complete API documentation examples
@ApiTags('monthly-subscriptions')
@ApiBearerAuth('JWT-auth')
export class MonthlySubscriptionController {
  @ApiExtraModels(MonthlySubscriptionResponseDto, ValidationResponseDto, CostPreviewResponseDto)
  @ApiResponse({
    status: 201,
    description: 'Monthly subscription created successfully',
    content: {
      'application/json': {
        example: {
          id: 'uuid-here',
          mealType: 'lunch',
          status: 'active',
          totalPrice: 1200.00,
          startDate: '2025-02-01',
          endDate: '2025-02-28',
          selectedVendors: [
            {
              vendorId: 'vendor-1-uuid',
              menuId: 'menu-1-uuid',
              businessName: 'Healthy Meals Co.',
              price: 300.00,
              address: '123 Food Street',
              rating: 4.5
            }
          ],
          createdAt: '2025-01-28T07:00:00.000Z',
          updatedAt: '2025-01-28T07:00:00.000Z'
        }
      }
    }
  })
}
```

## 10. Performance Considerations

### 10.1 Database Optimization

- **Indexes**: Strategic indexes on [`userId`, `status`], [`mealType`], and date ranges
- **JSONB Queries**: Efficient querying of `selectedVendors` using PostgreSQL JSONB operators
- **Query Optimization**: Use of query builders for complex spatial and filter operations

### 10.2 Caching Strategy

```typescript
// Cache frequently accessed vendor data
@Cacheable('vendors-monthly-selection', { ttl: 300 }) // 5 minutes
async getAvailableVendorsForMonthly(query: MonthlyVendorQueryDto): Promise<VendorsListResponseDto> {
  return await this.vendorsService.findVendorsByLocationAndMealType(
    query.latitude,
    query.longitude,
    query.mealType,
    query
  );
}
```

### 10.3 Bulk Operations

```typescript
// Efficient bulk creation of individual subscriptions
private async createIndividualSubscriptions(monthlySubscription: MonthlySubscription): Promise<void> {
  const subscriptions = monthlySubscription.selectedVendors.map(vendor => ({
    userId: monthlySubscription.userId,
    vendorId: vendor.vendorId,
    menuId: vendor.menuId,
    mealType: monthlySubscription.mealType,
    price: vendor.price,
    startDate: monthlySubscription.startDate,
    endDate: monthlySubscription.endDate,
    monthlySubscriptionId: monthlySubscription.id,
  }));

  await this.mealSubscriptionRepository.insert(subscriptions);
}
```

## 11. Security Considerations

### 11.1 Authorization

- All endpoints protected with [`JwtAuthGuard`](src/auth/guards/jwt-auth.guard.ts)
- User-specific data isolation using `userId` from JWT token
- Resource ownership validation for monthly subscription access

### 11.2 Input Validation

- Comprehensive DTO validation with class-validator
- Business rule validation for vendor selections
- Sanitization of location coordinates and date inputs

### 11.3 Rate Limiting

```typescript
// Apply rate limiting to prevent abuse
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
@Post()
createMonthlySubscription() {
  // Implementation
}
```

## 12. Monitoring and Logging

### 12.1 Business Metrics

- Monthly subscription creation rate
- Average number of vendors per subscription
- Meal type distribution
- Geographic distribution of subscriptions

### 12.2 Error Tracking

```typescript
// Enhanced error logging with context
async createMonthlySubscription(userId: string, createDto: CreateMonthlySubscriptionDto): Promise<MonthlySubscription> {
  const logger = new Logger(MonthlySubscriptionService.name);
  
  try {
    logger.log(`Creating monthly subscription for user ${userId} with ${createDto.selectedVendors.length} vendors`);
    
    const result = await this.createSubscriptionWithTransaction(userId, createDto);
    
    logger.log(`Successfully created monthly subscription ${result.id} for user ${userId}`);
    return result;
  } catch (error) {
    logger.error(`Failed to create monthly subscription for user ${userId}`, error.stack, {
      userId,
      mealType: createDto.mealType,
      vendorCount: createDto.selectedVendors.length,
      error: error.message,
    });
    throw error;
  }
}
```

## Conclusion

This architecture specification provides a comprehensive blueprint for implementing Phase 1: Monthly Vendor Selection APIs. The design follows established patterns in the codebase while introducing new functionality that integrates seamlessly with existing systems.

### Key Implementation Priorities:

1. **Database Schema**: Create [`MonthlySubscription`](src/monthly-subscription/entities/monthly-subscription.entity.ts) entity and update [`MealSubscription`](src/meal-subscription/entities/meal-subscription.entity.ts)
2. **Core Service**: Implement [`MonthlySubscriptionService`](src/monthly-subscription/monthly-subscription.service.ts) with business logic
3. **API Endpoints**: Create [`MonthlySubscriptionController`](src/monthly-subscription/monthly-subscription.controller.ts) with all 5 endpoints
4. **Integration**: Extend [`VendorsService`](src/vendors/vendors.service.ts) for monthly selection support
5. **Testing**: Comprehensive test coverage for business logic and API endpoints

The modular design ensures maintainability and allows for future enhancements such as discount systems, vendor recommendations, and advanced filtering capabilities.