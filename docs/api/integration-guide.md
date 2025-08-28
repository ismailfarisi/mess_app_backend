# Monthly Subscription API - Integration Guide

This comprehensive guide provides step-by-step instructions for integrating with the Monthly Subscription API, including authentication setup, common integration patterns, and best practices for building client applications.

## 🚀 Quick Start

### Prerequisites
- **API Base URL**: Production: `https://api.messapp.com/v1` | Staging: `https://staging-api.messapp.com/v1`
- **Authentication**: JWT Bearer token from authentication endpoint
- **Content Type**: `application/json` for all requests
- **Rate Limits**: 60 requests/minute for standard endpoints, 10 requests/minute for subscription creation

### Authentication Setup

```javascript
// Step 1: Obtain JWT token
const authResponse = await fetch('https://api.messapp.com/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { access_token } = await authResponse.json();

// Step 2: Use token for subsequent requests
const apiClient = axios.create({
  baseURL: 'https://api.messapp.com/v1',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🏗️ Integration Patterns

### 1. Complete Monthly Subscription Workflow

This is the most common integration pattern for creating monthly subscriptions:

```typescript
class MonthlySubscriptionWorkflow {
  constructor(private apiClient: AxiosInstance) {}

  /**
   * Complete workflow for creating a monthly subscription
   */
  async createMonthlySubscription(userLocation: Location, preferences: UserPreferences): Promise<MonthlySubscription> {
    try {
      // Step 1: Search for available vendors
      const availableVendors = await this.searchVendors(userLocation, preferences);
      
      if (availableVendors.vendors.length === 0) {
        throw new Error('No vendors available in your area for the selected meal type');
      }

      // Step 2: Let user select vendors (up to 4)
      const selectedVendors = await this.getUserVendorSelection(availableVendors.vendors);
      
      // Step 3: Validate selection
      const validation = await this.validateSelection(selectedVendors, userLocation, preferences);
      
      if (!validation.isValid) {
        throw new Error(`Selection validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 4: Get cost preview
      const costPreview = await this.getCostPreview(selectedVendors, preferences);
      
      // Step 5: Confirm with user and create subscription
      const userApproval = await this.confirmSubscriptionWithUser(costPreview);
      
      if (userApproval) {
        const subscription = await this.createSubscription({
          vendorIds: selectedVendors.map(v => v.id),
          mealType: preferences.mealType,
          startDate: preferences.startDate,
          addressId: preferences.addressId,
          paymentMethodId: preferences.paymentMethodId
        });

        return subscription;
      }
      
      throw new Error('User cancelled subscription creation');
      
    } catch (error) {
      console.error('Monthly subscription workflow failed:', error);
      throw error;
    }
  }

  private async searchVendors(location: Location, preferences: UserPreferences): Promise<VendorsResponse> {
    const response = await this.apiClient.get('/subscriptions/monthly/vendors/available', {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        mealType: preferences.mealType,
        radius: preferences.radius || 15,
        page: 1,
        limit: 20
      }
    });
    return response.data;
  }

  private async validateSelection(vendors: Vendor[], location: Location, preferences: UserPreferences): Promise<ValidationResult> {
    const response = await this.apiClient.post('/subscriptions/monthly/validate', {
      vendorIds: vendors.map(v => v.id),
      mealType: preferences.mealType,
      startDate: preferences.startDate,
      userLocation: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    });
    return response.data;
  }

  private async getCostPreview(vendors: Vendor[], preferences: UserPreferences): Promise<CostPreview> {
    const vendorIds = vendors.map(v => v.id).join(',');
    const response = await this.apiClient.get('/subscriptions/monthly/preview', {
      params: {
        vendorIds,
        mealType: preferences.mealType,
        startDate: preferences.startDate
      }
    });
    return response.data;
  }

  private async createSubscription(subscriptionData: CreateSubscriptionData): Promise<MonthlySubscription> {
    const response = await this.apiClient.post('/subscriptions/monthly', subscriptionData);
    return response.data;
  }
}
```

### 2. React Hook Integration Example

```typescript
import { useState, useEffect, useCallback } from 'react';

export const useMonthlySubscription = (userToken: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [costPreview, setCostPreview] = useState<CostPreview | null>(null);

  const apiClient = useMemo(() => axios.create({
    baseURL: 'https://api.messapp.com/v1',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  }), [userToken]);

  const searchVendors = useCallback(async (
    location: Location,
    mealType: MealType,
    radius: number = 15
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/subscriptions/monthly/vendors/available', {
        params: { 
          latitude: location.latitude, 
          longitude: location.longitude, 
          mealType, 
          radius 
        }
      });
      
      setAvailableVendors(response.data.vendors);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const validateSelection = useCallback(async () => {
    if (selectedVendors.length === 0) return;
    
    try {
      const response = await apiClient.post('/subscriptions/monthly/validate', {
        vendorIds: selectedVendors.map(v => v.id),
        mealType: 'LUNCH',
        startDate: '2024-09-01',
        userLocation: { latitude: 25.2048, longitude: 55.2708 }
      });
      
      setValidation(response.data);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  }, [selectedVendors, apiClient]);

  const getCostPreview = useCallback(async () => {
    if (selectedVendors.length === 0) return;
    
    try {
      const vendorIds = selectedVendors.map(v => v.id).join(',');
      const response = await apiClient.get('/subscriptions/monthly/preview', {
        params: {
          vendorIds,
          mealType: 'LUNCH',
          startDate: '2024-09-01'
        }
      });
      
      setCostPreview(response.data);
    } catch (err) {
      console.error('Cost preview failed:', err);
    }
  }, [selectedVendors, apiClient]);

  const createSubscription = useCallback(async (subscriptionData: CreateSubscriptionData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/subscriptions/monthly', subscriptionData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Auto-validate when vendors are selected
  useEffect(() => {
    validateSelection();
  }, [validateSelection]);

  // Auto-preview costs when validation passes
  useEffect(() => {
    if (validation?.isValid) {
      getCostPreview();
    }
  }, [validation, getCostPreview]);

  return {
    loading,
    error,
    availableVendors,
    selectedVendors,
    setSelectedVendors,
    validation,
    costPreview,
    searchVendors,
    createSubscription
  };
};
```

### 3. Error Handling Pattern

```typescript
class APIErrorHandler {
  static handleError(error: any): APIError {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return {
            type: 'VALIDATION_ERROR',
            message: data.message || 'Invalid request data',
            details: data.errors || [],
            isRetryable: false
          };
          
        case 401:
          return {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication failed. Please log in again.',
            isRetryable: false,
            requiresAuth: true
          };
          
        case 429:
          return {
            type: 'RATE_LIMIT_ERROR',
            message: 'Rate limit exceeded. Please try again later.',
            isRetryable: true,
            retryAfter: parseInt(error.response.headers['retry-after']) * 1000 || 60000
          };
          
        case 500:
          return {
            type: 'SERVER_ERROR',
            message: 'Server error. Please try again later.',
            isRetryable: true,
            retryAfter: 30000
          };
      }
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      isRetryable: false
    };
  }

  static async withRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const apiError = this.handleError(error);
        lastError = apiError;
        
        if (!apiError.isRetryable || attempt === maxRetries) {
          throw apiError;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
```

## 📊 Best Practices

### 1. Caching Strategy

```typescript
class CachingAPIClient {
  private cache = new Map<string, { data: any; expires: number }>();

  async get(endpoint: string, params?: any): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const response = await this.apiClient.get(endpoint, { params });
    
    // Cache vendor data for 5 minutes
    if (endpoint.includes('/vendors/available')) {
      this.cache.set(cacheKey, {
        data: response.data,
        expires: Date.now() + 5 * 60 * 1000
      });
    }

    return response.data;
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${JSON.stringify(params || {})}`;
  }
}
```

### 2. Rate Limit Handling

```typescript
class RateLimitManager {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequest = 0;
  private minInterval = 1000; // 1 second between requests

  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) return;
    
    this.processing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minInterval - timeSinceLastRequest)
        );
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequest = Date.now();
        await request();
      }
    }

    this.processing = false;
  }
}
```

### 3. TypeScript Integration

```typescript
// Complete type definitions
export interface CreateMonthlySubscriptionRequest {
  vendorIds: string[];
  mealType: MealType;
  startDate: string;
  addressId: string;
  paymentMethodId: string;
}

export interface MonthlySubscriptionResponse {
  id: string;
  userId: string;
  vendors: VendorSummary[];
  mealType: MealType;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  paymentSummary: PaymentSummary;
  createdAt: string;
  updatedAt: string;
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER'
}

export enum SubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// Client class with full type safety
export class MonthlySubscriptionClient {
  constructor(private apiClient: AxiosInstance) {}

  async createSubscription(
    data: CreateMonthlySubscriptionRequest
  ): Promise<MonthlySubscriptionResponse> {
    const response = await this.apiClient.post('/subscriptions/monthly', data);
    return response.data;
  }

  async getAvailableVendors(
    query: AvailableVendorsQuery
  ): Promise<AvailableVendorsResponse> {
    const response = await this.apiClient.get('/subscriptions/monthly/vendors/available', {
      params: query
    });
    return response.data;
  }

  async validateSelection(
    data: ValidateMonthlySelectionRequest
  ): Promise<ValidationResultResponse> {
    const response = await this.apiClient.post('/subscriptions/monthly/validate', data);
    return response.data;
  }
}
```

## 🔧 Testing Your Integration

### Unit Testing Example

```typescript
import { MonthlySubscriptionClient } from './monthly-subscription-client';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

describe('MonthlySubscriptionClient', () => {
  let client: MonthlySubscriptionClient;
  let mock: MockAdapter;

  beforeEach(() => {
    const apiClient = axios.create();
    mock = new MockAdapter(apiClient);
    client = new MonthlySubscriptionClient(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should create monthly subscription successfully', async () => {
    const subscriptionData = {
      vendorIds: ['vendor1', 'vendor2'],
      mealType: MealType.LUNCH,
      startDate: '2024-09-01',
      addressId: 'address1',
      paymentMethodId: 'payment1'
    };

    const expectedResponse = {
      id: 'subscription1',
      userId: 'user1',
      vendors: [],
      mealType: 'LUNCH',
      status: 'ACTIVE'
    };

    mock.onPost('/subscriptions/monthly').reply(201, expectedResponse);

    const result = await client.createSubscription(subscriptionData);
    expect(result.id).toBe('subscription1');
    expect(result.status).toBe('ACTIVE');
  });

  it('should handle validation errors', async () => {
    const subscriptionData = {
      vendorIds: ['vendor1', 'vendor2', 'vendor3', 'vendor4', 'vendor5'],
      mealType: MealType.LUNCH,
      startDate: '2024-09-01',
      addressId: 'address1',
      paymentMethodId: 'payment1'
    };

    mock.onPost('/subscriptions/monthly').reply(400, {
      message: 'Maximum 4 vendors allowed per subscription'
    });

    await expect(client.createSubscription(subscriptionData))
      .rejects.toThrow('Maximum 4 vendors allowed per subscription');
  });
});
```

## 📚 Complete Example Application

Here's a complete example of a simple web application that creates monthly subscriptions:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Monthly Subscription Demo</title>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body>
    <div id="app">
        <h1>Monthly Subscription Demo</h1>
        
        <div id="vendor-search">
            <h2>1. Search Vendors</h2>
            <button onclick="searchVendors()">Search Vendors Near Dubai</button>
            <div id="vendors-list"></div>
        </div>

        <div id="subscription-form" style="display: none;">
            <h2>2. Create Subscription</h2>
            <button onclick="createSubscription()">Create Monthly Subscription</button>
        </div>

        <div id="result"></div>
    </div>

    <script>
        // Configuration
        const API_BASE_URL = 'https://api.messapp.com/v1';
        const AUTH_TOKEN = 'your-jwt-token-here'; // Get from authentication

        // API Client
        const apiClient = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        // Global state
        let availableVendors = [];
        let selectedVendors = [];

        // Search for available vendors
        async function searchVendors() {
            try {
                document.getElementById('result').innerHTML = 'Searching vendors...';
                
                const response = await apiClient.get('/subscriptions/monthly/vendors/available', {
                    params: {
                        latitude: 25.2048,
                        longitude: 55.2708,
                        mealType: 'LUNCH',
                        radius: 15,
                        limit: 10
                    }
                });

                availableVendors = response.data.vendors;
                displayVendors(availableVendors);
                document.getElementById('subscription-form').style.display = 'block';
                
            } catch (error) {
                document.getElementById('result').innerHTML = 
                    `Error: ${error.response?.data?.message || error.message}`;
            }
        }

        // Display vendors with selection checkboxes
        function displayVendors(vendors) {
            const vendorsList = document.getElementById('vendors-list');
            vendorsList.innerHTML = vendors.map((vendor, index) => `
                <div style="border: 1px solid #ccc; padding: 10px; margin: 5px;">
                    <input type="checkbox" id="vendor-${index}" onchange="toggleVendor('${vendor.id}', this.checked)">
                    <label for="vendor-${index}">
                        <strong>${vendor.name}</strong><br>
                        ${vendor.description}<br>
                        Rating: ${vendor.rating}/5 | Distance: ${vendor.distance}km<br>
                        Average Price: AED ${vendor.averagePrice}
                    </label>
                </div>
            `).join('');
        }

        // Toggle vendor selection
        function toggleVendor(vendorId, isSelected) {
            if (isSelected) {
                if (selectedVendors.length >= 4) {
                    alert('Maximum 4 vendors allowed');
                    event.target.checked = false;
                    return;
                }
                const vendor = availableVendors.find(v => v.id === vendorId);
                selectedVendors.push(vendor);
            } else {
                selectedVendors = selectedVendors.filter(v => v.id !== vendorId);
            }
            
            document.getElementById('result').innerHTML = 
                `Selected ${selectedVendors.length} vendors`;
        }

        // Create monthly subscription
        async function createSubscription() {
            if (selectedVendors.length === 0) {
                alert('Please select at least one vendor');
                return;
            }

            try {
                document.getElementById('result').innerHTML = 'Creating subscription...';

                // Step 1: Validate selection
                const validationResponse = await apiClient.post('/subscriptions/monthly/validate', {
                    vendorIds: selectedVendors.map(v => v.id),
                    mealType: 'LUNCH',
                    startDate: '2024-09-01',
                    userLocation: {
                        latitude: 25.2048,
                        longitude: 55.2708
                    }
                });

                if (!validationResponse.data.isValid) {
                    throw new Error(`Validation failed: ${validationResponse.data.errors.join(', ')}`);
                }

                // Step 2: Get cost preview
                const vendorIds = selectedVendors.map(v => v.id).join(',');
                const previewResponse = await apiClient.get('/subscriptions/monthly/preview', {
                    params: {
                        vendorIds,
                        mealType: 'LUNCH',
                        startDate: '2024-09-01'
                    }
                });

                const totalCost = previewResponse.data.costBreakdown.total;
                if (!confirm(`Total cost: AED ${totalCost}. Continue?`)) {
                    return;
                }

                // Step 3: Create subscription
                const subscriptionResponse = await apiClient.post('/subscriptions/monthly', {
                    vendorIds: selectedVendors.map(v => v.id),
                    mealType: 'LUNCH',
                    startDate: '2024-09-01',
                    addressId: 'user-address-id', // Replace with actual address ID
                    paymentMethodId: 'user-payment-method-id' // Replace with actual payment method ID
                });

                document.getElementById('result').innerHTML = `
                    <h3>Subscription Created Successfully!</h3>
                    <p>Subscription ID: ${subscriptionResponse.data.id}</p>
                    <p>Status: ${subscriptionResponse.data.status}</p>
                    <p>Total Cost: AED ${subscriptionResponse.data.paymentSummary.totalAmount}</p>
                    <p>Start Date: ${subscriptionResponse.data.startDate}</p>
                    <p>End Date: ${subscriptionResponse.data.endDate}</p>
                `;

            } catch (error) {
                document.getElementById('result').innerHTML = 
                    `Error: ${error.response?.data?.message || error.message}`;
            }
        }
    </script>
</body>
</html>
```

---

This integration guide provides comprehensive examples and patterns for integrating with the Monthly Subscription API. The examples cover authentication, error handling, caching, rate limiting, and complete workflow implementations for various platforms and use cases.

**Last Updated**: 2025-08-28  
**Version**: 1.0.0  
**Maintained By**: Development Team

For additional integration support: dev-team@messapp.com