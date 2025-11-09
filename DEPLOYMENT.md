# Deployment Instructions

This document provides comprehensive instructions for deploying the Mess App Backend to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [Initial Deployment](#initial-deployment)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Deployment Process](#deployment-process)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### Local Requirements

- Docker installed and running
- Azure CLI installed and configured
- SSH access to production server
- Git repository access

### Azure Resources

- Azure Container Registry (ACR): `messappregistry.azurecr.io`
- Azure VM: `messapp` (SSH configured)
- ACR credentials configured

### Domain Configuration

The application serves multiple domains:

**Habllen.com domains:**
- `backend.habllen.com` - Backend API
- `vendor.habllen.com` - Vendor Dashboard

**Switeaz.com domains:**
- `switeaz.com` - Redirects to vendor dashboard
- `backend.switeaz.com` - Backend API
- `vendor.switeaz.com` - Vendor Dashboard

All domains should point to the server IP: `20.89.120.185`

## Server Setup

### Directory Structure

```
~/mess_app_backend/
├── docker-compose.yml
├── nginx.conf
├── .env.production
├── certbot/
│   ├── conf/          # SSL certificates
│   └── www/           # ACME challenges
└── uploads/           # User uploads
```

### Required Files on Server

1. **docker-compose.yml** - Docker services configuration
2. **nginx.conf** - Nginx reverse proxy configuration
3. **.env.production** - Production environment variables

## Initial Deployment

### 1. Clone Repository on Server

```bash
ssh messapp
cd ~
git clone https://github.com/ismailfarisi/mess_app_backend.git
cd mess_app_backend
```

### 2. Create Environment File

Create `.env.production` with the following variables:

```bash
# Node Environment
NODE_ENV=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=mess_app_user
DB_PASSWORD=your_secure_password_here
DB_NAME=mess_app_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRATION=24h

# Application
PORT=3000
```

### 3. Setup Docker Compose

The `docker-compose.yml` includes:
- PostgreSQL with PostGIS
- NestJS Backend (from ACR)
- Next.js Vendor Dashboard (from ACR)
- Nginx reverse proxy

### 4. Login to Azure Container Registry

```bash
az acr login --name messappregistry
```

Or use service principal:

```bash
docker login messappregistry.azurecr.io \
  --username <service-principal-id> \
  --password <service-principal-password>
```

## SSL Certificate Setup

### Obtain Certificates

Certificates are obtained using Let's Encrypt via Certbot.

#### 1. Stop Nginx (first time only)

```bash
cd ~/mess_app_backend
docker compose stop nginx
```

#### 2. Obtain Certificates

**For backend.habllen.com:**
```bash
docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d backend.habllen.com
```

**For backend.switeaz.com:**
```bash
docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d backend.switeaz.com
```

**For vendor.switeaz.com:**
```bash
docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d vendor.switeaz.com
```

**For switeaz.com:**
```bash
docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d switeaz.com
```

#### 3. Start Services

```bash
docker compose --env-file .env.production up -d
```

### Certificate Locations

Certificates are stored in:
```
~/mess_app_backend/certbot/conf/live/
├── backend.habllen.com/
│   ├── fullchain.pem
│   └── privkey.pem
├── backend.switeaz.com/
│   ├── fullchain.pem
│   └── privkey.pem
├── vendor.switeaz.com/
│   ├── fullchain.pem
│   └── privkey.pem
└── switeaz.com/
    ├── fullchain.pem
    └── privkey.pem
```

### Certificate Renewal

Certificates auto-renew via Certbot. They expire after 90 days.

To manually renew:
```bash
docker compose stop nginx
docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot renew
docker compose --env-file .env.production up -d nginx
```

## Deployment Process

### Standard Deployment Workflow

#### 1. Build Docker Image Locally

```bash
# On local machine
cd c:\Users\ismai\mess_app_backend
docker build -t mess-app-backend:latest .
```

#### 2. Tag for ACR

```bash
docker tag mess-app-backend:latest messappregistry.azurecr.io/mess-app-backend:latest
```

#### 3. Login to ACR

```bash
az acr login --name messappregistry
```

#### 4. Push to ACR

```bash
docker push messappregistry.azurecr.io/mess-app-backend:latest
```

#### 5. Deploy to Server

```bash
ssh messapp "cd ~/mess_app_backend && docker compose --env-file .env.production pull app && docker compose --env-file .env.production up -d app"
```

### Quick Deployment Script

Create a local script `deploy.sh`:

```bash
#!/bin/bash

echo "=== Building Docker image ==="
docker build -t mess-app-backend:latest .

echo "=== Tagging for ACR ==="
docker tag mess-app-backend:latest messappregistry.azurecr.io/mess-app-backend:latest

echo "=== Logging into ACR ==="
az acr login --name messappregistry

echo "=== Pushing to ACR ==="
docker push messappregistry.azurecr.io/mess-app-backend:latest

echo "=== Deploying to production ==="
ssh messapp "cd ~/mess_app_backend && docker compose --env-file .env.production pull app && docker compose --env-file .env.production up -d app"

echo "=== Deployment complete! ==="
```

Make executable:
```bash
chmod +x deploy.sh
```

### Deploying Frontend (Vendor Dashboard)

```bash
ssh messapp "cd ~/mess_app_backend && docker compose --env-file .env.production pull vendor_dashboard && docker compose --env-file .env.production up -d vendor_dashboard"
```

## Environment Configuration

### Production Environment Variables

The `.env.production` file contains:

```bash
# IMPORTANT: Set NODE_ENV to production
NODE_ENV=production

# Database (PostgreSQL with PostGIS)
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=mess_app_user
DB_PASSWORD=<secure-password>
DB_NAME=mess_app_db

# JWT Authentication
JWT_SECRET=<secure-secret-key>
JWT_EXPIRATION=24h

# Application
PORT=3000
```

### CORS Configuration

CORS is configured in `src/app.config.ts`:

```typescript
production: {
  origin: [
    'https://vendor.habllen.com',
    'https://habllen.com',
    'https://www.habllen.com',
    'https://switeaz.com',
    'https://www.switeaz.com',
    'https://vendor.switeaz.com',
  ],
  credentials: true,
}
```

## Troubleshooting

### Check Container Status

```bash
ssh messapp
cd ~/mess_app_backend
docker compose ps
```

### View Logs

**Backend logs:**
```bash
docker logs mess_app_backend --tail 50 -f
```

**Nginx logs:**
```bash
docker logs mess_app_nginx --tail 50 -f
```

**Database logs:**
```bash
docker logs mess_app_postgres --tail 50 -f
```

**Frontend logs:**
```bash
docker logs mess_app_vendor_dashboard --tail 50 -f
```

### Common Issues

#### 1. Database Connection Error

**Symptoms:** Backend logs show `password authentication failed`

**Solution:**
```bash
# Restart with env file
cd ~/mess_app_backend
docker compose --env-file .env.production down
docker compose --env-file .env.production up -d
```

#### 2. 502 Bad Gateway

**Symptoms:** Nginx returns 502 error

**Causes:**
- Backend container not running
- Backend not fully started yet

**Solution:**
```bash
# Check backend status
docker logs mess_app_backend --tail 20

# Restart backend
docker compose --env-file .env.production restart app
```

#### 3. CORS Errors

**Symptoms:** Frontend shows CORS policy errors

**Causes:**
- NODE_ENV not set to production
- Domain not in CORS whitelist

**Solution:**
1. Verify NODE_ENV:
```bash
docker exec mess_app_backend env | grep NODE_ENV
```

2. Check CORS config in deployed app:
```bash
docker exec mess_app_backend cat dist/app.config.js
```

3. Rebuild and redeploy if config changed

#### 4. SSL Certificate Issues

**Symptoms:** SSL certificate errors or expired certificates

**Solution:**
```bash
# Check certificate expiry
echo | openssl s_client -servername backend.switeaz.com -connect backend.switeaz.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew certificates
cd ~/mess_app_backend
docker compose stop nginx
docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot renew
docker compose --env-file .env.production up -d nginx
```

### Restart All Services

```bash
cd ~/mess_app_backend
docker compose --env-file .env.production down
docker compose --env-file .env.production up -d
```

### Complete System Reset

**WARNING:** This will delete all data!

```bash
cd ~/mess_app_backend
docker compose down -v
docker compose --env-file .env.production up -d
```

## Maintenance

### Backup Database

```bash
docker exec mess_app_postgres pg_dump -U mess_app_user mess_app_db > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
cat backup_20251109.sql | docker exec -i mess_app_postgres psql -U mess_app_user -d mess_app_db
```

### Update Nginx Configuration

1. Update `nginx.conf` locally
2. Upload to server:
```bash
scp nginx.conf messapp:~/mess_app_backend/nginx.conf
```
3. Restart nginx:
```bash
ssh messapp "cd ~/mess_app_backend && docker compose restart nginx"
```

### Monitor Resources

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Clean up unused images
docker image prune -a
```

## Service URLs

### Production Endpoints

**Backend APIs:**
- https://backend.habllen.com
- https://backend.switeaz.com

**Vendor Dashboards:**
- https://vendor.habllen.com
- https://vendor.switeaz.com

**Landing Page:**
- https://switeaz.com (redirects to vendor.switeaz.com)

### Health Checks

```bash
# Backend health
curl https://backend.switeaz.com/health

# Check CORS
curl -I "https://backend.switeaz.com/vendors/search?latitude=25.2048&longitude=55.2708" \
  -H "Origin: https://vendor.switeaz.com"
```

## Security Notes

1. **SSL Certificates:** Auto-renew every 90 days
2. **Database Password:** Stored in `.env.production`
3. **JWT Secret:** Stored in `.env.production`
4. **ACR Credentials:** Use Azure CLI or service principal
5. **SSH Access:** Key-based authentication recommended

## Support

For issues or questions:
- Check logs first: `docker logs <container-name>`
- Review this documentation
- Check nginx configuration
- Verify environment variables

## Version History

- **2025-11-09:** Initial deployment with SSL for all domains
- SSL certificates obtained for all domains
- CORS configured for multi-domain support
- Docker deployment via ACR established
