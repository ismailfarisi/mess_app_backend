# Monthly Subscription System API Documentation

Complete API documentation for the monthly meal subscription system that enables users to select up to 4 vendors for meal deliveries.

## 🎯 Overview

The Monthly Subscription API provides 5 comprehensive endpoints for managing multi-vendor meal subscriptions with sophisticated business logic, validation, and cost calculation.

### Key Features
- **Multi-vendor selection** (1-4 vendors per subscription)
- **Geographic-based filtering** (50km delivery radius)
- **Comprehensive validation** (business rules, capacity, location)
- **Cost calculation** with detailed preview
- **Transaction-safe operations** with rollback support

### Base URL
- **Production**: `https://api.messapp.com/v1`
- **Staging**: `https://staging-api.messapp.com/v1`
- **Development**: `http://localhost:3000`

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## 📋 API Endpoints

### 1. Create Monthly Subscription
**`POST /subscriptions/monthly`**

Creates a new monthly subscription with selected vendors.

#### Request Body
```json
{
  "vendorIds": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "addressId": "550e8400-e29b-41d4-a716-446655440003",
  "paymentMethodId": "550e8400-e29b-41d4-a716-446655440004"
}
```

#### Business Rules
- ✅ **Maximum 4 vendors** per subscription
- ✅ **Unique vendors only** (no duplicates)
- ✅ **Same meal type** across all vendors
- ✅ **Future start date** (today or later)
- ✅ **Vendor availability** and capacity validation
- ✅ **Geographic constraints** (50km delivery radius)

#### Response (201 Created)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "vendors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Mediterranean Delights",
      "logo": "https://example.com/logo1.jpg",
      "rating": 4.5,
      "cuisine": "Mediterranean",
      "deliveryDays": [1, 3, 5]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002", 
      "name": "Asian Fusion Kitchen",
      "logo": "https://example.com/logo2.jpg",
      "rating": 4.2,
      "cuisine": "Asian",
      "deliveryDays": [2, 4, 6]
    }
  ],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "endDate": "2024-09-28",
  "status": "ACTIVE",
  "deliveryAddress": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "address": "123 Business District, Dubai, UAE",
    "coordinates": {
      "latitude": 25.276987,
      "longitude": 55.296249
    }
  },
  "paymentSummary": {
    "totalAmount": 450.00,
    "costPerVendorPerDay": 8.04,
    "totalDeliveryDays": 28,
    "serviceFee": 0,
    "deliveryFee": 0,
    "taxes": 21.43,
    "currency": "AED"
  },
  "createdAt": "2024-08-28T08:00:00.000Z",
  "updatedAt": "2024-08-28T08:00:00.000Z"
}
```

#### Error Responses
```json
// 400 - Too many vendors
{
  "statusCode": 400,
  "message": "Maximum 4 vendors allowed per subscription",
  "error": "Bad Request",
  "timestamp": "2024-08-28T08:00:00.000Z",
  "path": "/subscriptions/monthly"
}

// 400 - Vendor validation failed  
{
  "statusCode": 400,
  "message": "Invalid vendors: Vendor Mediterranean Delights doesn't serve BREAKFAST",
  "error": "Bad Request",
  "timestamp": "2024-08-28T08:00:00.000Z", 
  "path": "/subscriptions/monthly"
}
```

---

### 2. Get Available Vendors
**`GET /subscriptions/monthly/vendors/available`**

Retrieves vendors available for monthly subscriptions based on location and meal type.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `latitude` | number | ✅ | User latitude (-90 to 90) | `25.2048` |
| `longitude` | number | ✅ | User longitude (-180 to 180) | `55.2708` |
| `mealType` | string | ✅ | Meal type (BREAKFAST/LUNCH/DINNER) | `LUNCH` |
| `radius` | number | ❌ | Search radius in km (default: 50) | `15` |
| `page` | number | ❌ | Page number (default: 1) | `1` |
| `limit` | number | ❌ | Items per page (default: 20) | `20` |

#### Example Request
```bash
GET /subscriptions/monthly/vendors/available?latitude=25.2048&longitude=55.2708&mealType=LUNCH&radius=15&page=1&limit=20
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)
```json
{
  "vendors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Mediterranean Delights", 
      "description": "Authentic Mediterranean cuisine with fresh ingredients",
      "logo": "https://example.com/logo1.jpg",
      "cuisine": "Mediterranean",
      "rating": 4.5,
      "reviewCount": 127,
      "distance": 2.5,
      "averagePrice": 15.0,
      "deliveryTime": 30,
      "supportedMealTypes": ["LUNCH", "DINNER"],
      "isAvailable": true,
      "monthlyCapacity": 100,
      "currentSubscriptions": 45,
      "address": "456 Business District, Dubai, UAE",
      "coordinates": {
        "latitude": 25.276987,
        "longitude": 55.296249
      },
      "businessHours": [
        {
          "day": 1,
          "openTime": "09:00",
          "closeTime": "22:00", 
          "isClosed": false
        }
      ]
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "searchParams": {
    "location": {
      "latitude": 25.2048,
      "longitude": 55.2708
    },
    "mealType": "LUNCH",
    "radius": 15
  }
}
```

#### Filtering Logic
- **Geographic**: Uses PostGIS for spatial queries within specified radius
- **Meal Type**: Filters vendors with active menus for requested meal type
- **Availability**: Excludes inactive vendors or those at full capacity
- **Capacity**: Shows current subscription count vs maximum capacity

---

### 3. Validate Selection
**`POST /subscriptions/monthly/validate`**

Validates vendor selection against all business rules before subscription creation.

#### Request Body
```json
{
  "vendorIds": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "userLocation": {
    "latitude": 25.2048,
    "longitude": 55.2708
  }
}
```

#### Validation Checks
1. **Vendor Count**: Maximum 4 vendors
2. **Duplicate Detection**: No duplicate vendor IDs
3. **Vendor Existence**: All vendors exist and are active
4. **Meal Type Consistency**: All vendors serve requested meal type
5. **Geographic Constraints**: All vendors within delivery radius
6. **Capacity Availability**: Vendors have available monthly slots
7. **Schedule Feasibility**: No delivery time conflicts

#### Response (200 OK)
```json
{
  "isValid": true,
  "vendors": [
    {
      "vendorId": "550e8400-e29b-41d4-a716-446655440001",
      "vendorName": "Mediterranean Delights",
      "isAvailable": true,
      "canDeliver": true,
      "hasCapacity": true,
      "distance": 2.5,
      "issues": []
    },
    {
      "vendorId": "550e8400-e29b-41d4-a716-446655440002",
      "vendorName": "Asian Fusion Kitchen", 
      "isAvailable": true,
      "canDeliver": true,
      "hasCapacity": true,
      "distance": 3.2,
      "issues": []
    }
  ],
  "delivery": {
    "canDeliver": true,
    "estimatedDeliveryTime": 30,
    "deliveryFee": 0,
    "issues": []
  },
  "schedule": {
    "isValidStartDate": true,
    "deliveryDaysCount": 28,
    "issues": []
  },
  "errors": [],
  "warnings": ["Vendor \"Mediterranean Delights\" has limited capacity"],
  "validatedAt": "2024-08-28T08:00:00.000Z"
}
```

#### Validation Error Example
```json
{
  "isValid": false,
  "vendors": [
    {
      "vendorId": "550e8400-e29b-41d4-a716-446655440999",
      "vendorName": "",
      "isAvailable": false,
      "canDeliver": false,
      "hasCapacity": false,
      "distance": 0,
      "issues": ["Vendor not found"]
    }
  ],
  "delivery": {
    "canDeliver": false,
    "estimatedDeliveryTime": 0,
    "deliveryFee": 0,
    "issues": ["One or more vendors cannot deliver"]
  },
  "schedule": {
    "isValidStartDate": true,
    "deliveryDaysCount": 28,
    "issues": []
  },
  "errors": ["Vendor 550e8400-e29b-41d4-a716-446655440999 not found"],
  "warnings": [],
  "validatedAt": "2024-08-28T08:00:00.000Z"
}
```

---

### 4. Get Cost Preview
**`POST /subscriptions/monthly/preview`**

Calculates detailed cost breakdown and preview for selected vendors.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `vendorIds` | string | ✅ | Comma-separated vendor IDs | `vendor1,vendor2` |
| `mealType` | string | ✅ | Meal type | `LUNCH` |
| `startDate` | string | ✅ | Start date (YYYY-MM-DD) | `2024-09-01` |

#### Example Request
```bash
GET /subscriptions/monthly/preview?vendorIds=550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440002&mealType=LUNCH&startDate=2024-09-01
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)
```json
{
  "subscription": {
    "mealType": "LUNCH",
    "startDate": "2024-09-01",
    "endDate": "2024-09-28",
    "totalDeliveryDays": 28,
    "vendorCount": 2,
    "averageCostPerMeal": 12.5
  },
  "vendorBreakdown": [
    {
      "vendorId": "550e8400-e29b-41d4-a716-446655440001",
      "vendorName": "Mediterranean Delights",
      "costPerMeal": 15.0,
      "deliveryDays": 7,
      "totalCost": 420.0,
      "assignedDays": [1, 2, 3, 4, 5, 6, 7]
    },
    {
      "vendorId": "550e8400-e29b-41d4-a716-446655440002",
      "vendorName": "Asian Fusion Kitchen",
      "costPerMeal": 10.0,
      "deliveryDays": 7,
      "totalCost": 280.0,
      "assignedDays": [1, 2, 3, 4, 5, 6, 7]
    }
  ],
  "costBreakdown": {
    "subtotal": 700.0,
    "serviceFee": 0,
    "deliveryFee": 0,
    "tax": 35.0,
    "discount": 0,
    "total": 735.0,
    "currency": "AED"
  },
  "estimatedSavings": 0,
  "savingsPercentage": 0,
  "generatedAt": "2024-08-28T08:00:00.000Z",
  "expiresAt": "2024-08-28T08:30:00.000Z"
}
```

#### Cost Calculation Logic
1. **Weekly Price**: Calculated from vendor menu items average
2. **Monthly Total**: Weekly price × 4 weeks per vendor
3. **Tax Calculation**: 5% applied to subtotal
4. **Final Total**: Subtotal + Tax + Fees
5. **Preview Validity**: 30 minutes from generation

---

### 5. Get Subscription Details
**`GET /subscriptions/monthly/{id}`**

Retrieves detailed information about a specific monthly subscription.

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | ✅ | Subscription UUID | `550e8400-e29b-41d4-a716-446655440001` |

#### Example Request
```bash
GET /subscriptions/monthly/550e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "vendors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Mediterranean Delights",
      "logo": "https://example.com/logo1.jpg",
      "rating": 4.5,
      "cuisine": "Mediterranean",
      "deliveryDays": [1, 3, 5]
    }
  ],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "endDate": "2024-09-28",
  "status": "ACTIVE",
  "deliveryAddress": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "address": "123 Business District, Dubai, UAE",
    "coordinates": {
      "latitude": 25.276987,
      "longitude": 55.296249
    }
  },
  "deliverySchedule": [
    {
      "vendorId": "550e8400-e29b-41d4-a716-446655440001",
      "vendorName": "Mediterranean Delights",
      "dayOfWeek": 1,
      "dayName": "Monday",
      "estimatedDeliveryTime": "12:00-14:00"
    }
  ],
  "paymentSummary": {
    "totalAmount": 450.00,
    "costPerVendorPerDay": 8.04,
    "totalDeliveryDays": 28,
    "serviceFee": 0,
    "deliveryFee": 0,
    "taxes": 21.43,
    "currency": "AED"
  },
  "createdAt": "2024-08-28T08:00:00.000Z",
  "updatedAt": "2024-08-28T08:00:00.000Z"
}
```

#### Authorization
- ✅ Users can only access their own subscriptions
- ❌ Access denied for subscriptions owned by other users

#### Error Responses
```json
// 403 - Access denied
{
  "statusCode": 403,
  "message": "Access denied - not owner of subscription",
  "error": "Forbidden",
  "timestamp": "2024-08-28T08:00:00.000Z",
  "path": "/subscriptions/monthly/550e8400-e29b-41d4-a716-446655440001"
}

// 404 - Not found
{
  "statusCode": 404,
  "message": "Monthly subscription 550e8400-e29b-41d4-a716-446655440001 not found for user 550e8400-e29b-41d4-a716-446655440000",
  "error": "Not Found", 
  "timestamp": "2024-08-28T08:00:00.000Z",
  "path": "/subscriptions/monthly/550e8400-e29b-41d4-a716-446655440001"
}
```

---

## 🔐 Authentication & Authorization

### JWT Token Requirements
All endpoints require a valid JWT token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "roles": ["USER"],
  "iat": 1693219200,
  "exp": 1693305600
}
```

### Authorization Rules
- ✅ **User Identity**: Extracted from JWT `sub` field
- ✅ **Resource Ownership**: Users can only access their own subscriptions
- ✅ **Token Validation**: All endpoints validate token signature and expiry

---

## 📊 Rate Limiting

### Limits
- **Create Subscription**: 10 requests per minute per user
- **Other Endpoints**: 60 requests per minute per user
- **Global Rate Limit**: 1000 requests per minute per IP

### Headers
```bash
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1693219260
```

---

## 🚨 Error Handling

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Detailed error message",
  "error": "Error Type",
  "timestamp": "2024-08-28T08:00:00.000Z",
  "path": "/api/endpoint"
}
```

### Common HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| `200` | OK | Successful operation |
| `201` | Created | Subscription created successfully |
| `400` | Bad Request | Validation errors, business rule violations |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | Access denied to resource |
| `404` | Not Found | Resource not found |
| `422` | Unprocessable Entity | Input validation failed |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |

### Validation Error Format
```json
{
  "statusCode": 422,
  "message": [
    "vendorIds should not be empty",
    "mealType must be a valid enum value"
  ],
  "error": "Unprocessable Entity"
}
```

---

## 🔧 SDK Usage Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.messapp.com/v1',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Create monthly subscription
const subscription = await client.post('/subscriptions/monthly', {
  vendorIds: ['vendor1', 'vendor2'],
  mealType: 'LUNCH', 
  startDate: '2024-09-01',
  addressId: 'address-id',
  paymentMethodId: 'payment-id'
});

// Get available vendors
const vendors = await client.get('/subscriptions/monthly/vendors/available', {
  params: {
    latitude: 25.2048,
    longitude: 55.2708,
    mealType: 'LUNCH',
    radius: 15
  }
});
```

### cURL Examples
```bash
# Create subscription
curl -X POST https://api.messapp.com/v1/subscriptions/monthly \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorIds": ["vendor1", "vendor2"],
    "mealType": "LUNCH",
    "startDate": "2024-09-01", 
    "addressId": "address-id",
    "paymentMethodId": "payment-id"
  }'

# Get available vendors  
curl -X GET "https://api.messapp.com/v1/subscriptions/monthly/vendors/available?latitude=25.2048&longitude=55.2708&mealType=LUNCH&radius=15" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📈 Performance & Optimization

### Response Times
- **Get Available Vendors**: < 500ms (with caching)
- **Validate Selection**: < 300ms  
- **Cost Preview**: < 200ms
- **Create Subscription**: < 1000ms (includes transactions)
- **Get Subscription Details**: < 100ms

### Caching Strategy
- **Vendor Data**: 5-minute cache for frequently accessed vendor information
- **Geographic Queries**: Redis cache for location-based vendor searches
- **Menu Prices**: 10-minute cache for cost calculations

### Pagination
- **Default Page Size**: 20 items
- **Maximum Page Size**: 100 items
- **Total Count**: Included in response metadata

---

## 🔍 Testing & Development

### Test Endpoints
Development and staging environments include test endpoints:

```bash
# Test authentication
GET /test/auth
Authorization: Bearer <token>

# Test database connection
GET /test/health

# Test vendor data
GET /test/vendors/seed
```

### Swagger Documentation
Interactive API documentation available at:
- **Development**: http://localhost:3000/api/docs
- **Staging**: https://staging-api.messapp.com/v1/docs
- **Production**: https://api.messapp.com/v1/docs

---

**Last Updated**: 2025-08-28  
**Version**: 1.0.0  
**Maintained By**: Development Team

For additional support, contact: dev-team@messapp.com