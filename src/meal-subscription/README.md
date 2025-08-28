# Monthly Subscription System

Comprehensive multi-vendor meal subscription system allowing users to select up to 4 vendors for monthly meal deliveries with sophisticated business logic and validation.

## 🎯 Overview

The monthly subscription system is the flagship feature of the Mess App platform, enabling users to create sophisticated meal subscription packages by combining multiple vendors into a single monthly subscription with comprehensive business rule validation and cost optimization.

### Key Capabilities
- **Multi-vendor selection** (1-4 vendors per subscription)
- **Geographic-based filtering** (50km delivery radius)
- **Business rule validation** (capacity, meal types, constraints)
- **Real-time cost calculation** with tax and fee breakdown
- **Transaction-safe operations** with complete rollback support
- **Comprehensive testing** (90%+ code coverage)

## 📋 System Components

### Core Entities
- [`MonthlySubscription`](entities/monthly-subscription.entity.ts) - Main subscription entity
- [`MealSubscription`](entities/meal-subscription.entity.ts) - Individual vendor subscriptions
- Related entities: User, Vendor, Menu, Payment

### Services
- [`MonthlySubscriptionService`](monthly-subscription.service.ts) - Core business logic
- [`VendorsService`](../vendors/vendors.service.ts) - Vendor filtering and validation
- [`VendorMenuService`](../vendor-menu/vendor-menu.service.ts) - Menu and pricing
- [`PaymentService`](../payments/payments.service.ts) - Payment processing

### Controllers
- [`MonthlySubscriptionController`](monthly-subscription.controller.ts) - API endpoints

### DTOs
- [`CreateMonthlySubscriptionDto`](dto/create-monthly-subscription.dto.ts) - Creation request
- [`AvailableVendorsResponseDto`](dto/available-vendors-response.dto.ts) - Vendor search response
- [`ValidationResultDto`](dto/validation-result.dto.ts) - Selection validation
- [`MonthlyPreviewResponseDto`](dto/monthly-preview-response.dto.ts) - Cost preview
- [`MonthlySubscriptionResponseDto`](dto/monthly-subscription-response.dto.ts) - Subscription details

## 🏗️ Architecture

### Database Design

```sql
-- Monthly subscription table
monthly_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  vendor_ids JSONB NOT NULL,  -- Array of vendor UUIDs (1-4 items)
  individual_subscription_ids JSONB NOT NULL,  -- Links to meal_subscriptions
  meal_type meal_type_enum NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status subscription_status_enum DEFAULT 'PENDING',
  address_id UUID NOT NULL,
  payment_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_monthly_subscriptions_user_status ON monthly_subscriptions(user_id, status);
CREATE INDEX idx_monthly_subscriptions_meal_type ON monthly_subscriptions(meal_type);
CREATE INDEX idx_monthly_subscriptions_dates ON monthly_subscriptions(start_date, end_date);
```

### Service Architecture

```
MonthlySubscriptionService
├── Vendor Validation
│   ├── Geographic constraints (50km radius)
│   ├── Meal type consistency
│   ├── Capacity availability
│   └── Business hours validation
├── Cost Calculation
│   ├── Menu price aggregation
│   ├── Tax calculation (5%)
│   ├── Service/delivery fees
│   └── Monthly total computation
├── Transaction Management
│   ├── Monthly subscription creation
│   ├── Individual subscription creation
│   ├── Payment processing
│   └── Rollback on failure
└── Business Logic Validation
    ├── 4-vendor maximum
    ├── No duplicate vendors
    ├── Future start dates only
    └── Vendor availability
```

## 🔧 Business Rules

### Vendor Selection Rules
1. **Maximum 4 vendors** per monthly subscription
2. **No duplicate vendors** within a single subscription
3. **Same meal type** across all selected vendors
4. **Geographic constraint** - all vendors must be within 50km of delivery address
5. **Vendor availability** - vendors must be active and have capacity
6. **Menu availability** - vendors must have active menus for requested meal type

### Date and Duration Rules
1. **Start date** must be today or a future date
2. **Subscription duration** is exactly 4 weeks (28 days)
3. **End date** automatically calculated as start_date + 28 days

### Pricing Rules
1. **Weekly price** calculated from vendor menu averages
2. **Monthly cost** = weekly price × 4 weeks per vendor
3. **Tax rate** = 5% applied to subtotal
4. **Service fees** = 0 (currently free)
5. **Delivery fees** = 0 (currently free)

## 📚 API Endpoints

### 1. Create Monthly Subscription
**POST** `/subscriptions/monthly`

Creates a new monthly subscription with selected vendors.

```json
{
  "vendorIds": ["uuid1", "uuid2", "uuid3"],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "addressId": "address-uuid",
  "paymentMethodId": "payment-uuid"
}
```

### 2. Get Available Vendors
**GET** `/subscriptions/monthly/vendors/available`

Returns vendors available for monthly subscriptions within delivery radius.

**Query Parameters:**
- `latitude` (required): User latitude coordinate
- `longitude` (required): User longitude coordinate  
- `mealType` (required): BREAKFAST | LUNCH | DINNER
- `radius` (optional): Search radius in km (default: 50)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

### 3. Validate Selection
**POST** `/subscriptions/monthly/validate`

Validates vendor selection against business rules before subscription creation.

```json
{
  "vendorIds": ["uuid1", "uuid2"],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "userLocation": {
    "latitude": 25.2048,
    "longitude": 55.2708
  }
}
```

### 4. Get Cost Preview
**GET** `/subscriptions/monthly/preview`

Calculates detailed cost breakdown and preview for selected vendors.

**Query Parameters:**
- `vendorIds`: Comma-separated vendor UUIDs
- `mealType`: Meal type for subscription
- `startDate`: Subscription start date

### 5. Get Subscription Details  
**GET** `/subscriptions/monthly/:id`

Retrieves detailed information about a specific monthly subscription.

## 🧪 Testing

### Test Coverage
The system has comprehensive test coverage (90%+) including:

- **Unit Tests** - Service methods, business logic, validation
- **Integration Tests** - Database operations, service interactions
- **E2E Tests** - Complete API workflows, error scenarios
- **Performance Tests** - Load testing, query optimization

### Test Structure
```
src/meal-subscription/__tests__/
├── controllers/
│   └── monthly-subscription.controller.spec.ts
├── services/
│   ├── monthly-subscription.service.spec.ts
│   └── vendors-service-monthly.spec.ts
├── e2e/
│   └── monthly-subscription.e2e-spec.ts
├── factories/
│   └── test-data.factory.ts
└── README.md
```

### Running Tests
```bash
# Run all monthly subscription tests
npm test -- --testPathPattern="meal-subscription/__tests__"

# Run with coverage
npm run test:cov -- --testPathPattern="meal-subscription/__tests__"

# Run specific test category
npm test -- controllers/monthly-subscription.controller.spec.ts
npm test -- services/monthly-subscription.service.spec.ts
npm test -- e2e/monthly-subscription.e2e-spec.ts
```

## 🔍 Usage Examples

### Basic Monthly Subscription Creation

```typescript
import { MonthlySubscriptionService } from './monthly-subscription.service';

// Inject service
constructor(
  private readonly monthlySubscriptionService: MonthlySubscriptionService,
) {}

// Create subscription
const subscription = await this.monthlySubscriptionService.createMonthlySubscription(
  userId,
  {
    vendorIds: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002'
    ],
    mealType: MealType.LUNCH,
    startDate: '2024-09-01',
    addressId: '550e8400-e29b-41d4-a716-446655440003',
    paymentMethodId: '550e8400-e29b-41d4-a716-446655440004'
  }
);
```

### Vendor Search and Validation

```typescript
// Search available vendors
const availableVendors = await this.monthlySubscriptionService.getAvailableVendors({
  latitude: 25.2048,
  longitude: 55.2708,
  mealType: MealType.LUNCH,
  radius: 15,
  page: 1,
  limit: 20
});

// Validate selection before creation
const validation = await this.monthlySubscriptionService.validateMonthlySelection({
  vendorIds: ['vendor1', 'vendor2'],
  mealType: MealType.LUNCH,
  startDate: '2024-09-01',
  userLocation: {
    latitude: 25.2048,
    longitude: 55.2708
  }
});

if (validation.isValid) {
  // Proceed with subscription creation
} else {
  // Handle validation errors
  console.log('Validation errors:', validation.errors);
}
```

### Cost Preview Generation

```typescript
// Get cost preview
const preview = await this.monthlySubscriptionService.getMonthlyPreview({
  vendorIds: 'vendor1,vendor2,vendor3',
  mealType: MealType.DINNER,
  startDate: '2024-09-15'
});

console.log('Total cost:', preview.costBreakdown.total);
console.log('Tax amount:', preview.costBreakdown.tax);
console.log('Preview expires at:', preview.expiresAt);
```

## 🚨 Error Handling

### Common Error Scenarios

```typescript
// Business rule violations
try {
  await createSubscription(invalidData);
} catch (error) {
  if (error.message.includes('Maximum 4 vendors')) {
    // Handle vendor limit exceeded
  } else if (error.message.includes('same meal type')) {
    // Handle meal type inconsistency
  } else if (error.message.includes('delivery radius')) {
    // Handle geographic constraint violation
  }
}

// Validation errors
const validation = await validateSelection(data);
if (!validation.isValid) {
  validation.errors.forEach(error => {
    console.log('Validation error:', error);
  });
  
  validation.warnings.forEach(warning => {
    console.log('Warning:', warning);
  });
}
```

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Maximum 4 vendors allowed per subscription",
  "error": "Bad Request",
  "timestamp": "2024-08-28T10:30:00.000Z",
  "path": "/subscriptions/monthly"
}
```

## 📈 Performance Considerations

### Database Optimization
- **Spatial indexes** for geographic queries
- **Composite indexes** on frequently queried columns
- **JSONB indexing** for vendor array queries
- **Query optimization** for complex joins

### Caching Strategy
- **Vendor data** cached for 5 minutes
- **Menu prices** cached for 10 minutes
- **Geographic queries** cached with Redis
- **Preview calculations** cached for 30 minutes

### Monitoring
- **Query performance** tracking
- **API response times** monitoring
- **Error rates** alerting
- **Capacity utilization** tracking

## 🔒 Security

### Authentication & Authorization
- **JWT validation** required for all endpoints
- **User ownership** validation for subscriptions
- **Role-based access** control
- **Rate limiting** to prevent abuse

### Input Validation
- **DTO validation** with class-validator
- **Business rule** enforcement
- **SQL injection** prevention with TypeORM
- **Geographic coordinate** validation

### Data Protection
- **Personal data** encryption at rest
- **Payment information** secure handling
- **Audit logging** for sensitive operations
- **GDPR compliance** ready

## 🚀 Deployment

### Environment Variables
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=messapp
DATABASE_USERNAME=username
DATABASE_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=3600s

# Tax Rate
TAX_RATE=0.05

# Delivery Radius (km)
DELIVERY_RADIUS_KM=50
```

### Database Migrations
```bash
# Run migrations
npm run migration:run

# Revert migrations  
npm run migration:revert

# Generate new migration
npm run migration:generate -- -n CreateMonthlySubscriptions
```

### Production Checklist
- ✅ Database indexes created
- ✅ Environment variables configured
- ✅ SSL certificates installed
- ✅ Rate limiting enabled
- ✅ Monitoring alerts configured
- ✅ Backup strategy implemented
- ✅ Performance baseline established

## 📖 API Documentation

Complete API documentation is available in multiple formats:

- **[Interactive Swagger UI](http://localhost:3000/api/docs)** (development)
- **[OpenAPI Specification](../docs/api/openapi.yaml)**
- **[API Documentation](../docs/api/monthly-subscriptions.md)**
- **[Usage Examples](../docs/api/examples/create-subscription-examples.md)**

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `master`
2. Implement changes with tests
3. Run test suite: `npm run test:cov`
4. Update documentation if needed
5. Submit pull request with description

### Code Standards
- **TypeScript strict mode** enabled
- **ESLint + Prettier** for code formatting
- **Jest** for testing with 90%+ coverage requirement
- **Conventional commits** for git messages
- **API documentation** required for public endpoints

### Adding New Features
1. Update entity schemas if needed
2. Create/update DTOs with validation
3. Implement service methods with business logic
4. Add controller endpoints with Swagger documentation
5. Write comprehensive tests (unit + integration + e2e)
6. Update documentation

---

**Last Updated**: 2025-08-28  
**Version**: 1.0.0  
**Maintained By**: Development Team

For questions or support, contact: dev-team@messapp.com