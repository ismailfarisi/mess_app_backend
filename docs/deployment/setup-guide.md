# Monthly Subscription System - Deployment Guide

This comprehensive guide provides step-by-step instructions for deploying the Monthly Subscription system, including environment setup, database migrations, infrastructure configuration, and monitoring setup.

## 🎯 Deployment Overview

### System Requirements
- **Node.js**: v18.x or later
- **PostgreSQL**: v14.x with PostGIS extension
- **Redis**: v6.x (for caching and session management)
- **Docker**: v20.x (recommended for containerized deployment)
- **nginx**: v1.20+ (reverse proxy and load balancing)
- **SSL Certificate**: Required for production deployments

### Deployment Environments
1. **Development**: Local development with hot reload
2. **Staging**: Pre-production testing environment
3. **Production**: Live production environment with full monitoring

## 🏗️ Infrastructure Setup

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL with PostGIS
  postgres:
    image: postgis/postgis:14-3.2
    container_name: messapp_postgres
    environment:
      POSTGRES_DB: messapp
      POSTGRES_USER: messapp_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - messapp_network
    restart: unless-stopped

  # Redis for caching
  redis:
    image: redis:6.2-alpine
    container_name: messapp_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - messapp_network
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  # NestJS Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: messapp_backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: messapp_user
      DB_PASSWORD: ${DB_PASSWORD}
      DB_DATABASE: messapp
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    networks:
      - messapp_network
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  # nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: messapp_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./static:/var/www/static
    depends_on:
      - app
    networks:
      - messapp_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  messapp_network:
    driver: bridge
```

### Dockerfile Configuration

```dockerfile
# Multi-stage Dockerfile
FROM node:18-alpine AS base

# Install dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Production stage
FROM base AS production
ENV NODE_ENV=production
USER node

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

## 🗄️ Database Setup

### Initial Database Setup

```bash
#!/bin/bash
# init-database.sh

set -e

echo "Setting up PostgreSQL with PostGIS..."

# Create database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "postgis";
    CREATE EXTENSION IF NOT EXISTS "postgis_topology";
    
    -- Create custom types
    DO \$\$ BEGIN
        CREATE TYPE meal_type_enum AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END \$\$;
    
    DO \$\$ BEGIN
        CREATE TYPE subscription_status_enum AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END \$\$;
    
    -- Create application user
    DO \$\$ BEGIN
        CREATE ROLE application_user;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END \$\$;
    
    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE messapp TO application_user;
    GRANT USAGE ON SCHEMA public TO application_user;
    GRANT CREATE ON SCHEMA public TO application_user;
    
    COMMIT;
EOSQL

echo "Database setup completed successfully!"
```

### Migration Scripts

```typescript
// migrations/1724827800000-CreateMonthlySubscriptions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMonthlySubscriptions1724827800000 implements MigrationInterface {
  name = 'CreateMonthlySubscriptions1724827800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create monthly_subscriptions table
    await queryRunner.query(`
      CREATE TABLE "monthly_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "meal_type" meal_type_enum NOT NULL,
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "status" subscription_status_enum NOT NULL DEFAULT 'PENDING',
        "address_id" uuid NOT NULL,
        "payment_method_id" uuid NOT NULL,
        "total_amount" numeric(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_monthly_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_monthly_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_monthly_subscriptions_address" FOREIGN KEY ("address_id") REFERENCES "user_addresses"("id"),
        CONSTRAINT "FK_monthly_subscriptions_payment" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id"),
        CONSTRAINT "CHK_valid_date_range" CHECK ("end_date" > "start_date"),
        CONSTRAINT "CHK_positive_amount" CHECK ("total_amount" > 0)
      )
    `);

    // Create monthly_subscription_vendors junction table
    await queryRunner.query(`
      CREATE TABLE "monthly_subscription_vendors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "monthly_subscription_id" uuid NOT NULL,
        "vendor_id" uuid NOT NULL,
        "allocated_days" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_monthly_subscription_vendors" PRIMARY KEY ("id"),
        CONSTRAINT "FK_msv_subscription" FOREIGN KEY ("monthly_subscription_id") REFERENCES "monthly_subscriptions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_msv_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_subscription_vendor" UNIQUE ("monthly_subscription_id", "vendor_id"),
        CONSTRAINT "CHK_positive_days" CHECK ("allocated_days" >= 0),
        CONSTRAINT "CHK_max_allocated_days" CHECK ("allocated_days" <= 31)
      )
    `);

    // Add subscription-specific columns to vendors table
    await queryRunner.query(`
      ALTER TABLE "vendors" 
      ADD COLUMN IF NOT EXISTS "subscription_enabled" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "min_subscription_orders" integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "max_subscription_orders" integer DEFAULT 50
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_monthly_subscriptions_user_id" ON "monthly_subscriptions" ("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_monthly_subscriptions_status" ON "monthly_subscriptions" ("status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_monthly_subscriptions_date_range" ON "monthly_subscriptions" ("start_date", "end_date");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_monthly_subscription_vendors_subscription" ON "monthly_subscription_vendors" ("monthly_subscription_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_monthly_subscription_vendors_vendor" ON "monthly_subscription_vendors" ("vendor_id");
    `);

    // Create partial indexes for active subscriptions
    await queryRunner.query(`
      CREATE INDEX "IDX_active_subscriptions" ON "monthly_subscriptions" ("user_id", "start_date", "end_date") 
      WHERE "status" = 'ACTIVE';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "monthly_subscription_vendors"`);
    await queryRunner.query(`DROP TABLE "monthly_subscriptions"`);
    
    // Remove added columns
    await queryRunner.query(`
      ALTER TABLE "vendors" 
      DROP COLUMN IF EXISTS "subscription_enabled",
      DROP COLUMN IF EXISTS "min_subscription_orders",
      DROP COLUMN IF EXISTS "max_subscription_orders"
    `);
  }
}
```

## 🔧 Environment Configuration

### Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=messapp_user
DB_PASSWORD=your_secure_db_password
DB_DATABASE=messapp
DB_SCHEMA=public
DB_SSL_MODE=require

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# API Configuration
API_PREFIX=v1
API_VERSION=1.0.0
API_RATE_LIMIT_TTL=60
API_RATE_LIMIT_LIMIT=100

# File Upload Configuration
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# External Services
PAYMENT_GATEWAY_URL=https://api.payment-provider.com
PAYMENT_GATEWAY_API_KEY=your_payment_gateway_api_key
NOTIFICATION_SERVICE_URL=https://api.notifications.com
EMAIL_SERVICE_API_KEY=your_email_service_api_key

# Monitoring & Logging
LOG_LEVEL=info
ENABLE_CONSOLE_LOGS=false
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Health Check Configuration
HEALTH_CHECK_DATABASE=true
HEALTH_CHECK_REDIS=true
HEALTH_CHECK_TIMEOUT=5000

# Geospatial Configuration
DEFAULT_SEARCH_RADIUS=15
MAX_SEARCH_RADIUS=50
DISTANCE_UNIT=km

# Business Rules
MAX_VENDORS_PER_SUBSCRIPTION=4
SUBSCRIPTION_DURATION_MONTHS=1
MIN_SUBSCRIPTION_AMOUNT=100
```

### nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Upstream Backend
    upstream messapp_backend {
        server app:3000;
        keepalive 32;
    }

    # HTTPS Redirect
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # Main Server Block
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API Routes
        location /v1/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://messapp_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Authentication Routes (Stricter Rate Limit)
        location /v1/auth/ {
            limit_req zone=auth burst=10 nodelay;
            
            proxy_pass http://messapp_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health Check
        location /health {
            proxy_pass http://messapp_backend;
            access_log off;
        }

        # Static Files
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # File Uploads
        location /uploads/ {
            proxy_pass http://messapp_backend;
            client_max_body_size 10M;
        }
    }
}
```

## 🚀 Deployment Process

### Automated Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

echo "🚀 Starting deployment for environment: ${ENVIRONMENT}"
echo "📦 Version: ${VERSION}"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if required files exist
if [[ ! -f ".env.${ENVIRONMENT}" ]]; then
    echo "❌ Environment file .env.${ENVIRONMENT} not found"
    exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "❌ Docker compose file ${COMPOSE_FILE} not found"
    exit 1
fi

# Check if services are healthy
echo "🏥 Checking service health..."
if docker-compose -f ${COMPOSE_FILE} ps | grep -q "Up"; then
    echo "✅ Existing services are running"
fi

# Backup current database
echo "💾 Creating database backup..."
docker-compose -f ${COMPOSE_FILE} exec -T postgres pg_dump \
    -U messapp_user messapp > "backups/backup_$(date +%Y%m%d_%H%M%S).sql"

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f ${COMPOSE_FILE} pull

# Stop services gracefully
echo "⏹️ Stopping services..."
docker-compose -f ${COMPOSE_FILE} down --remove-orphans

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f ${COMPOSE_FILE} run --rm app yarn migration:run

# Start services
echo "▶️ Starting services..."
docker-compose -f ${COMPOSE_FILE} up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
for i in {1..30}; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo "✅ Services are healthy!"
        break
    fi
    
    if [[ $i -eq 30 ]]; then
        echo "❌ Services failed to start within timeout"
        exit 1
    fi
    
    echo "Waiting... ($i/30)"
    sleep 10
done

# Run smoke tests
echo "🧪 Running smoke tests..."
./scripts/smoke-tests.sh

echo "🎉 Deployment completed successfully!"
echo "🔗 Application is available at: https://your-domain.com"
```

### Database Migration Commands

```bash
# Run pending migrations
yarn migration:run

# Revert last migration
yarn migration:revert

# Generate new migration
yarn migration:generate -- -n MigrationName

# Show migration status
yarn migration:show

# Create empty migration
yarn migration:create -- -n MigrationName
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly typeormHealthIndicator: TypeOrmHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthCheckService.check([
      () => this.typeormHealthIndicator.pingCheck('database'),
      () => this.redisHealthIndicator.checkHealth('redis'),
      () => this.checkExternalServices()
    ]);
  }

  @Get('detailed')
  async detailedCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemoryUsage(),
      this.checkActiveSubscriptions()
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded',
      checks: checks.map((check, index) => ({
        name: ['database', 'redis', 'disk', 'memory', 'subscriptions'][index],
        status: check.status,
        details: check.status === 'fulfilled' ? check.value : check.reason
      }))
    };
  }

  private async checkActiveSubscriptions(): Promise<any> {
    // Check if subscription system is working
    const count = await this.monthlySubscriptionService.getActiveSubscriptionCount();
    return {
      activeSubscriptions: count,
      status: 'healthy'
    };
  }
}
```

### Monitoring Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  # Prometheus
  prometheus:
    image: prom/prometheus
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - messapp_network

  # Grafana
  grafana:
    image: grafana/grafana
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - messapp_network

  # Node Exporter
  node-exporter:
    image: prom/node-exporter
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - messapp_network

volumes:
  prometheus_data:
  grafana_data:
```

## 🔒 Security Configuration

### SSL/TLS Setup

```bash
#!/bin/bash
# setup-ssl.sh

# Generate self-signed certificates (for development)
generate_dev_certs() {
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=AE/ST=Dubai/L=Dubai/O=MessApp/CN=localhost"
}

# Setup Let's Encrypt certificates (for production)
setup_letsencrypt() {
    local domain=$1
    
    # Install certbot
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    
    # Stop nginx temporarily
    docker-compose stop nginx
    
    # Generate certificate
    certbot certonly --standalone -d $domain --email admin@$domain --agree-tos --non-interactive
    
    # Copy certificates to nginx ssl directory
    mkdir -p ssl
    cp /etc/letsencrypt/live/$domain/fullchain.pem ssl/cert.pem
    cp /etc/letsencrypt/live/$domain/privkey.pem ssl/key.pem
    
    # Setup auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    
    # Restart nginx
    docker-compose start nginx
}

# Usage
if [[ $1 == "dev" ]]; then
    generate_dev_certs
elif [[ $1 == "prod" ]]; then
    setup_letsencrypt $2
else
    echo "Usage: $0 [dev|prod] [domain]"
    exit 1
fi
```

### Security Hardening

```bash
#!/bin/bash
# harden-security.sh

echo "🔒 Applying security hardening..."

# Update system packages
apt-get update && apt-get upgrade -y

# Install fail2ban for intrusion prevention
apt-get install -y fail2ban

# Configure fail2ban for nginx
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

# Setup UFW firewall
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# Secure shared memory
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab

# Set proper file permissions
chmod 600 .env.*
chmod 600 ssl/*.pem

echo "✅ Security hardening completed"
```

## 🧪 Testing Deployment

### Smoke Tests

```bash
#!/bin/bash
# smoke-tests.sh

BASE_URL="https://your-domain.com"
API_URL="${BASE_URL}/v1"

echo "🧪 Running smoke tests..."

# Test 1: Health check
echo "Testing health endpoint..."
if curl -f "${BASE_URL}/health" > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test 2: API endpoints
echo "Testing API endpoints..."
if curl -f "${API_URL}/subscriptions/monthly/vendors/available?latitude=25.2048&longitude=55.2708&mealType=LUNCH" > /dev/null 2>&1; then
    echo "✅ API endpoints accessible"
else
    echo "❌ API endpoints failed"
    exit 1
fi

# Test 3: Database connectivity
echo "Testing database connectivity..."
if docker-compose exec -T postgres pg_isready -U messapp_user > /dev/null 2>&1; then
    echo "✅ Database connectivity passed"
else
    echo "❌ Database connectivity failed"
    exit 1
fi

# Test 4: Redis connectivity
echo "Testing Redis connectivity..."
if docker-compose exec -T redis redis-cli -a ${REDIS_PASSWORD} ping > /dev/null 2>&1; then
    echo "✅ Redis connectivity passed"
else
    echo "❌ Redis connectivity failed"
    exit 1
fi

echo "🎉 All smoke tests passed!"
```

### Load Testing

```javascript
// load-test.js (using k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Steady state
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function() {
  // Test vendor search endpoint
  let response = http.get(`${__ENV.BASE_URL}/v1/subscriptions/monthly/vendors/available`, {
    params: {
      latitude: '25.2048',
      longitude: '55.2708',
      mealType: 'LUNCH',
      radius: '15'
    }
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has vendors': (r) => JSON.parse(r.body).vendors.length > 0,
  });

  sleep(1);
}
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates in place
- [ ] Database backup completed
- [ ] Dependencies updated
- [ ] Security configurations applied
- [ ] Load balancer configured

### Deployment
- [ ] Application built successfully
- [ ] Database migrations executed
- [ ] Services started without errors
- [ ] Health checks passing
- [ ] Smoke tests completed
- [ ] Load balancer traffic routing

### Post-Deployment
- [ ] Monitoring dashboards updated
- [ ] Log aggregation working
- [ ] SSL certificate validation
- [ ] Performance metrics baseline
- [ ] Backup schedule verified
- [ ] Documentation updated

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec postgres pg_isready -U messapp_user
   
   # Access database directly
   docker-compose exec postgres psql -U messapp_user -d messapp
   ```

2. **Application Startup Issues**
   ```bash
   # Check application logs
   docker-compose logs app
   
   # Restart application
   docker-compose restart app
   
   # Check resource usage
   docker stats
   ```

3. **nginx Configuration Issues**
   ```bash
   # Test nginx configuration
   docker-compose exec nginx nginx -t
   
   # Reload nginx configuration
   docker-compose exec nginx nginx -s reload
   
   # Check nginx logs
   docker-compose logs nginx
   ```

### Performance Optimization

```bash
# Database performance tuning
docker-compose exec postgres psql -U messapp_user -d messapp << EOF
-- Enable query performance insights
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Optimize common queries
ANALYZE;

-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
EOF

# Application performance monitoring
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Monitor disk usage
df -h
```

---

**Deployment Guide Version**: 2.0.0  
**Last Updated**: 2025-08-28  
**Next Review**: 2025-09-28  
**Maintained By**: DevOps & Infrastructure Team

*This guide is updated with each infrastructure change and reviewed monthly for security and performance optimizations.*