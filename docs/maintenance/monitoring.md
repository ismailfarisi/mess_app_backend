# Monthly Subscription System - Maintenance & Monitoring Guide

This document provides comprehensive guidelines for maintaining, monitoring, and optimizing the Monthly Subscription system to ensure reliable operation and optimal performance.

## 📊 System Monitoring

### Key Performance Indicators (KPIs)

#### Business Metrics
- **Monthly Recurring Revenue (MRR)**: Total subscription revenue per month
- **Active Subscriptions**: Number of currently active subscriptions
- **Churn Rate**: Percentage of subscriptions cancelled monthly
- **Customer Acquisition Cost (CAC)**: Cost to acquire new subscribers
- **Customer Lifetime Value (LTV)**: Average revenue per customer

#### Technical Metrics
- **API Response Time**: Average response time for subscription endpoints
- **Database Query Performance**: Query execution times and connection usage
- **System Uptime**: Service availability percentage
- **Error Rate**: Percentage of failed API requests
- **Cache Hit Rate**: Redis cache effectiveness

### Monitoring Infrastructure

#### Prometheus Metrics Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "subscription_alerts.yml"

scrape_configs:
  - job_name: 'nestjs-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Application Metrics

```typescript
// metrics/subscription.metrics.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class SubscriptionMetrics {
  private readonly subscriptionCreated = new Counter({
    name: 'subscription_created_total',
    help: 'Total number of subscriptions created',
    labelNames: ['meal_type', 'vendor_count']
  });

  private readonly subscriptionDuration = new Histogram({
    name: 'subscription_creation_duration_seconds',
    help: 'Time taken to create a subscription',
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  });

  private readonly activeSubscriptions = new Gauge({
    name: 'active_subscriptions_total',
    help: 'Current number of active subscriptions'
  });

  private readonly vendorSearchDuration = new Histogram({
    name: 'vendor_search_duration_seconds',
    help: 'Time taken to search for vendors',
    buckets: [0.1, 0.3, 0.5, 1, 2]
  });

  private readonly databaseConnections = new Gauge({
    name: 'database_connections_active',
    help: 'Active database connections'
  });

  recordSubscriptionCreated(mealType: string, vendorCount: number): void {
    this.subscriptionCreated.inc({ meal_type: mealType, vendor_count: vendorCount });
  }

  recordSubscriptionDuration(duration: number): void {
    this.subscriptionDuration.observe(duration);
  }

  updateActiveSubscriptions(count: number): void {
    this.activeSubscriptions.set(count);
  }

  recordVendorSearchDuration(duration: number): void {
    this.vendorSearchDuration.observe(duration);
  }

  updateDatabaseConnections(count: number): void {
    this.databaseConnections.set(count);
  }
}
```

#### Custom Health Checks

```typescript
// health/subscription.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class SubscriptionHealthIndicator extends HealthIndicator {
  constructor(
    private readonly subscriptionService: MonthlySubscriptionService,
    private readonly metricsService: SubscriptionMetrics
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test critical subscription operations
      const activeCount = await this.subscriptionService.getActiveSubscriptionCount();
      const avgResponseTime = await this.getAverageResponseTime();
      
      const isHealthy = activeCount >= 0 && avgResponseTime < 2000; // 2 seconds max

      const result = this.getStatus(key, isHealthy, {
        activeSubscriptions: activeCount,
        averageResponseTime: avgResponseTime,
        status: isHealthy ? 'healthy' : 'degraded'
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Subscription service degraded', result);
    } catch (error) {
      throw new HealthCheckError('Subscription service unavailable', {
        [key]: {
          status: 'down',
          error: error.message
        }
      });
    }
  }

  private async getAverageResponseTime(): Promise<number> {
    // Calculate from metrics or recent requests
    return 500; // Implementation depends on metrics collection
  }
}
```

### Database Monitoring

#### Performance Queries

```sql
-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_tup_read::float / GREATEST(idx_tup_fetch, 1) as selectivity
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- Monitor connection usage
SELECT 
  state,
  count(*) as connection_count
FROM pg_stat_activity 
WHERE datname = 'messapp'
GROUP BY state;
```

#### Automated Database Maintenance

```sql
-- Maintenance script (run daily)
DO $$
DECLARE
  table_name TEXT;
  vacuum_query TEXT;
BEGIN
  -- Update table statistics
  ANALYZE;
  
  -- Vacuum tables with high update/delete activity
  FOR table_name IN 
    SELECT tablename FROM pg_stat_user_tables 
    WHERE n_tup_upd + n_tup_del > 1000
  LOOP
    vacuum_query := 'VACUUM (ANALYZE) ' || table_name;
    EXECUTE vacuum_query;
    RAISE NOTICE 'Vacuumed table: %', table_name;
  END LOOP;
  
  -- Reindex if fragmentation is high
  REINDEX INDEX CONCURRENTLY IF EXISTS idx_monthly_subscriptions_user_id;
  REINDEX INDEX CONCURRENTLY IF EXISTS idx_vendors_location_subscription;
END $$;
```

## 🚨 Alerting Rules

### Prometheus Alert Rules

```yaml
# subscription_alerts.yml
groups:
  - name: subscription-service
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for the last 5 minutes"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response time"
          description: "95th percentile response time is {{ $value }}s"

      - alert: DatabaseConnectionsHigh
        expr: database_connections_active > 15
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "{{ $value }} active database connections"

      - alert: ActiveSubscriptionsDropped
        expr: active_subscriptions_total < 100
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Active subscriptions dropped significantly"
          description: "Only {{ $value }} active subscriptions remain"

      - alert: CacheHitRateLow
        expr: redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) < 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}%"

      - alert: DiskSpaceHigh
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space usage high"
          description: "Disk usage is {{ $value }}%"
```

### Alert Manager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@messapp.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'devops@messapp.com'
        subject: 'Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

## 🔧 Routine Maintenance Tasks

### Daily Tasks (Automated)

1. **Database Backup**
```bash
#!/bin/bash
# daily-backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/daily"
mkdir -p $BACKUP_DIR

# Full database backup
docker-compose exec -T postgres pg_dump -U messapp_user messapp > "${BACKUP_DIR}/messapp_${DATE}.sql"

# Subscription data backup
docker-compose exec -T postgres pg_dump -U messapp_user messapp \
  -t monthly_subscriptions \
  -t monthly_subscription_vendors \
  --data-only --inserts > "${BACKUP_DIR}/subscriptions_${DATE}.sql"

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}/messapp_${DATE}.sql"
```

2. **Log Rotation**
```bash
#!/bin/bash
# rotate-logs.sh
docker-compose exec app find /app/logs -name "*.log" -mtime +7 -delete
docker system prune -f --volumes --filter "until=24h"
```

3. **Cache Cleanup**
```bash
#!/bin/bash
# cache-cleanup.sh
# Clean expired Redis keys
docker-compose exec redis redis-cli -a $REDIS_PASSWORD EVAL "
local keys = redis.call('keys', ARGV[1])
for i=1,#keys,5000 do
  redis.call('del', unpack(keys, i, math.min(i+4999, #keys)))
end
return #keys
" 0 "*expired*"
```

### Weekly Tasks

1. **Performance Review**
```sql
-- Weekly performance report
WITH subscription_stats AS (
  SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as new_subscriptions,
    AVG(total_amount) as avg_amount,
    COUNT(DISTINCT user_id) as unique_users
  FROM monthly_subscriptions
  WHERE created_at >= CURRENT_DATE - INTERVAL '4 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
),
vendor_stats AS (
  SELECT 
    v.name,
    COUNT(msv.id) as subscription_count,
    AVG(ms.total_amount) as avg_revenue
  FROM vendors v
  LEFT JOIN monthly_subscription_vendors msv ON v.id = msv.vendor_id
  LEFT JOIN monthly_subscriptions ms ON msv.monthly_subscription_id = ms.id
  WHERE ms.created_at >= CURRENT_DATE - INTERVAL '1 week'
  GROUP BY v.name
  ORDER BY subscription_count DESC
  LIMIT 10
)
SELECT * FROM subscription_stats
UNION ALL
SELECT * FROM vendor_stats;
```

2. **Index Analysis**
```sql
-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  seq_tup_read / seq_scan as avg_tuples_per_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0 
AND seq_tup_read / seq_scan > 1000  -- Tables with large scans
ORDER BY seq_tup_read DESC;
```

3. **Security Audit**
```bash
#!/bin/bash
# security-audit.sh

# Check for failed login attempts
docker-compose logs nginx | grep "401\|403" | tail -100

# Check for unusual API patterns
docker-compose logs app | grep "ERROR\|WARN" | tail -50

# Verify SSL certificate expiry
openssl x509 -in ssl/cert.pem -text -noout | grep "Not After"

# Check for outdated dependencies
docker-compose exec app npm audit --audit-level moderate
```

### Monthly Tasks

1. **Capacity Planning**
```sql
-- Monthly capacity analysis
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value
FROM monthly_subscriptions
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Database size growth
SELECT 
  pg_size_pretty(pg_database_size('messapp')) as current_size,
  pg_size_pretty(pg_database_size('messapp') - LAG(pg_database_size('messapp')) OVER (ORDER BY NOW())) as growth;
```

2. **Performance Optimization Review**
```bash
#!/bin/bash
# performance-review.sh

# Generate performance report
echo "=== Monthly Performance Review ===" > performance_report.txt
echo "Date: $(date)" >> performance_report.txt

# API Performance
echo "=== API Response Times ===" >> performance_report.txt
curl -s http://localhost:3000/metrics | grep http_request_duration >> performance_report.txt

# Database Performance
echo "=== Database Statistics ===" >> performance_report.txt
docker-compose exec -T postgres psql -U messapp_user -d messapp -c "
SELECT 'Active Connections: ' || count(*) FROM pg_stat_activity WHERE state = 'active';
SELECT 'Database Size: ' || pg_size_pretty(pg_database_size('messapp'));
" >> performance_report.txt

# System Resources
echo "=== System Resources ===" >> performance_report.txt
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" >> performance_report.txt
```

## 📈 Performance Optimization

### Database Optimization

1. **Query Optimization**
```sql
-- Optimize frequently used queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT v.*, ST_Distance(v.location::geography, ST_GeogFromText('POINT(55.27 25.20)')) / 1000 as distance
FROM vendors v
WHERE ST_DWithin(v.location::geography, ST_GeogFromText('POINT(55.27 25.20)'), 15000)
AND v.subscription_enabled = true
ORDER BY distance;

-- Add covering indexes for common queries
CREATE INDEX CONCURRENTLY idx_vendors_subscription_location 
ON vendors (subscription_enabled, is_active) 
INCLUDE (name, rating, average_price)
WHERE subscription_enabled = true;
```

2. **Connection Pool Tuning**
```typescript
// Optimize TypeORM connection settings
export const optimizedDatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  extra: {
    max: 20,                    // Maximum connections
    min: 5,                     // Minimum connections
    acquireTimeoutMillis: 30000, // Connection acquire timeout
    createTimeoutMillis: 30000,  // Connection create timeout
    destroyTimeoutMillis: 5000,  // Connection destroy timeout
    idleTimeoutMillis: 30000,   // Idle timeout
    reapIntervalMillis: 1000,   // Cleanup interval
    createRetryIntervalMillis: 200
  }
};
```

### Application Optimization

1. **Caching Strategy**
```typescript
// Implement multi-layer caching
@Injectable()
export class CacheService {
  private readonly l1Cache = new Map<string, any>(); // In-memory cache
  
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    // L1 cache (in-memory)
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // L2 cache (Redis)
    const cached = await this.redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      this.l1Cache.set(key, parsed); // Populate L1 cache
      return parsed;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    // Store in both caches
    this.l1Cache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear L1 cache
    for (const key of this.l1Cache.keys()) {
      if (key.includes(pattern)) {
        this.l1Cache.delete(key);
      }
    }

    // Clear L2 cache
    const keys = await this.redis.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

2. **API Rate Limiting**
```typescript
// Implement smart rate limiting
@Injectable()
export class SmartRateLimiter implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const endpoint = request.route.path;
    
    // Different limits for different user types
    const limits = {
      '/subscriptions/monthly': { premium: 20, standard: 10, guest: 5 },
      '/vendors/available': { premium: 100, standard: 60, guest: 30 }
    };

    const userType = await this.getUserType(userId);
    const limit = limits[endpoint]?.[userType] || 10;

    const key = `rate_limit:${userId || request.ip}:${endpoint}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    if (current > limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return next.handle();
  }
}
```

## 🔐 Security Maintenance

### Security Monitoring

1. **Log Analysis**
```bash
#!/bin/bash
# security-scan.sh

# Check for brute force attempts
echo "=== Potential Brute Force Attacks ===" 
docker-compose logs nginx | grep "401" | awk '{print $1}' | sort | uniq -c | sort -nr | head -10

# Check for SQL injection attempts  
echo "=== SQL Injection Attempts ==="
docker-compose logs app | grep -i "select\|union\|insert\|update\|delete" | head -20

# Check for unusual API usage patterns
echo "=== Unusual API Patterns ==="
docker-compose logs nginx | awk '{print $7}' | sort | uniq -c | sort -nr | head -20

# Failed authentication attempts
echo "=== Failed Authentication ==="
docker-compose logs app | grep "authentication failed\|invalid token" | tail -10
```

2. **Vulnerability Scanning**
```bash
#!/bin/bash
# vulnerability-scan.sh

# Check Node.js dependencies
docker-compose exec app npm audit --audit-level high

# Check Docker image vulnerabilities (if using tools like Trivy)
# trivy image messapp_backend:latest

# Check SSL configuration
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -text -noout | grep "Signature Algorithm"
```

### Security Updates

1. **Dependency Updates**
```bash
#!/bin/bash
# update-dependencies.sh

# Update npm packages
docker-compose exec app npm update

# Update Docker base images
docker-compose pull
docker-compose build --no-cache

# Update system packages in containers
docker-compose exec app apt-get update && apt-get upgrade -y
```

2. **Certificate Renewal**
```bash
#!/bin/bash
# renew-certificates.sh

# Renew Let's Encrypt certificates
certbot renew --quiet

# Copy renewed certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Reload nginx
docker-compose exec nginx nginx -s reload
```

## 📋 Maintenance Checklist

### Daily (Automated)
- [ ] Database backup completed
- [ ] Log files rotated
- [ ] Cache cleanup executed
- [ ] Health checks passing
- [ ] Alert notifications reviewed

### Weekly (Manual Review)
- [ ] Performance metrics reviewed
- [ ] Error logs analyzed
- [ ] Security scan completed
- [ ] Capacity utilization checked
- [ ] Backup integrity verified

### Monthly (Comprehensive Review)
- [ ] Performance optimization review
- [ ] Security vulnerability assessment
- [ ] Dependency updates applied
- [ ] Database maintenance performed
- [ ] Documentation updates completed
- [ ] Disaster recovery procedures tested

### Quarterly (Strategic Review)
- [ ] Architecture review and optimization
- [ ] Business metrics analysis
- [ ] Scalability planning
- [ ] Security architecture review
- [ ] Compliance audit
- [ ] Team training updates

---

**Maintenance Guide Version**: 1.3.0  
**Last Updated**: 2025-08-28  
**Next Review**: 2025-09-28  
**Maintained By**: DevOps & Platform Engineering Teams

*This guide is continuously updated based on operational experience and evolving best practices. All maintenance procedures are tested in staging environments before production deployment.*