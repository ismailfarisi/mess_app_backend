# Microservices Deployment Plan — Mess App Backend

## Executive Summary

This document provides a comprehensive plan for migrating the Mess App Backend from its current monolithic NestJS architecture to a microservices-based deployment. The migration follows an incremental approach — moving through a **modular monolith** phase before extracting independent services — to minimize risk and maintain continuous delivery.

---

## 1. Current Architecture Assessment

### 1.1 Module Dependency Graph

```
AppModule (root)
├── AuthModule ←→ VendorsModule          (circular via forwardRef)
│   ├── UsersModule
│   └── LoggerModule
├── VendorsModule
│   ├── UsersModule
│   ├── AuthModule (forwardRef)
│   └── RolesModule
├── VendorMenuModule → VendorsModule
├── MealSubscriptionModule
│   ├── VendorMenuModule
│   └── VendorsModule
├── PaymentsModule → MealSubscriptionModule
├── TasksModule → MealSubscriptionModule
├── RatingsModule (isolated — only imports Vendor entity directly)
├── NotificationsModule (isolated)
├── RolesModule (isolated)
└── LoggerModule (global utility)
```

### 1.2 Cross-Module Service Dependencies

| Consumer Service             | Injected Dependencies                                      |
|------------------------------|-------------------------------------------------------------|
| `AuthService`                | `User` repo, `Vendor` repo (direct entity access)          |
| `VendorsService`             | `AuthService`, `UsersService`, `RolesService`               |
| `VendorMenuService`          | `VendorsService`                                            |
| `MonthlySubscriptionService` | `VendorsService`, `VendorMenuService`, `MealSubscriptionService` |
| `PaymentService`             | `MealSubscriptionService`, `EventEmitter2`                  |
| `SubscriptionTasks`          | `MealSubscriptionService`                                   |
| `SubscriptionEvents`         | `NotificationsService`                                      |
| `VendorEvents`               | `NotificationsService`                                      |

### 1.3 Cross-Module Entity Relationships (Foreign Keys)

| Entity               | Foreign Keys To                                  |
|----------------------|--------------------------------------------------|
| `User`               | `Auth` (OneToOne)                                |
| `Vendor`             | `User` (OneToOne), `Auth` (OneToOne)             |
| `VendorMenu`         | `Vendor` (ManyToOne)                             |
| `MealSubscription`   | `User`, `Vendor`, `VendorMenu`, `MonthlySubscription` |
| `MonthlySubscription`| `User`                                           |
| `Payment`            | `User`, `MealSubscription`                       |
| `VendorRating`       | `User`, `Vendor`                                 |
| `Notification`       | `User`                                           |
| `UserRole`           | `User`, `Role`                                   |

### 1.4 Critical Coupling Issues

| Issue                                    | Severity | Detail                                                                                 |
|------------------------------------------|----------|----------------------------------------------------------------------------------------|
| Auth ↔ Vendors circular dependency       | CRITICAL | Both use `forwardRef`; `AuthService` directly queries `User` and `Vendor` repositories |
| Single shared PostgreSQL database        | CRITICAL | All 13 entities in one DB with enforced FK constraints across modules                  |
| Deep transitive chain                    | HIGH     | `Payments → MealSubscription → VendorMenu → Vendors → Auth → Users`                   |
| `MonthlySubscriptionService` orchestration | HIGH   | Single transaction spans Vendors + MealSubscription + capacity updates                 |
| Synchronous event handling               | MEDIUM   | `EventEmitter2` runs in-process; event handlers call `NotificationsService` directly   |

### 1.5 Existing Infrastructure

- **Dockerfile**: Multi-stage Node.js 20 Alpine build
- **docker-compose.dev.yml**: PostGIS 12, Jaeger, OpenTelemetry Collector
- **Observability**: Jaeger tracing + OTEL collector already configured (good foundation)

---

## 2. Proposed Service Boundaries

Based on Domain-Driven Design analysis of the codebase, these are the recommended bounded contexts:

### Service Map

| Service                  | Current Modules                    | Entities Owned                                      | Primary Responsibility                |
|--------------------------|------------------------------------|------------------------------------------------------|---------------------------------------|
| **Identity Service**     | Auth, Users, Roles                 | `Auth`, `User`, `UserAddress`, `Role`, `UserRole`, `Token` | Authentication, authorization, user profiles |
| **Vendor Service**       | Vendors, VendorMenu                | `Vendor`, `VendorMenu`                               | Vendor profiles, menus, availability  |
| **Subscription Service** | MealSubscription, Tasks            | `MealSubscription`, `MonthlySubscription`             | Subscription lifecycle, scheduling    |
| **Payment Service**      | Payments                           | `Payment`                                            | Payment processing, refunds           |
| **Notification Service** | Notifications, Events              | `Notification`                                       | Push/in-app notifications             |
| **Rating Service**       | Ratings                            | `VendorRating`                                       | Vendor ratings and reviews            |

### Inter-Service Communication Pattern

```
                     ┌──────────────┐
                     │  API Gateway │
                     └──────┬───────┘
            ┌───────────────┼───────────────┐
            │               │               │
   ┌────────▼───────┐ ┌────▼────┐ ┌────────▼────────┐
   │ Identity Svc   │ │ Vendor  │ │ Subscription Svc │
   │ (Auth/Users)   │ │ Service │ │ (Meals/Monthly)  │
   └────────┬───────┘ └────┬────┘ └──┬──────────┬────┘
            │              │         │          │
            │   ┌──────────┘         │          │
            │   │    Sync (gRPC)     │          │
            │   │                    │          │
            └───┤              ┌─────▼──┐  ┌───▼──────────┐
                │              │Payment │  │Notification  │
                │              │Service │  │Service       │
                │              └────────┘  └──────────────┘
                │                    │            ▲
                │                    │            │
                │              ┌─────▼────────────┘
                │              │  Message Broker
                │              │  (RabbitMQ/NATS)
                └──────────────┘

   ┌──────────────┐
   │ Rating Svc   │  (mostly independent, async reads)
   └──────────────┘
```

---

## 3. Migration Phases

### Phase 0: Prerequisites (Week 1-2)

Before any decomposition, establish the infrastructure foundation.

#### 0.1 Set Up Message Broker

```yaml
# docker-compose.yml addition
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: mess_app
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
```

#### 0.2 Add NestJS Microservices Package

```bash
npm install @nestjs/microservices amqplib amqp-connection-manager
```

#### 0.3 Set Up API Gateway (Kong or custom NestJS gateway)

```bash
npm install @nestjs/platform-fastify  # For high-performance gateway
```

#### 0.4 Set Up Service Registry & Config

- Use Consul or etcd for service discovery
- Centralize configuration with Vault or AWS Parameter Store
- Establish health check endpoints per service

---

### Phase 1: Modular Monolith (Week 2-4)

**Goal**: Enforce strict module boundaries within the monolith before splitting.

#### 1.1 Eliminate Circular Dependencies

The `Auth ↔ Vendors` circular dependency is the primary blocker.

**Current problem**:
- `AuthService` directly queries `Vendor` and `User` repositories
- `VendorsService` injects `AuthService` for vendor registration

**Solution**: Extract a shared `IdentityModule` that owns all auth-related operations.

```typescript
// src/identity/identity.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Auth, User, Vendor, Token, Role, UserRole, UserAddress]),
    PassportModule,
    JwtModule.registerAsync({ ... }),
  ],
  controllers: [AuthController, UsersController, UserAddressesController],
  providers: [AuthService, UsersService, UserAddressesService, RolesService, JwtStrategy],
  exports: [AuthService, UsersService],
})
export class IdentityModule {}
```

**Vendors module becomes a consumer** (no more forwardRef):
```typescript
// src/vendors/vendors.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor]),
    IdentityModule,  // No forwardRef needed
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
```

#### 1.2 Introduce Internal Event Contracts

Replace direct service calls with typed events where possible:

```typescript
// src/commons/events/event-contracts.ts
export class PaymentCompletedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly subscriptionId: string,
    public readonly amount: number,
  ) {}
}

export class SubscriptionCreatedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly userId: string,
    public readonly vendorIds: string[],
  ) {}
}

export class VendorCapacityChangedEvent {
  constructor(
    public readonly vendorId: string,
    public readonly delta: number,  // +1 or -1
  ) {}
}
```

#### 1.3 Define Module Public APIs

Each module should expose a clear interface — not its entire service:

```typescript
// src/vendors/vendors.interface.ts
export interface IVendorService {
  findOne(id: string): Promise<VendorResponseDto>;
  validateVendorForSubscription(vendorId: string, mealType: MealType): Promise<boolean>;
  checkMonthlyCapacity(vendorId: string): Promise<{ available: boolean; remainingSlots: number }>;
  findVendorsByLocationAndMealType(...): Promise<PaginatedResult<VendorResponseDto>>;
}
```

This interface later becomes the gRPC/REST contract when the module becomes a service.

#### 1.4 Replace Direct Repository Access Across Modules

**Current violation**: `AuthService` directly uses `@InjectRepository(User)` and `@InjectRepository(Vendor)`.

**Fix**: Auth should only work with `Auth` and `Token` entities. User/Vendor lookups happen through their respective services.

```typescript
// Before (AuthService)
@InjectRepository(User) private readonly userRepository: Repository<User>
@InjectRepository(Vendor) private readonly vendorRepository: Repository<Vendor>

// After (AuthService)
constructor(
  @InjectRepository(Auth) private readonly authRepository: Repository<Auth>,
  @InjectRepository(Token) private readonly tokenRepository: Repository<Token>,
  private readonly usersService: UsersService,  // Use service, not repo
  private readonly jwtService: JwtService,
  private readonly dataSource: DataSource,
) {}
```

---

### Phase 2: Extract Notification Service (Week 4-6)

**Why first**: Notifications is the most isolated module — it has no dependents and only receives events.

#### 2.1 Create Standalone NestJS Microservice

```
services/
├── notification-service/
│   ├── src/
│   │   ├── main.ts                    # Microservice bootstrap
│   │   ├── notification.module.ts
│   │   ├── notification.service.ts
│   │   ├── notification.controller.ts  # Message pattern handlers
│   │   ├── entities/
│   │   │   └── notification.entity.ts
│   │   └── dto/
│   ├── Dockerfile
│   └── package.json
```

#### 2.2 Microservice Bootstrap

```typescript
// services/notification-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: 'notification_queue',
        queueOptions: { durable: true },
      },
    },
  );
  await app.listen();
}
bootstrap();
```

#### 2.3 Message Pattern Handlers

```typescript
// services/notification-service/src/notification.controller.ts
@Controller()
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @MessagePattern('notification.create')
  async handleCreate(@Payload() data: CreateNotificationDto) {
    return this.service.create(data.userId, data.type, data.message);
  }

  @EventPattern('payment.completed')
  async handlePaymentCompleted(@Payload() data: PaymentCompletedEvent) {
    await this.service.create(
      data.userId,
      NotificationType.PAYMENT_SUCCESS,
      `Payment of ${data.amount} completed successfully`,
    );
  }

  @EventPattern('subscription.expiring')
  async handleSubscriptionExpiring(@Payload() data: { userId: string; daysLeft: number }) {
    await this.service.create(
      data.userId,
      NotificationType.SUBSCRIPTION_EXPIRING,
      `Your subscription will expire in ${data.daysLeft} days.`,
    );
  }
}
```

#### 2.4 Update Monolith to Publish Events

Replace direct `NotificationsService` calls with RabbitMQ publishing:

```typescript
// In the monolith — replace EventEmitter2 with ClientProxy
@Module({
  imports: [
    ClientsModule.register([{
      name: 'NOTIFICATION_SERVICE',
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL],
        queue: 'notification_queue',
      },
    }]),
  ],
})

// In PaymentService
constructor(
  @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
) {}

// Emit event to message broker instead of in-process EventEmitter2
this.notificationClient.emit('payment.completed', {
  paymentId: savedPayment.id,
  userId,
  subscriptionId: subscription.id,
  amount: subscription.price,
});
```

#### 2.5 Notification Service Gets Its Own Database

```yaml
# docker-compose.yml
notification-db:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: notifications
    POSTGRES_USER: notification_svc
    POSTGRES_PASSWORD: ${NOTIFICATION_DB_PASSWORD}
  volumes:
    - notification_data:/var/lib/postgresql/data
```

The `notifications` table is removed from the main database. The notification service only stores `userId` (a UUID reference) — no FK constraint to the `users` table.

---

### Phase 3: Extract Rating Service (Week 6-8)

**Why second**: Ratings has minimal dependencies — just `userId` and `vendorId` references.

#### 3.1 Service Structure

```
services/
├── rating-service/
│   ├── src/
│   │   ├── main.ts
│   │   ├── rating.module.ts
│   │   ├── rating.service.ts
│   │   ├── rating.controller.ts    # HTTP + Message handlers
│   │   └── entities/
│   │       └── vendor-rating.entity.ts
│   ├── Dockerfile
│   └── package.json
```

#### 3.2 Communication Pattern

- **HTTP** for user-facing CRUD (create rating, get ratings)
- **Async event** to update vendor aggregate rating in the Vendor Service

```typescript
// When a new rating is created
this.vendorClient.emit('vendor.rating_updated', {
  vendorId,
  newAvgRating: calculatedAverage,
  totalRatings: count,
});
```

The Vendor Service listens and updates its local `vendor.rating` and `vendor.totalRatings` columns (eventually consistent).

---

### Phase 4: Extract Payment Service (Week 8-11)

#### 4.1 Breaking the Synchronous Dependency

**Current**: `PaymentService` directly injects `MealSubscriptionService` to look up subscription details.

**Solution**: Payment Service calls Subscription Service via **synchronous gRPC** for the subscription lookup, then publishes events asynchronously.

```typescript
// Payment Service — gRPC client call
const subscription = await this.subscriptionGrpcClient
  .getService<SubscriptionServiceClient>('SubscriptionService')
  .findSubscription({ userId, subscriptionId: createDto.subscriptionId });
```

#### 4.2 gRPC Proto Definition

```protobuf
// proto/subscription.proto
syntax = "proto3";

package subscription;

service SubscriptionService {
  rpc FindSubscription(FindSubscriptionRequest) returns (SubscriptionResponse);
  rpc UpdateSubscriptionStatus(UpdateStatusRequest) returns (SubscriptionResponse);
}

message FindSubscriptionRequest {
  string user_id = 1;
  string subscription_id = 2;
}

message SubscriptionResponse {
  string id = 1;
  string user_id = 2;
  string vendor_id = 3;
  string status = 4;
  string price = 5;
  string meal_type = 6;
}
```

#### 4.3 Saga Pattern for Payment + Subscription

The current flow `create payment → process → update subscription status` becomes a saga:

```
1. Payment Service: Create payment record (PENDING)
2. Payment Service: Process with payment gateway
3. Payment Service: Emit 'payment.completed' event
4. Subscription Service: Listen → update subscription status to PAID
5. Subscription Service: Emit 'subscription.activated'
6. Notification Service: Listen → notify user

Compensation (on failure):
3a. Payment Service: Emit 'payment.failed' event
4a. Subscription Service: Listen → mark subscription as PAYMENT_FAILED
5a. Notification Service: Listen → notify user of failure
```

---

### Phase 5: Extract Subscription Service (Week 11-15)

This is the most complex extraction due to the `MonthlySubscriptionService` orchestration.

#### 5.1 Key Challenge: Distributed Transaction

**Current**: `createMonthlySubscription()` runs a single `QueryRunner` transaction that:
1. Validates vendors (calls `VendorsService`)
2. Gets menu pricing (calls `VendorMenuService`)
3. Creates `MealSubscription` records
4. Creates `MonthlySubscription` record
5. Updates vendor capacities

**Solution**: Orchestration Saga with compensation.

```
┌─────────────────────┐
│ Subscription Service│
│  (Saga Orchestrator) │
└──────────┬──────────┘
           │
     ┌─────▼──────┐     Step 1: Validate vendors + capacity
     │ Vendor Svc  │────────────────────────────────────────►
     └─────────────┘     Response: vendor details, menu prices
           │
     ┌─────▼──────┐     Step 2: Reserve capacity
     │ Vendor Svc  │────────────────────────────────────────►
     └─────────────┘     Response: reservation token
           │
     ┌─────▼──────────┐  Step 3: Create subscription records
     │ Subscription DB │──────────────────────────────────────►
     └────────────────┘  (local transaction — MealSub + MonthlySub)
           │
     ┌─────▼──────┐     Step 4: Confirm capacity reservation
     │ Vendor Svc  │────────────────────────────────────────►
     └─────────────┘
           │
     ┌─────▼──────┐     Step 5: Emit subscription.created
     │ Event Bus   │────────────────────────────────────────►
     └─────────────┘
```

**Compensation on Step 3 failure**:
- Release vendor capacity reservations (Step 2 rollback)

**Compensation on Step 4 failure**:
- Cancel subscription records (Step 3 rollback)
- Release vendor capacity reservations (Step 2 rollback)

#### 5.2 Scheduled Tasks

The `SubscriptionTasks` cron job (`checkAndUpdateExpiredSubscriptions`) stays with the Subscription Service — it only needs access to `MealSubscription` entities.

---

### Phase 6: Extract Identity Service (Week 15-18)

#### 6.1 Standalone Auth/Identity Microservice

```
services/
├── identity-service/
│   ├── src/
│   │   ├── main.ts
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── strategies/jwt.strategy.ts
│   │   ├── users/
│   │   │   ├── users.service.ts
│   │   │   └── users.controller.ts
│   │   ├── roles/
│   │   │   └── roles.service.ts
│   │   └── entities/
│   │       ├── auth.entity.ts
│   │       ├── user.entity.ts
│   │       ├── user-address.entity.ts
│   │       ├── token.entity.ts
│   │       ├── role.entity.ts
│   │       └── user-role.entity.ts
│   ├── Dockerfile
│   └── package.json
```

#### 6.2 Token Validation Strategy

Other services need to validate JWTs without calling the Identity Service on every request.

**Option A: Shared JWT Secret** (simpler)
- All services share the JWT secret via environment variable
- Each service validates tokens locally using `passport-jwt`
- Trade-off: Secret rotation requires redeploying all services

**Option B: JWKS Endpoint** (recommended for production)
- Identity Service exposes `/.well-known/jwks.json`
- Other services fetch and cache the public key
- Token validation is local after key fetch
- Key rotation is seamless

```typescript
// In each microservice
JwtModule.registerAsync({
  useFactory: () => ({
    publicKey: fetchedFromJWKS,
    algorithms: ['RS256'],
  }),
}),
```

#### 6.3 User Data in Other Services

After extraction, other services (Subscriptions, Payments) store `userId` as a UUID but cannot JOIN to the `users` table.

**Pattern**: Each service caches the minimal user data it needs:

```typescript
// In Subscription Service — local user cache
@Entity('user_cache')
export class UserCache {
  @PrimaryColumn('uuid')
  userId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @UpdateDateColumn()
  lastSyncedAt: Date;
}
```

Updated via `user.updated` events from the Identity Service.

---

### Phase 7: Extract Vendor Service (Week 18-20)

#### 7.1 PostGIS Dependency

The Vendor Service requires PostGIS for spatial queries (`ST_DWithin`, geography columns). Its database must be PostGIS-enabled:

```yaml
vendor-db:
  image: postgis/postgis:16-3.4
  environment:
    POSTGRES_DB: vendors
```

#### 7.2 Vendor Menu as Part of Vendor Service

`VendorMenu` is tightly coupled to `Vendor` (ManyToOne FK, always queried together). Keep them in the same service.

#### 7.3 API Contracts for Subscription Service

The Subscription Service's heaviest dependency is on Vendor data. Define a clear gRPC contract:

```protobuf
service VendorService {
  rpc FindOne(VendorIdRequest) returns (VendorResponse);
  rpc ValidateForSubscription(ValidateVendorRequest) returns (ValidationResponse);
  rpc CheckCapacity(CapacityRequest) returns (CapacityResponse);
  rpc ReserveCapacity(ReserveRequest) returns (ReservationToken);
  rpc ConfirmReservation(ConfirmRequest) returns (ConfirmResponse);
  rpc ReleaseReservation(ReleaseRequest) returns (ReleaseResponse);
  rpc FindByLocationAndMealType(LocationQuery) returns (VendorListResponse);
  rpc GetMenuByVendor(MenuQuery) returns (MenuResponse);
}
```

---

## 4. Infrastructure & Deployment

### 4.1 Container Orchestration (Kubernetes)

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mess-app

---
# k8s/identity-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: identity-service
  namespace: mess-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: identity-service
  template:
    metadata:
      labels:
        app: identity-service
    spec:
      containers:
      - name: identity-service
        image: mess-app/identity-service:latest
        ports:
        - containerPort: 3000  # HTTP
        - containerPort: 5000  # gRPC
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: identity-db-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 4.2 Service Scaling Guidelines

| Service              | Min Replicas | Max Replicas | Scaling Metric         |
|----------------------|-------------|-------------|------------------------|
| Identity Service     | 2           | 5           | CPU > 70%              |
| Vendor Service       | 2           | 8           | CPU > 60% (PostGIS heavy) |
| Subscription Service | 2           | 10          | Request rate           |
| Payment Service      | 2           | 5           | Queue depth            |
| Notification Service | 1           | 5           | Queue depth            |
| Rating Service       | 1           | 3           | CPU > 70%              |

### 4.3 Database Per Service

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ identity_db  │  │ vendor_db    │  │ subscription │
│ (PostgreSQL) │  │ (PostGIS)    │  │ _db (PG)     │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ auth         │  │ vendors      │  │ meal_sub     │
│ users        │  │ vendor_menus │  │ monthly_sub  │
│ user_address │  │              │  │ user_cache   │
│ tokens       │  │              │  │ vendor_cache │
│ roles        │  │              │  │              │
│ user_roles   │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ payment_db   │  │ notification │  │ rating_db    │
│ (PostgreSQL) │  │ _db (PG)     │  │ (PostgreSQL) │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ payments     │  │ notifications│  │ vendor_rating│
│ sub_cache    │  │              │  │ vendor_cache │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 4.4 Docker Compose (Development)

```yaml
version: '3.8'

services:
  # --- Infrastructure ---
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: mess_app
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-devpassword}

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"

  # --- Databases ---
  identity-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: identity
      POSTGRES_USER: identity_svc
      POSTGRES_PASSWORD: ${IDENTITY_DB_PASSWORD:-devpassword}
    volumes:
      - identity_data:/var/lib/postgresql/data

  vendor-db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: vendors
      POSTGRES_USER: vendor_svc
      POSTGRES_PASSWORD: ${VENDOR_DB_PASSWORD:-devpassword}
    volumes:
      - vendor_data:/var/lib/postgresql/data

  subscription-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: subscriptions
      POSTGRES_USER: subscription_svc
      POSTGRES_PASSWORD: ${SUB_DB_PASSWORD:-devpassword}
    volumes:
      - subscription_data:/var/lib/postgresql/data

  payment-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: payments
      POSTGRES_USER: payment_svc
      POSTGRES_PASSWORD: ${PAYMENT_DB_PASSWORD:-devpassword}
    volumes:
      - payment_data:/var/lib/postgresql/data

  notification-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: notifications
      POSTGRES_USER: notification_svc
      POSTGRES_PASSWORD: ${NOTIF_DB_PASSWORD:-devpassword}
    volumes:
      - notification_data:/var/lib/postgresql/data

  rating-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ratings
      POSTGRES_USER: rating_svc
      POSTGRES_PASSWORD: ${RATING_DB_PASSWORD:-devpassword}
    volumes:
      - rating_data:/var/lib/postgresql/data

  # --- Services ---
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    depends_on:
      - identity-service
      - vendor-service
      - subscription-service
      - payment-service
    environment:
      - IDENTITY_SERVICE_URL=http://identity-service:3001
      - VENDOR_SERVICE_URL=http://vendor-service:3002
      - SUBSCRIPTION_SERVICE_URL=http://subscription-service:3003
      - PAYMENT_SERVICE_URL=http://payment-service:3004

  identity-service:
    build: ./services/identity-service
    ports:
      - "3001:3000"
      - "5001:5000"
    depends_on:
      - identity-db
      - rabbitmq
    environment:
      - DATABASE_URL=postgresql://identity_svc:devpassword@identity-db:5432/identity
      - RABBITMQ_URL=amqp://mess_app:devpassword@rabbitmq:5672

  vendor-service:
    build: ./services/vendor-service
    ports:
      - "3002:3000"
      - "5002:5000"
    depends_on:
      - vendor-db
      - rabbitmq
    environment:
      - DATABASE_URL=postgresql://vendor_svc:devpassword@vendor-db:5432/vendors
      - RABBITMQ_URL=amqp://mess_app:devpassword@rabbitmq:5672

  subscription-service:
    build: ./services/subscription-service
    ports:
      - "3003:3000"
      - "5003:5000"
    depends_on:
      - subscription-db
      - rabbitmq
    environment:
      - DATABASE_URL=postgresql://subscription_svc:devpassword@subscription-db:5432/subscriptions
      - RABBITMQ_URL=amqp://mess_app:devpassword@rabbitmq:5672
      - VENDOR_GRPC_URL=vendor-service:5000

  payment-service:
    build: ./services/payment-service
    ports:
      - "3004:3000"
    depends_on:
      - payment-db
      - rabbitmq
    environment:
      - DATABASE_URL=postgresql://payment_svc:devpassword@payment-db:5432/payments
      - RABBITMQ_URL=amqp://mess_app:devpassword@rabbitmq:5672
      - SUBSCRIPTION_GRPC_URL=subscription-service:5000

  notification-service:
    build: ./services/notification-service
    depends_on:
      - notification-db
      - rabbitmq
    environment:
      - DATABASE_URL=postgresql://notification_svc:devpassword@notification-db:5432/notifications
      - RABBITMQ_URL=amqp://mess_app:devpassword@rabbitmq:5672

  rating-service:
    build: ./services/rating-service
    ports:
      - "3005:3000"
    depends_on:
      - rating-db
      - rabbitmq
    environment:
      - DATABASE_URL=postgresql://rating_svc:devpassword@rating-db:5432/ratings
      - RABBITMQ_URL=amqp://mess_app:devpassword@rabbitmq:5672

volumes:
  identity_data:
  vendor_data:
  subscription_data:
  payment_data:
  notification_data:
  rating_data:
```

---

## 5. Cross-Cutting Concerns

### 5.1 Distributed Tracing (Already Partially Set Up)

The existing Jaeger + OpenTelemetry setup extends naturally to microservices:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

Each service propagates trace context via HTTP headers and gRPC metadata.

### 5.2 Centralized Logging

Replace the custom `LoggerService` with structured JSON logging + a log aggregator:

```typescript
// Each service
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

WinstonModule.forRoot({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});
```

Aggregate logs with the **ELK Stack** (Elasticsearch + Logstash + Kibana) or **Loki + Grafana**.

### 5.3 Health Checks

```typescript
// In every service
import { TerminusModule, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

### 5.4 Circuit Breaker

For synchronous inter-service calls (gRPC), use circuit breakers to prevent cascade failures:

```bash
npm install opossum  # Circuit breaker library
```

```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(
  (vendorId: string) => this.vendorGrpcClient.findOne({ id: vendorId }),
  {
    timeout: 3000,       // 3s timeout
    errorThresholdPercentage: 50,
    resetTimeout: 30000,  // 30s before half-open
  },
);
```

### 5.5 API Gateway Routing

```typescript
// services/api-gateway/src/app.module.ts
@Module({
  imports: [
    ClientsModule.register([
      { name: 'IDENTITY_SERVICE', transport: Transport.TCP, options: { host: 'identity-service', port: 3001 } },
      { name: 'VENDOR_SERVICE', transport: Transport.TCP, options: { host: 'vendor-service', port: 3002 } },
      { name: 'SUBSCRIPTION_SERVICE', transport: Transport.TCP, options: { host: 'subscription-service', port: 3003 } },
      { name: 'PAYMENT_SERVICE', transport: Transport.TCP, options: { host: 'payment-service', port: 3004 } },
    ]),
  ],
})
```

Route mapping:
| Route Pattern          | Target Service       |
|------------------------|---------------------|
| `/auth/**`             | Identity Service    |
| `/users/**`            | Identity Service    |
| `/vendors/**`          | Vendor Service      |
| `/vendor-menu/**`      | Vendor Service      |
| `/meal-subscription/**`| Subscription Service|
| `/monthly-subscription/**` | Subscription Service |
| `/payments/**`         | Payment Service     |
| `/notifications/**`    | Notification Service|
| `/ratings/**`          | Rating Service      |

---

## 6. Data Migration Strategy

### 6.1 Migration Order

1. **Notifications** — Copy `notifications` table to notification-db, then drop from main
2. **Ratings** — Copy `vendor_ratings` table to rating-db, then drop from main
3. **Payments** — Copy `payments` table to payment-db, add `sub_cache`, then drop from main
4. **Subscriptions** — Copy `meal_subscriptions` + `monthly_subscriptions`, add caches, then drop
5. **Vendors** — Copy `vendors` + `vendor_menus`, then drop from main
6. **Identity** — Remaining tables stay (they ARE the identity-db now)

### 6.2 Zero-Downtime Data Migration Pattern

For each service extraction:

1. **Dual-write phase**: Monolith writes to both old DB and new service DB
2. **Backfill**: Migrate historical data to the new service DB
3. **Verify**: Compare data between old and new
4. **Switch reads**: Monolith reads from new service
5. **Stop dual-write**: Remove old table after validation period

---

## 7. Timeline Summary

| Phase | Description                          | Duration   | Risk  |
|-------|--------------------------------------|------------|-------|
| 0     | Infrastructure setup (broker, K8s)   | 2 weeks    | Low   |
| 1     | Modular monolith refactoring         | 2 weeks    | Low   |
| 2     | Extract Notification Service         | 2 weeks    | Low   |
| 3     | Extract Rating Service               | 2 weeks    | Low   |
| 4     | Extract Payment Service              | 3 weeks    | Medium|
| 5     | Extract Subscription Service         | 4 weeks    | High  |
| 6     | Extract Identity Service             | 3 weeks    | High  |
| 7     | Extract Vendor Service               | 2 weeks    | Medium|
|       | **Total**                            | **~20 weeks** |    |

---

## 8. When NOT to Do This

Microservices add operational complexity. Consider staying with the monolith if:

- **Team size < 5 developers** — The overhead of managing 6+ services, databases, and a message broker outweighs the benefits
- **Traffic < 1000 RPM** — A single NestJS instance on a 2-core VM handles this comfortably
- **No independent scaling needs** — If all modules grow at the same rate, horizontal scaling of the monolith is simpler
- **No independent deployment needs** — If the entire app deploys together anyway, microservices add latency without benefit

**Recommended alternative for small teams**: Stay at **Phase 1 (modular monolith)** and deploy as a single container with the existing Dockerfile. This gives you clean module boundaries and the ability to extract services later when the need arises.
