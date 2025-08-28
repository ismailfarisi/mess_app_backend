# Monthly Subscription API Reference

Complete API reference documentation for the Monthly Subscription system endpoints, including detailed request/response schemas, authentication requirements, and usage examples.

## 🔐 Authentication

All API endpoints require JWT authentication unless otherwise specified.

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

### Obtaining JWT Token
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 604800,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

## 📋 API Endpoints

### 1. Get Available Vendors

Find vendors available for monthly subscription based on location and meal preferences.

```http
GET /v1/subscriptions/monthly/vendors/available
```

**Query Parameters:**

| Parameter | Type | Required | Description | Default | Example |
|-----------|------|----------|-------------|---------|---------|
| `latitude` | number | ✅ | User's latitude coordinate | - | 25.2048 |
| `longitude` | number | ✅ | User's longitude coordinate | - | 55.2708 |
| `mealType` | string | ✅ | Type of meal (BREAKFAST, LUNCH, DINNER) | - | LUNCH |
| `radius` | number | ❌ | Search radius in kilometers | 15 | 20 |
| `page` | number | ❌ | Page number for pagination | 1 | 1 |
| `limit` | number | ❌ | Number of results per page | 20 | 10 |

**Request Example:**
```bash
curl -X GET "https://api.messapp.com/v1/subscriptions/monthly/vendors/available?latitude=25.2048&longitude=55.2708&mealType=LUNCH&radius=15&page=1&limit=20" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response Schema:**
```json
{
  "vendors": [
    {
      "id": "uuid",
      "name": "Vendor Name",
      "description": "Brief description of the vendor",
      "rating": 4.5,
      "distance": 2.3,
      "averagePrice": 25.50,
      "cuisine": "Italian",
      "imageUrl": "https://example.com/image.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "filters": {
    "mealType": "LUNCH",
    "radius": 15,
    "location": {
      "latitude": 25.2048,
      "longitude": 55.2708
    }
  }
}
```

**Status Codes:**
- `200 OK` - Request successful
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Server error

**Error Response Example:**
```json
{
  "statusCode": 400,
  "message": "Invalid meal type. Must be one of: BREAKFAST, LUNCH, DINNER",
  "error": "Bad Request"
}
```

---

### 2. Validate Monthly Selection

Validate that selected vendors and preferences are compatible for a monthly subscription.

```http
POST /v1/subscriptions/monthly/validate
```

**Request Body:**
```json
{
  "vendorIds": ["uuid1", "uuid2", "uuid3"],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "userLocation": {
    "latitude": 25.2048,
    "longitude": 55.2708
  }
}
```

**Request Schema:**

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `vendorIds` | array | ✅ | Array of vendor UUIDs | 1-4 items |
| `mealType` | string | ✅ | Meal type enum | BREAKFAST, LUNCH, DINNER |
| `startDate` | string | ✅ | Subscription start date | YYYY-MM-DD format, future date |
| `userLocation` | object | ✅ | User's location coordinates | - |
| `userLocation.latitude` | number | ✅ | Latitude coordinate | -90 to 90 |
| `userLocation.longitude` | number | ✅ | Longitude coordinate | -180 to 180 |

**Response Schema:**
```json
{
  "isValid": true,
  "errors": [],
  "warnings": [
    "Consider adding more vendors for variety"
  ],
  "recommendedVendors": []
}
```

**Validation Rules:**
1. Maximum 4 vendors per subscription
2. Minimum 1 vendor required
3. All vendors must serve the specified meal type
4. All vendors must be within 50km delivery radius
5. All vendors must be active and subscription-enabled

**Status Codes:**
- `200 OK` - Validation completed (check `isValid` field)
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Authentication required
- `422 Unprocessable Entity` - Validation service error

---

### 3. Get Monthly Preview

Generate cost and delivery preview for selected vendors and subscription period.

```http
GET /v1/subscriptions/monthly/preview
```

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `vendorIds` | string | ✅ | Comma-separated vendor UUIDs | "uuid1,uuid2,uuid3" |
| `mealType` | string | ✅ | Meal type | LUNCH |
| `startDate` | string | ✅ | Subscription start date | 2024-09-01 |

**Request Example:**
```bash
curl -X GET "https://api.messapp.com/v1/subscriptions/monthly/preview?vendorIds=uuid1,uuid2,uuid3&mealType=LUNCH&startDate=2024-09-01" \
  -H "Authorization: Bearer <token>"
```

**Response Schema:**
```json
{
  "costBreakdown": {
    "baseSubscriptionFee": 50.00,
    "vendorCosts": [
      {
        "vendorId": "uuid1",
        "vendorName": "Pizza Corner",
        "averagePrice": 22.50,
        "estimatedMeals": 8,
        "totalCost": 180.00
      }
    ],
    "subtotal": 410.00,
    "serviceFee": 20.50,
    "total": 430.50,
    "currency": "AED"
  },
  "vendors": [
    {
      "id": "uuid1",
      "name": "Pizza Corner",
      "description": "Authentic Italian pizzas",
      "rating": 4.6,
      "distance": 1.2,
      "averagePrice": 22.50,
      "cuisine": "Italian",
      "imageUrl": "https://example.com/pizza.jpg"
    }
  ],
  "deliverySchedule": {
    "totalDeliveries": 22,
    "vendorDistribution": [
      {
        "vendorId": "uuid1",
        "vendorName": "Pizza Corner",
        "allocatedDays": 8
      }
    ]
  },
  "subscriptionPeriod": {
    "startDate": "2024-09-01",
    "endDate": "2024-09-30"
  },
  "estimatedSavings": {
    "totalSavings": 67.50,
    "savingsPercentage": 13.5,
    "comparedToIndividualOrders": true
  }
}
```

**Status Codes:**
- `200 OK` - Preview generated successfully
- `400 Bad Request` - Invalid parameters or vendor selection
- `401 Unauthorized` - Authentication required
- `404 Not Found` - One or more vendors not found

---

### 4. Create Monthly Subscription

Create a new monthly subscription with selected vendors and payment processing.

```http
POST /v1/subscriptions/monthly
```

**Request Body:**
```json
{
  "vendorIds": ["uuid1", "uuid2", "uuid3"],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "addressId": "uuid-address",
  "paymentMethodId": "uuid-payment"
}
```

**Request Schema:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `vendorIds` | array | ✅ | Selected vendor UUIDs | 1-4 valid UUIDs |
| `mealType` | string | ✅ | Meal type | BREAKFAST, LUNCH, DINNER |
| `startDate` | string | ✅ | Start date (first day of month) | YYYY-MM-DD, future date |
| `addressId` | string | ✅ | User's delivery address UUID | Valid user address |
| `paymentMethodId` | string | ✅ | Payment method UUID | Valid payment method |

**Response Schema:**
```json
{
  "id": "uuid-subscription",
  "userId": "uuid-user",
  "vendors": [
    {
      "id": "uuid1",
      "name": "Pizza Corner",
      "description": "Authentic Italian pizzas",
      "rating": 4.6,
      "distance": 1.2,
      "averagePrice": 22.50,
      "cuisine": "Italian",
      "imageUrl": "https://example.com/pizza.jpg"
    }
  ],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "endDate": "2024-09-30",
  "status": "ACTIVE",
  "paymentSummary": {
    "totalAmount": 430.50,
    "currency": "AED",
    "paymentMethod": "Credit Card"
  },
  "createdAt": "2024-08-28T10:30:00Z",
  "updatedAt": "2024-08-28T10:30:00Z"
}
```

**Status Codes:**
- `201 Created` - Subscription created successfully
- `400 Bad Request` - Invalid request data or business rules violation
- `401 Unauthorized` - Authentication required
- `402 Payment Required` - Payment processing failed
- `404 Not Found` - Vendor, address, or payment method not found
- `422 Unprocessable Entity` - Business validation failed

**Business Rule Errors:**
```json
{
  "statusCode": 400,
  "message": "Maximum 4 vendors allowed per subscription",
  "error": "Business Rule Violation",
  "code": "MAX_VENDORS_EXCEEDED"
}
```

---

### 5. Get User Subscriptions

Retrieve all monthly subscriptions for the authenticated user.

```http
GET /v1/subscriptions/monthly/user
```

**Query Parameters:**

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `status` | string | ❌ | Filter by status | all |
| `page` | number | ❌ | Page number | 1 |
| `limit` | number | ❌ | Results per page | 10 |

**Request Example:**
```bash
curl -X GET "https://api.messapp.com/v1/subscriptions/monthly/user?status=ACTIVE&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response Schema:**
```json
{
  "subscriptions": [
    {
      "id": "uuid-subscription",
      "mealType": "LUNCH",
      "startDate": "2024-09-01",
      "endDate": "2024-09-30",
      "status": "ACTIVE",
      "vendorCount": 3,
      "totalAmount": 430.50,
      "currency": "AED",
      "createdAt": "2024-08-28T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  },
  "summary": {
    "activeSubscriptions": 2,
    "totalSpent": 1250.75,
    "averageMonthlySpend": 425.25
  }
}
```

**Status Codes:**
- `200 OK` - Request successful
- `401 Unauthorized` - Authentication required

---

## 🔄 Subscription Management Endpoints

### Update Subscription Status

```http
PATCH /v1/subscriptions/monthly/:id/status
```

**Request Body:**
```json
{
  "status": "PAUSED",
  "reason": "Vacation"
}
```

**Valid Status Transitions:**
- `PENDING` → `ACTIVE`, `CANCELLED`
- `ACTIVE` → `PAUSED`, `CANCELLED`
- `PAUSED` → `ACTIVE`, `CANCELLED`
- `CANCELLED` → (no transitions allowed)
- `COMPLETED` → (no transitions allowed)

### Get Subscription Details

```http
GET /v1/subscriptions/monthly/:id
```

**Response includes:**
- Full subscription details
- Vendor information
- Payment history
- Delivery schedule
- Status history

### Cancel Subscription

```http
DELETE /v1/subscriptions/monthly/:id
```

**Query Parameters:**
- `reason` (optional): Cancellation reason
- `immediate` (optional): Cancel immediately vs. end of period

## 📊 Data Types Reference

### Enums

**MealType**
```typescript
enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER'
}
```

**SubscriptionStatus**
```typescript
enum SubscriptionStatus {
  PENDING = 'PENDING',       // Payment processing
  ACTIVE = 'ACTIVE',         // Active subscription
  PAUSED = 'PAUSED',         // Temporarily paused
  CANCELLED = 'CANCELLED',   // User cancelled
  COMPLETED = 'COMPLETED'    // Subscription period ended
}
```

### Complex Types

**Location**
```typescript
interface Location {
  latitude: number;   // -90 to 90
  longitude: number;  // -180 to 180
}
```

**VendorSummary**
```typescript
interface VendorSummary {
  id: string;
  name: string;
  description: string;
  rating: number;        // 0.0 to 5.0
  distance: number;      // kilometers
  averagePrice: number;  // AED
  cuisine: string;
  imageUrl?: string;
}
```

**CostBreakdown**
```typescript
interface CostBreakdown {
  baseSubscriptionFee: number;
  vendorCosts: VendorCost[];
  subtotal: number;
  serviceFee: number;
  total: number;
  currency: string;
}

interface VendorCost {
  vendorId: string;
  vendorName: string;
  averagePrice: number;
  estimatedMeals: number;
  totalCost: number;
}
```

**PaymentSummary**
```typescript
interface PaymentSummary {
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  transactionId?: string;
  paidAt?: string;
}
```

## ⚠️ Error Handling

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Detailed error message",
  "error": "Error Type",
  "timestamp": "2024-08-28T10:30:00Z",
  "path": "/v1/subscriptions/monthly",
  "code": "SPECIFIC_ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_FAILED` | 400 | Request validation failed |
| `MAX_VENDORS_EXCEEDED` | 400 | Too many vendors selected |
| `INVALID_MEAL_TYPE` | 400 | Invalid meal type specified |
| `INVALID_DATE_RANGE` | 400 | Invalid subscription dates |
| `VENDOR_NOT_FOUND` | 404 | Vendor doesn't exist |
| `VENDOR_NOT_AVAILABLE` | 422 | Vendor not available for subscriptions |
| `INSUFFICIENT_COVERAGE` | 422 | Vendors don't cover delivery area |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `DUPLICATE_SUBSCRIPTION` | 409 | Active subscription already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### Validation Errors
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "vendorIds",
      "message": "vendorIds must contain at least 1 element",
      "value": []
    },
    {
      "field": "startDate",
      "message": "startDate must be a future date",
      "value": "2024-08-01"
    }
  ]
}
```

## 🚀 Rate Limiting

### Rate Limits by Endpoint

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `GET /vendors/available` | 60 requests | 1 minute |
| `POST /validate` | 30 requests | 1 minute |
| `GET /preview` | 30 requests | 1 minute |
| `POST /subscriptions/monthly` | 10 requests | 1 minute |
| `GET /user` | 100 requests | 1 minute |

### Rate Limit Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1693228800
```

### Rate Limit Exceeded Response
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

## 🔍 Query Optimization

### Recommended Query Patterns

1. **Vendor Search with Caching**
   ```javascript
   // Cache results for 5 minutes for same location/meal type
   const cacheKey = `vendors:${lat}:${lng}:${mealType}:${radius}`;
   ```

2. **Batch Validation**
   ```javascript
   // Validate multiple vendor combinations in single request
   // Rather than individual validation calls
   ```

3. **Preview Optimization**
   ```javascript
   // Use preview endpoint for cost calculation
   // Before final subscription creation
   ```

## 📈 Performance Recommendations

### Client-Side Optimization

1. **Implement caching** for vendor search results
2. **Debounce search queries** when user changes location
3. **Paginate vendor results** for better UX
4. **Cache validation results** for repeated selections
5. **Use optimistic UI updates** for better responsiveness

### Server-Side Features

1. **Spatial indexing** for fast location-based queries
2. **Redis caching** for frequently accessed data
3. **Database connection pooling** for concurrent requests
4. **Async processing** for non-critical operations
5. **CDN integration** for static assets

## 🧪 Testing Examples

### Integration Testing
```javascript
describe('Monthly Subscription API', () => {
  test('should create subscription successfully', async () => {
    const response = await request(app)
      .post('/v1/subscriptions/monthly')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vendorIds: ['vendor-1', 'vendor-2'],
        mealType: 'LUNCH',
        startDate: '2024-09-01',
        addressId: 'address-1',
        paymentMethodId: 'payment-1'
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.status).toBe('ACTIVE');
  });
});
```

### Load Testing
```bash
# Test vendor search performance
k6 run --vus 10 --duration 30s load-test-vendors.js

# Test subscription creation under load
k6 run --vus 5 --duration 60s load-test-subscriptions.js
```

---

**API Reference Version**: 2.1.0  
**Last Updated**: 2025-08-28  
**OpenAPI Specification**: [openapi.yaml](./openapi.yaml)  
**Postman Collection**: Available in `/docs/api/postman/`

*This reference is automatically updated with each API version release and synchronized with the OpenAPI specification.*