# Monthly Subscription API Examples

This document provides comprehensive examples for using the Monthly Subscription API endpoints.

## 📋 Table of Contents

1. [Authentication Setup](#authentication-setup)
2. [Create Monthly Subscription](#create-monthly-subscription)
3. [Get Available Vendors](#get-available-vendors)
4. [Validate Selection](#validate-selection)
5. [Get Cost Preview](#get-cost-preview)
6. [Get Subscription Details](#get-subscription-details)
7. [Error Handling Examples](#error-handling-examples)
8. [SDK Integration Examples](#sdk-integration-examples)

---

## 🔐 Authentication Setup

All API calls require JWT authentication. Obtain a token from the auth endpoint first:

### Get JWT Token
```bash
curl -X POST https://api.messapp.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Use the `access_token` in subsequent requests:
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🍽️ Create Monthly Subscription

### Example 1: Basic Two-Vendor Lunch Subscription

```bash
curl -X POST https://api.messapp.com/v1/subscriptions/monthly \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorIds": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ],
    "mealType": "LUNCH",
    "startDate": "2024-09-01",
    "addressId": "550e8400-e29b-41d4-a716-446655440003",
    "paymentMethodId": "550e8400-e29b-41d4-a716-446655440004"
  }'
```

**Success Response (201):**
```json
{
  "id": "monthly-sub-001",
  "userId": "user-001",
  "vendors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Mediterranean Delights",
      "logo": "https://cdn.messapp.com/logos/med-delights.jpg",
      "rating": 4.5,
      "cuisine": "Mediterranean",
      "deliveryDays": [1, 3, 5]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Asian Fusion Kitchen", 
      "logo": "https://cdn.messapp.com/logos/asian-fusion.jpg",
      "rating": 4.2,
      "cuisine": "Asian",
      "deliveryDays": [2, 4, 6]
    }
  ],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "endDate": "2024-09-28",
  "status": "ACTIVE",
  "paymentSummary": {
    "totalAmount": 580.00,
    "costPerVendorPerDay": 10.36,
    "totalDeliveryDays": 28,
    "serviceFee": 0,
    "deliveryFee": 0,
    "taxes": 27.62,
    "currency": "AED"
  },
  "createdAt": "2024-08-28T10:30:00.000Z",
  "updatedAt": "2024-08-28T10:30:00.000Z"
}
```

### Example 2: JavaScript/TypeScript Implementation

```typescript
interface CreateMonthlySubscriptionRequest {
  vendorIds: string[];
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  startDate: string;
  addressId: string;
  paymentMethodId: string;
}

class MonthlySubscriptionService {
  private baseURL = 'https://api.messapp.com/v1';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async createSubscription(
    request: CreateMonthlySubscriptionRequest
  ): Promise<MonthlySubscriptionResponse> {
    const response = await fetch(`${this.baseURL}/subscriptions/monthly`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Subscription creation failed: ${error.message}`);
    }

    return response.json();
  }
}

// Usage example
const subscriptionService = new MonthlySubscriptionService(userToken);

try {
  const subscription = await subscriptionService.createSubscription({
    vendorIds: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002'
    ],
    mealType: 'LUNCH',
    startDate: '2024-09-01',
    addressId: '550e8400-e29b-41d4-a716-446655440003',
    paymentMethodId: '550e8400-e29b-41d4-a716-446655440004'
  });

  console.log('Subscription created:', subscription.id);
} catch (error) {
  console.error('Failed to create subscription:', error.message);
}
```

---

## 🏪 Get Available Vendors

### Example 1: Basic Vendor Search

```bash
curl -X GET "https://api.messapp.com/v1/subscriptions/monthly/vendors/available?latitude=25.2048&longitude=55.2708&mealType=LUNCH&radius=15" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "vendors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Mediterranean Delights",
      "description": "Authentic Mediterranean cuisine with fresh ingredients daily",
      "logo": "https://cdn.messapp.com/logos/mediterranean-delights.jpg",
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
      }
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

---

## ✅ Validate Selection

### Example 1: Valid Selection Validation

```bash
curl -X POST https://api.messapp.com/v1/subscriptions/monthly/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Valid Response:**
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
    "estimatedDeliveryTime": 35,
    "deliveryFee": 0,
    "issues": []
  },
  "schedule": {
    "isValidStartDate": true,
    "deliveryDaysCount": 28,
    "issues": []
  },
  "errors": [],
  "warnings": [],
  "validatedAt": "2024-08-28T10:45:00.000Z"
}
```

---

## 💰 Get Cost Preview

### Example 1: Two-Vendor Cost Preview

```bash
curl -X GET "https://api.messapp.com/v1/subscriptions/monthly/preview?vendorIds=550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440002&mealType=LUNCH&startDate=2024-09-01" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "subscription": {
    "mealType": "LUNCH",
    "startDate": "2024-09-01",
    "endDate": "2024-09-28",
    "totalDeliveryDays": 28,
    "vendorCount": 2,
    "averageCostPerMeal": 13.5
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
      "costPerMeal": 12.0,
      "deliveryDays": 7,
      "totalCost": 336.0,
      "assignedDays": [1, 2, 3, 4, 5, 6, 7]
    }
  ],
  "costBreakdown": {
    "subtotal": 756.0,
    "serviceFee": 0,
    "deliveryFee": 0,
    "tax": 37.8,
    "discount": 0,
    "total": 793.8,
    "currency": "AED"
  },
  "estimatedSavings": 0,
  "savingsPercentage": 0,
  "generatedAt": "2024-08-28T10:50:00.000Z",
  "expiresAt": "2024-08-28T11:20:00.000Z"
}
```

---

## 📋 Get Subscription Details

### Example 1: Retrieve Subscription

```bash
curl -X GET https://api.messapp.com/v1/subscriptions/monthly/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "user-001",
  "vendors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Mediterranean Delights",
      "logo": "https://cdn.messapp.com/logos/med-delights.jpg",
      "rating": 4.5,
      "cuisine": "Mediterranean",
      "deliveryDays": [1, 3, 5]
    }
  ],
  "mealType": "LUNCH",
  "startDate": "2024-09-01",
  "endDate": "2024-09-28",
  "status": "ACTIVE",
  "paymentSummary": {
    "totalAmount": 793.8,
    "costPerVendorPerDay": 14.17,
    "totalDeliveryDays": 28,
    "serviceFee": 0,
    "deliveryFee": 0,
    "taxes": 37.8,
    "currency": "AED"
  },
  "createdAt": "2024-08-28T10:30:00.000Z",
  "updatedAt": "2024-08-28T10:30:00.000Z"
}
```

---

## 🚨 Error Handling Examples

### 1. Authentication Errors

```bash
# Missing token
curl -X POST https://api.messapp.com/v1/subscriptions/monthly \
  -H "Content-Type: application/json" \
  -d '{"vendorIds": ["vendor1"], "mealType": "LUNCH"}'
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "2024-08-28T10:30:00.000Z",
  "path": "/subscriptions/monthly"
}
```

### 2. Validation Errors

```bash
# Invalid vendor count
curl -X POST https://api.messapp.com/v1/subscriptions/monthly \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorIds": ["v1", "v2", "v3", "v4", "v5"],
    "mealType": "LUNCH",
    "startDate": "2024-09-01"
  }'
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "Maximum 4 vendors allowed per subscription",
  "error": "Bad Request",
  "timestamp": "2024-08-28T10:30:00.000Z",
  "path": "/subscriptions/monthly"
}
```

---

## 🛠️ SDK Integration Examples

### React Hook Implementation

```typescript
import { useState } from 'react';

interface UseMonthlySubscriptionReturn {
  createSubscription: (data: CreateSubscriptionData) => Promise<MonthlySubscription>;
  getAvailableVendors: (params: VendorSearchParams) => Promise<VendorsResponse>;
  validateSelection: (data: ValidationData) => Promise<ValidationResult>;
  getCostPreview: (params: PreviewParams) => Promise<CostPreview>;
  loading: boolean;
  error: string | null;
}

export const useMonthlySubscription = (token: string): UseMonthlySubscriptionReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseURL = 'https://api.messapp.com/v1';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const handleRequest = async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseURL}${url}`, {
        headers,
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Request failed');
      }

      return response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (
    data: CreateSubscriptionData
  ): Promise<MonthlySubscription> => {
    return handleRequest('/subscriptions/monthly', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  const getAvailableVendors = async (
    params: VendorSearchParams
  ): Promise<VendorsResponse> => {
    const query = new URLSearchParams(params as any);
    return handleRequest(`/subscriptions/monthly/vendors/available?${query}`);
  };

  const validateSelection = async (
    data: ValidationData
  ): Promise<ValidationResult> => {
    return handleRequest('/subscriptions/monthly/validate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  const getCostPreview = async (
    params: PreviewParams
  ): Promise<CostPreview> => {
    const query = new URLSearchParams(params as any);
    return handleRequest(`/subscriptions/monthly/preview?${query}`);
  };

  return {
    createSubscription,
    getAvailableVendors,
    validateSelection,
    getCostPreview,
    loading,
    error
  };
};
```

### Node.js Service Implementation

```javascript
const axios = require('axios');

class MonthlySubscriptionAPI {
  constructor(token, baseURL = 'https://api.messapp.com/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        const message = error.response?.data?.message || error.message;
        throw new Error(`API Error: ${message}`);
      }
    );
  }

  async createSubscription(subscriptionData) {
    const response = await this.client.post('/subscriptions/monthly', subscriptionData);
    return response.data;
  }

  async getAvailableVendors(searchParams) {
    const response = await this.client.get('/subscriptions/monthly/vendors/available', {
      params: searchParams
    });
    return response.data;
  }

  async validateSelection(validationData) {
    const response = await this.client.post('/subscriptions/monthly/validate', validationData);
    return response.data;
  }

  async getCostPreview(previewParams) {
    const response = await this.client.get('/subscriptions/monthly/preview', {
      params: previewParams
    });
    return response.data;
  }

  async getSubscriptionDetails(subscriptionId) {
    const response = await this.client.get(`/subscriptions/monthly/${subscriptionId}`);
    return response.data;
  }
}

// Usage example
const api = new MonthlySubscriptionAPI(userToken);

async function createLunchSubscription() {
  try {
    const subscription = await api.createSubscription({
      vendorIds: ['vendor1', 'vendor2'],
      mealType: 'LUNCH',
      startDate: '2024-09-01',
      addressId: 'address-id',
      paymentMethodId: 'payment-id'
    });

    console.log('Subscription created:', subscription.id);
    return subscription;
  } catch (error) {
    console.error('Failed to create subscription:', error.message);
    throw error;
  }
}

module.exports = { MonthlySubscriptionAPI };
```

---

**Last Updated**: 2025-08-28  
**Version**: 1.0.0  
**Maintained By**: Development Team

For additional examples and support: dev-team@messapp.com