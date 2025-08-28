# Monthly Subscription System - Troubleshooting Guide

This guide provides solutions for common issues encountered when working with the Monthly Subscription system, including debugging steps, error resolution, and performance optimization.

## 🚨 Common Issues & Solutions

### 1. Subscription Creation Issues

#### Issue: "Maximum 4 vendors allowed per subscription"
**Symptoms:**
- HTTP 400 error when creating subscription
- Error code: `MAX_VENDORS_EXCEEDED`

**Root Causes:**
- Client sending more than 4 vendor IDs
- Duplicate vendor IDs in request array

**Solutions:**
```javascript
// ✅ Correct - Validate vendor count on client side
const validateVendorSelection = (vendorIds) => {
  const uniqueVendors = [...new Set(vendorIds)]; // Remove duplicates
  if (uniqueVendors.length > 4) {
    throw new Error('Maximum 4 vendors allowed per subscription');
  }
  return uniqueVendors;
};

// ✅ Correct - Server-side validation
if (vendorIds.length > 4) {
  throw new BadRequestException('Maximum 4 vendors allowed per subscription');
}
```

**Prevention:**
- Implement client-side validation before API calls
- Use UI constraints to prevent selection of more than 4 vendors
- Add unit tests for vendor validation logic

---

#### Issue: "Payment processing failed"
**Symptoms:**
- HTTP 402 error during subscription creation
- Transaction appears in pending state

**Debugging Steps:**
1. Check payment method validity:
```bash
# Check payment method exists and is active
docker-compose exec postgres psql -U messapp_user -d messapp -c "
SELECT id, type, is_active, expires_at 
FROM payment_methods 
WHERE id = 'payment-method-uuid' AND user_id = 'user-uuid';"
```

2. Verify payment gateway connectivity:
```bash
# Test payment gateway API
curl -X POST https://payment-gateway.com/api/test \
  -H "Authorization: Bearer ${PAYMENT_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

3. Check transaction logs:
```sql
-- View recent payment attempts
SELECT pt.*, pm.type as payment_type, ms.total_amount
FROM payment_transactions pt
JOIN payment_methods pm ON pt.payment_method_id = pm.id  
JOIN monthly_subscriptions ms ON pt.subscription_id = ms.id
WHERE pt.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY pt.created_at DESC;
```

**Common Solutions:**
- **Expired Payment Method**: Update payment method
- **Insufficient Funds**: Ask user to verify account balance
- **Gateway Timeout**: Implement retry mechanism with exponential backoff
- **Invalid Currency**: Ensure AED currency is properly configured

---

### 2. Vendor Search Issues

#### Issue: "No vendors available in your area"
**Symptoms:**
- Empty vendor list returned
- Valid location coordinates provided

**Debugging Steps:**
1. Verify PostGIS spatial queries:
```sql
-- Test spatial query directly
SELECT 
  v.id, 
  v.name,
  ST_Distance(
    v.location::geography,
    ST_GeogFromText('POINT(55.2708 25.2048)')
  ) / 1000 as distance_km
FROM vendors v
WHERE ST_DWithin(
  v.location::geography,
  ST_GeogFromText('POINT(55.2708 25.2048)'),
  15000  -- 15km in meters
)
AND v.subscription_enabled = true
ORDER BY distance_km;
```

2. Check vendor configuration:
```sql
-- Verify vendor settings
SELECT 
  id, 
  name, 
  subscription_enabled, 
  is_active,
  ST_X(location) as longitude,
  ST_Y(location) as latitude
FROM vendors 
WHERE subscription_enabled = true 
AND is_active = true;
```

**Common Causes & Solutions:**
- **No vendors in radius**: Increase search radius or add more vendors
- **PostGIS extension missing**: Install PostGIS extension
- **Invalid coordinates**: Validate latitude/longitude format
- **Vendors not subscription-enabled**: Update vendor settings

---

#### Issue: "Spatial query performance is slow"
**Symptoms:**
- Vendor search taking >2 seconds
- High database CPU usage

**Performance Optimization:**
1. **Add spatial indexes**:
```sql
-- Create spatial index if missing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_location_subscription 
ON vendors USING GIST (location) 
WHERE subscription_enabled = true;

-- Update table statistics
ANALYZE vendors;
```

2. **Optimize query**:
```sql
-- Use proper spatial functions
-- ❌ Slow - Don't use ST_Distance in WHERE clause
SELECT * FROM vendors 
WHERE ST_Distance(location::geography, ST_GeogFromText('POINT(55.27 25.20)')) < 15000;

-- ✅ Fast - Use ST_DWithin for distance filtering
SELECT *, ST_Distance(location::geography, ST_GeogFromText('POINT(55.27 25.20)')) / 1000 as distance
FROM vendors 
WHERE ST_DWithin(location::geography, ST_GeogFromText('POINT(55.27 25.20)'), 15000)
ORDER BY distance;
```

3. **Implement caching**:
```typescript
// Redis caching for vendor searches
const cacheKey = `vendors:${lat}:${lng}:${mealType}:${radius}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const vendors = await this.findVendorsQuery();
await redis.setex(cacheKey, 300, JSON.stringify(vendors)); // 5 min cache
return vendors;
```

---

### 3. Database Connection Issues

#### Issue: "Connection to database failed"
**Symptoms:**
- Application fails to start
- Error: `ECONNREFUSED` or `Connection terminated`

**Debugging Steps:**
1. **Check database status**:
```bash
# Check if PostgreSQL container is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test direct connection
docker-compose exec postgres pg_isready -U messapp_user
```

2. **Verify connection parameters**:
```bash
# Check environment variables
echo $DB_HOST $DB_PORT $DB_USERNAME $DB_DATABASE

# Test connection string
docker-compose exec app node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});
client.connect().then(() => console.log('Connected')).catch(console.error);
"
```

**Common Solutions:**
- **Database not started**: `docker-compose up postgres`
- **Wrong credentials**: Check `.env` file configuration
- **Network issues**: Verify Docker network connectivity
- **Connection pool exhausted**: Increase pool size in TypeORM config

---

#### Issue: "Database migration failed"
**Symptoms:**
- Migrations don't run on startup
- Schema version mismatch errors

**Debugging Steps:**
1. **Check migration status**:
```bash
# View migration history
docker-compose exec app yarn migration:show

# Check migrations table
docker-compose exec postgres psql -U messapp_user -d messapp -c "
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;"
```

2. **Run migrations manually**:
```bash
# Run specific migration
docker-compose exec app yarn migration:run

# Revert last migration if needed
docker-compose exec app yarn migration:revert
```

**Common Solutions:**
- **Permission issues**: Ensure database user has CREATE privileges
- **Conflicting changes**: Resolve schema conflicts manually
- **Missing dependencies**: Install required extensions (PostGIS, uuid-ossp)

---

### 4. Authentication & Authorization Issues

#### Issue: "JWT token expired or invalid"
**Symptoms:**
- HTTP 401 Unauthorized errors
- Token validation failures

**Debugging Steps:**
1. **Decode JWT token**:
```javascript
// Decode token to check expiration
const jwt = require('jsonwebtoken');
const decoded = jwt.decode(token);
console.log('Token expires at:', new Date(decoded.exp * 1000));
console.log('Current time:', new Date());
```

2. **Check token format**:
```bash
# Verify token structure
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 -d
```

**Solutions:**
- **Expired token**: Implement token refresh mechanism
- **Invalid signature**: Verify JWT_SECRET matches between services
- **Wrong format**: Ensure `Bearer ` prefix in Authorization header

---

#### Issue: "User cannot access own subscription data"
**Symptoms:**
- HTTP 403 Forbidden when accessing user's subscriptions
- Row Level Security blocking access

**Debugging Steps:**
1. **Check RLS policies**:
```sql
-- View RLS policies
SELECT * FROM pg_policies WHERE tablename = 'monthly_subscriptions';

-- Test policy directly
SET app.current_user_id = 'user-uuid';
SELECT * FROM monthly_subscriptions WHERE user_id = 'user-uuid';
```

2. **Verify user context**:
```sql
-- Check if user context is set
SHOW app.current_user_id;
```

**Solutions:**
- **Missing user context**: Ensure `app.current_user_id` is set in request middleware
- **Incorrect policy**: Update RLS policy to allow user access to own data
- **Admin override**: Use admin role for system operations

---

### 5. Performance Issues

#### Issue: "API responses are slow (>2 seconds)"
**Symptoms:**
- High response times
- Database query timeouts

**Performance Analysis:**
1. **Identify slow queries**:
```sql
-- Enable query logging (if not already enabled)
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries >1s
SELECT pg_reload_conf();

-- View slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
WHERE mean_time > 1000  -- Queries taking >1s on average
ORDER BY mean_time DESC 
LIMIT 10;
```

2. **Check index usage**:
```sql
-- Find unused indexes
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_tup_read, 
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0;

-- Find tables with sequential scans
SELECT 
  schemaname, 
  tablename, 
  seq_scan, 
  seq_tup_read, 
  idx_scan, 
  idx_tup_fetch
FROM pg_stat_user_tables 
WHERE seq_scan > idx_scan 
AND seq_tup_read > 0;
```

**Optimization Strategies:**
- **Add missing indexes**: Create indexes for frequently queried columns
- **Optimize N+1 queries**: Use TypeORM relations with eager loading
- **Implement caching**: Redis cache for frequently accessed data
- **Connection pooling**: Optimize database connection pool size

---

### 6. Geolocation & Spatial Issues

#### Issue: "Distance calculations are incorrect"
**Symptoms:**
- Vendors showing wrong distances
- Spatial queries returning unexpected results

**Debugging Steps:**
1. **Verify coordinate format**:
```sql
-- Check coordinate format (longitude, latitude)
SELECT 
  id, 
  name,
  ST_X(location) as longitude,  -- Should be ~55.27 for Dubai
  ST_Y(location) as latitude    -- Should be ~25.20 for Dubai
FROM vendors 
LIMIT 5;
```

2. **Test distance calculation**:
```sql
-- Manual distance test
SELECT ST_Distance(
  ST_GeogFromText('POINT(55.2708 25.2048)'),  -- Dubai coordinates
  ST_GeogFromText('POINT(55.1562 25.0657)')   -- Another Dubai location
) / 1000 as distance_km;  -- Should be ~15km
```

**Common Issues & Fixes:**
- **Swapped coordinates**: Ensure format is POINT(longitude latitude)
- **Wrong SRID**: Use SRID 4326 for GPS coordinates
- **Projection errors**: Use geography type for distance calculations

---

### 7. Redis Cache Issues

#### Issue: "Cache not working or returning stale data"
**Symptoms:**
- Performance not improving with cache
- Old data being returned

**Debugging Steps:**
1. **Check Redis connectivity**:
```bash
# Test Redis connection
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping

# Check cache keys
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} keys "*vendors*"
```

2. **Monitor cache hit/miss ratio**:
```bash
# Redis stats
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} info stats
```

**Solutions:**
- **Connection issues**: Verify Redis host/port configuration
- **Memory limits**: Increase Redis memory limit
- **TTL issues**: Set appropriate expiration times
- **Key conflicts**: Use consistent cache key naming

---

## 🛠️ Debugging Tools & Commands

### Application Logs
```bash
# View application logs
docker-compose logs -f app

# Filter for errors only
docker-compose logs app | grep ERROR

# View specific service logs
docker-compose logs -f postgres redis nginx
```

### Database Debugging
```bash
# Interactive database session
docker-compose exec postgres psql -U messapp_user -d messapp

# Export database schema
docker-compose exec postgres pg_dump -U messapp_user -s messapp > schema.sql

# Database performance monitoring
docker-compose exec postgres psql -U messapp_user -d messapp -c "
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
```

### API Testing
```bash
# Test API endpoints
curl -X GET "http://localhost:3000/health" -H "accept: application/json"

# Test with authentication
curl -X GET "http://localhost:3000/v1/subscriptions/monthly/user" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

# Test vendor search
curl -X GET "http://localhost:3000/v1/subscriptions/monthly/vendors/available?latitude=25.2048&longitude=55.2708&mealType=LUNCH" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Performance Monitoring
```bash
# Monitor Docker container resources
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Monitor disk usage
df -h

# Monitor network connections
netstat -tuln | grep :3000
```

---

## 📋 Troubleshooting Checklist

### Before Reporting Issues
- [ ] Check application logs for error messages
- [ ] Verify environment variables are correctly set
- [ ] Test database connectivity
- [ ] Confirm Redis cache is working
- [ ] Check API endpoint accessibility
- [ ] Verify JWT token is valid and not expired
- [ ] Test with different user accounts
- [ ] Review recent code changes
- [ ] Check system resource usage
- [ ] Validate input data format

### When Reporting Bugs
Include the following information:
1. **Environment**: Development/Staging/Production
2. **Error Message**: Complete error text and stack trace
3. **Steps to Reproduce**: Detailed reproduction steps
4. **Expected Behavior**: What should have happened
5. **System Info**: OS, Docker versions, browser (if applicable)
6. **Logs**: Relevant application and database logs
7. **User Context**: User ID, session details (if relevant)

---

## 🆘 Emergency Procedures

### System Down - Critical Issues

1. **Check service status**:
```bash
docker-compose ps
curl -f http://localhost/health
```

2. **Rollback deployment** (if recent deployment):
```bash
# Stop current version
docker-compose down

# Restore from backup
./scripts/restore-backup.sh backup_20240828_100000.sql

# Start previous version
docker-compose -f docker-compose.stable.yml up -d
```

3. **Database recovery**:
```bash
# If database is corrupted
docker-compose stop app
docker-compose exec postgres pg_dump messapp > emergency_backup.sql
# Restore from latest backup
./scripts/restore-database.sh latest_backup.sql
docker-compose start app
```

### Data Loss Prevention
- Regular automated backups (every 6 hours)
- Point-in-time recovery capability
- Database replication for high availability
- Transaction log shipping

### Escalation Path
1. **Level 1**: Development team (response: <2 hours)
2. **Level 2**: Senior engineers (response: <30 minutes)
3. **Level 3**: Infrastructure team (response: <15 minutes)

---

**Troubleshooting Guide Version**: 1.2.0  
**Last Updated**: 2025-08-28  
**Next Review**: 2025-09-28  
**Maintained By**: Development & DevOps Teams

*This guide is updated with each system release and enhanced based on support team feedback and user-reported issues.*