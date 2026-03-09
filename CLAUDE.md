# CLAUDE.md — Mess App Backend

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| Database | PostgreSQL + TypeORM 0.3 |
| Spatial | PostGIS extension |
| Auth | Passport JWT + bcrypt |
| Validation | class-validator + class-transformer |
| API Docs | Swagger/OpenAPI |
| Logging | Custom ConsoleLogger service |
| Scheduler | @nestjs/schedule |
| Events | @nestjs/event-emitter |

---

## Project Structure

```
src/
├── app.module.ts           # Root module
├── main.ts                 # Bootstrap: global pipes, interceptors, Swagger
├── app.config.ts           # CORS per environment
├── auth/                   # JWT auth, guards, strategies, decorators
├── users/                  # User profiles and addresses
├── vendors/                # Vendor profiles, analytics
├── vendor-menu/            # Menu definitions, weekly meal plans
├── meal-subscription/      # Individual & monthly subscriptions
├── payments/               # Payment processing
├── ratings/                # Vendor ratings and reviews
├── notifications/          # Push/in-app notifications
├── roles/                  # RBAC definitions
├── tasks/                  # Scheduled/async tasks
├── commons/enums/          # Shared enums (MealType, etc.)
├── config/                 # database.config.ts, jwt.config.ts
├── database/seeds/         # Seed scripts
├── logger/                 # LoggerService + LoggerInterceptor
└── migrations/             # TypeORM migrations
```

---

## Architecture Patterns

### Module Layout

Every feature module follows this structure:

```
feature/
├── feature.module.ts
├── feature.controller.ts
├── feature.service.ts
├── dto/
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
├── entities/
│   └── feature.entity.ts
├── enums/          (if feature-specific)
├── guards/         (if feature-specific)
├── decorators/     (if feature-specific)
└── interfaces/     (if needed)
```

### Shared / cross-cutting concerns live in:
- `src/commons/enums/` — shared enums used across modules
- `src/logger/` — global logger service and interceptor
- `src/config/` — typed config via `registerAs`
- `src/auth/guards/`, `src/auth/decorators/` — reused in other modules

---

## Entity Patterns (TypeORM)

- UUID primary keys: `@PrimaryGeneratedColumn('uuid')`
- Always use `@CreateDateColumn()` and `@UpdateDateColumn()`
- Relationships: `@ManyToOne`, `@OneToMany`, `@OneToOne` with explicit `@JoinColumn`
- Use `enum` columns for constrained values
- Use `jsonb` for complex/flexible data (e.g. `businessHours`, `acceptedPaymentMethods`)
- Use PostGIS `geography(Point,4326)` for location coordinates
- Place entity-specific helper methods (e.g. `isAccountLocked()`) on the entity class itself

```typescript
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## DTO Patterns

- Use `class-validator` decorators for all validation
- Use `@Transform()` to normalize input (trim strings, lowercase emails)
- Use `@ValidateNested()` + `@Type()` for nested object validation
- Document every field with `@ApiProperty()` for Swagger
- Enums in DTOs must use `@IsEnum(SomeEnum)`

```typescript
export class RegisterDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value.trim())
  @ApiProperty()
  name: string;

  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  @ApiProperty()
  email: string;
}
```

---

## Service Patterns

- All services are `@Injectable()` using constructor injection
- Use `@InjectRepository(Entity)` to inject TypeORM repositories
- Use `QueryRunner` + transactions for multi-step write operations (create, rollback on failure)
- Throw NestJS built-in exceptions — never raw errors

```typescript
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth) private readonly authRepo: Repository<Auth>,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // ... write operations
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      this.handleDbError(error);
    } finally {
      await qr.release();
    }
  }
}
```

---

## Controller Patterns

- All endpoints documented with Swagger: `@ApiTags`, `@ApiOperation`, `@ApiBody`, `@ApiResponse`
- Protected routes use `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth('JWT-auth')`
- Extract current user with custom `@GetUser()` decorator
- Role-based access: `@RequireRoles(Role.ADMIN)` or `@RequireAllRoles(...)`
- Never put business logic in controllers — delegate to services

```typescript
@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(Role.USER)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a payment' })
  create(@Body() dto: CreatePaymentDto, @GetUser() user: JwtUser) {
    return this.paymentService.create(dto, user);
  }
}
```

---

## Error Handling

Use only NestJS built-in exceptions:

| Scenario | Exception |
|---|---|
| Resource not found | `NotFoundException` |
| Unauthenticated | `UnauthorizedException` |
| Duplicate email/phone | `ConflictException` |
| Invalid input | `BadRequestException` |
| Access denied | `ForbiddenException` |

Handle PostgreSQL errors by code in service catch blocks:

```typescript
if (error instanceof QueryFailedError) {
  const pg = error as any;
  if (pg.code === '23505') { // unique violation
    if (pg.constraint?.includes('email')) {
      throw new ConflictException('Email already registered');
    }
  }
}
```

---

## Authentication & Authorization

- Auth entity is **polymorphic**: linked to either a `User` or a `Vendor`
- JWT payload includes: `authId`, `userId`/`vendorId`, `roles`
- Account locking: track failed login attempts on `Auth` entity
- Guards:
  - `JwtAuthGuard` — validates JWT, attaches user to request
  - `RolesGuard` — checks roles metadata, supports OR (`@RequireRoles`) and AND (`@RequireAllRoles`) logic
- Custom decorator `@GetUser()` extracts the authenticated entity from `req.user`

---

## Validation (Global)

Configured in `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // strip unknown properties
  transform: true,              // transform payloads to DTO class instances
  forbidNonWhitelisted: true,   // throw on extra properties
  transformOptions: { enableImplicitConversion: true },
}));
```

Never manually validate request bodies in services — rely on the global `ValidationPipe` and DTOs.

---

## Logging

- Use `LoggerService` (custom `ConsoleLogger`) injected into services
- `LoggerInterceptor` is global — logs every request and catches all HTTP exceptions
- Log levels: `log`, `warn`, `error`
- Do not use `console.log` anywhere; always use the injected logger

```typescript
@Injectable()
export class SomeService {
  private readonly logger = new Logger(SomeService.name);

  doSomething() {
    this.logger.log('Doing something');
  }
}
```

---

## Enums

- Feature-specific enums go in `feature/enums/feature-name.enum.ts`
- Shared enums go in `src/commons/enums/`
- Always use `const enum` only if not needed at runtime; otherwise use plain `enum`
- Suffix enum files: `*.enum.ts`

---

## Configuration

- All config loaded via `@nestjs/config` with typed namespaces (`registerAs`)
- Config files in `src/config/`; accessed via `ConfigService`
- Never hardcode secrets; always read from environment variables with sensible fallbacks for local dev
- `synchronize: true` only in non-production environments

---

## Database Migrations

- Migrations live in `src/migrations/`
- Generate: `typeorm migration:generate`
- Run: `typeorm migration:run`
- Never run raw SQL manually in production — always use migrations

---

## Testing

- Unit tests: jest with `.spec.ts` suffix alongside source files
- E2E tests: `test/` directory using Supertest
- Mock repositories using `@nestjs/testing` + `createMock`

---

## Coding Conventions

- File naming: `kebab-case.type.ts` (e.g. `meal-subscription.service.ts`)
- Class naming: `PascalCase`
- Variable/function naming: `camelCase`
- Enum values: `UPPER_SNAKE_CASE`
- No `any` types unless wrapping external/untyped libs; prefer explicit interfaces
- Prefer `async/await` over `.then()` chains
- Keep controllers thin — all logic in services
- Export barrel files (`index.ts`) only when a module exposes a public API to other modules
