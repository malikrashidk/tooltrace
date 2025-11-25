# SaaS Tools Hub - VPS Deployment Guide

## Prerequisites

- VPS with Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Minimum 2GB RAM, 20GB storage
- Domain name (optional but recommended)
- Stripe account for payments

## 1. Initial VPS Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## 2. Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/saas-tools-hub
cd /opt/saas-tools-hub

# Clone repository (or upload your code)
git clone <your-repo-url> .
```

## 3. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env

# Essential variables to update:
# - JWT_SECRET: Generate with: openssl rand -base64 32
# - STRIPE_PUBLIC_KEY & STRIPE_SECRET_KEY
# - DB_PASSWORD: Change from default
```

## 4. Build and Run

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# Verify services
docker-compose ps

# View logs
docker-compose logs -f app
```

## 5. Database Setup

```bash
# Run database migrations (if using Drizzle CLI)
docker-compose exec app npm run db:migrate

# Create initial admin user (manual SQL or script)
docker-compose exec postgres psql -U postgres -d saas_tools_hub -c "
INSERT INTO users (id, email, password, name, plan, is_admin)
VALUES (gen_random_uuid(), 'admin@example.com', 'hashed_password', 'Admin', 'premium', true);
"
```

## 6. Nginx Reverse Proxy (Recommended)

```bash
# Install Nginx
sudo apt install nginx -y

# Create config file
sudo nano /etc/nginx/sites-available/saas-hub

# Add configuration:
upstream saas_hub {
    server localhost:5000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    client_max_body_size 10M;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    client_max_body_size 10M;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Enable compression for performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    location / {
        proxy_pass http://saas_hub;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/saas-hub /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already enabled)
sudo systemctl enable certbot.timer
```

## 8. Backup Strategy

```bash
# Create backup script: /opt/saas-tools-hub/backup.sh
#!/bin/bash

BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="saas_tools_hub"

mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    /opt/saas-tools-hub

# Keep last 30 days of backups
find $BACKUP_DIR -type f -mtime +30 -delete

# Make executable and add to crontab
chmod +x backup.sh
# Add to cron: 0 2 * * * /opt/saas-tools-hub/backup.sh
```

## 9. Monitoring & Logging

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# Implement monitoring (optional)
# Consider using: Prometheus, Grafana, ELK stack

# Monitor disk space
df -h

# Monitor memory
free -h

# Monitor processes
docker stats
```

## 10. Performance Optimization

### Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_tools_user_id_paid ON tools(user_id, is_paid);
CREATE INDEX idx_tools_renewal_date ON tools(next_renewal_date);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### Application Optimization
- Enable Redis caching (configured in docker-compose.yml)
- Use connection pooling for database
- Enable gzip compression in Nginx
- Configure CDN for static assets
- Implement rate limiting (already in routes.ts)

## 11. Troubleshooting

```bash
# Check service status
docker-compose ps

# View error logs
docker-compose logs app --tail 100

# Restart services
docker-compose restart

# Full rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check network
docker network inspect saas-hub-network
```

## 12. Updates & Maintenance

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# View changelog
git log --oneline -n 10
```

## Security Checklist

- [ ] Change JWT_SECRET to secure random value
- [ ] Change DB_PASSWORD to strong password
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up audit logging
- [ ] Regular backups configured
- [ ] Monitoring and alerts set up
- [ ] Update dependencies regularly
- [ ] Review and restrict API access

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Create GitHub issue

## License

[Your License Here]
