# LevarG Deployment Guide

This guide covers deploying LevarG to `levarg.ilevelace.com` on a VPS.

## Prerequisites

- Domain: `ilevelace.com` with DNS control
- VPS with at least:
  - 2 CPU cores
  - 4GB RAM (8GB recommended for browser automation)
  - 40GB SSD storage
  - Ubuntu 22.04 LTS or similar
- Node.js 20+ installed
- Chrome/Chromium for Puppeteer

## Recommended VPS Providers

- **DigitalOcean** ($20-40/month): 2-4 CPU, 4-8GB RAM
- **Linode** ($20-40/month): 2-4 CPU, 4-8GB RAM  
- **AWS EC2** (t3.medium or t3.large): Flexible, pay-as-you-go
- **Vultr** ($20-40/month): Good performance/price ratio

## Option 1: Direct VPS Deployment (Recommended)

### Step 1: Prepare VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Chrome/Chromium for Puppeteer
sudo apt install -y chromium-browser

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### Step 2: Clone and Setup

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/JusClick-TeQiQ/levarg.git
cd levarg

# Install dependencies
sudo npm install

# Build for production
sudo npm run build:web

# Create .env file
sudo cp .env.example .env
sudo nano .env
```

### Step 3: Configure Environment Variables

Edit `.env` with your configuration:

```bash
# Server Configuration
LEVARG_PORT=3000
LEVARG_BIND=0.0.0.0
LEVARG_API_KEY=your-secure-api-key-here
LEVARG_CORS_ORIGINS=https://levarg.ilevelace.com,https://ilevelace.com

# Cloudflare Workers AI (or remove if not using)
CF_AI_TOKEN=your-cloudflare-api-token
CF_ACCOUNT_ID=your-cloudflare-account-id

# Data Directory
LEVARG_DATA_DIR=/var/www/levarg/data

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Step 4: Create Data Directory

```bash
sudo mkdir -p /var/www/levarg/data
sudo chown -R $USER:$USER /var/www/levarg/data
```

### Step 5: Configure Nginx Reverse Proxy

Create Nginx config:

```bash
sudo nano /etc/nginx/sites-available/levarg
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name levarg.ilevelace.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files directly
    location /static/ {
        alias /var/www/levarg/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/levarg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d levarg.ilevelace.com

# Auto-renewal is configured automatically
```

### Step 7: Start with PM2

```bash
# Start the application
sudo pm2 start dist/server.js --name levarg

# Configure PM2 to start on boot
sudo pm2 startup
sudo pm2 save
```

### Step 8: Configure DNS

Point your DNS:

```
levarg.ilevelace.com → VPS IP address
```

### Step 9: Verify Deployment

```bash
# Check PM2 status
sudo pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check logs
sudo pm2 logs levarg
```

Access at: `https://levarg.ilevelace.com`

---

## Option 2: Docker Deployment

### Create Dockerfile

```dockerfile
FROM node:20-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Build
RUN npm run build:web

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/server.js"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  levarg:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - LEVARG_PORT=3000
      - LEVARG_BIND=0.0.0.0
      - LEVARG_API_KEY=your-api-key
      - LEVARG_CORS_ORIGINS=https://levarg.ilevelace.com
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
    restart: unless-stopped
```

### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Option 3: Cloudflare Pages (Frontend Only)

**Note**: This only works for the frontend. Backend/API needs a VPS due to Puppeteer and SQLite requirements.

1. Build the frontend:
```bash
npm run build
```

2. Deploy `dist` folder to Cloudflare Pages
3. Backend API would need to be deployed separately on a VPS

---

## Production Recommendations

### Database Migration (Optional)

For production, consider migrating from SQLite to PostgreSQL:

1. Install PostgreSQL on VPS
2. Modify `db.ts` to use PostgreSQL with `pg` or `sequelize`
3. Update connection string in `.env`

### Security Hardening

```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2Ban for SSH protection
sudo apt install -y fail2ban
```

### Monitoring

```bash
# Install monitoring with PM2
pm2 install pm2-logrotate

# Set up log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup Strategy

```bash
# Backup database
sudo cp /var/www/levarg/data/levarg.db /backup/levarg.db.$(date +%Y%m%d)

# Automated backup script (add to crontab)
0 2 * * * cp /var/www/levarg/data/levarg.db /backup/levarg.db.$(date +\%Y\%m\%d)
```

---

## Troubleshooting

### Puppeteer Issues

If Chrome fails to launch:

```bash
# Install missing dependencies
sudo apt install -y \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev
```

### Port Already in Use

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

### Permission Issues

```bash
# Fix data directory permissions
sudo chown -R $USER:$USER /var/www/levarg/data
sudo chmod -R 755 /var/www/levarg/data
```

---

## Update Process

To update to the latest version:

```bash
cd /var/www/levarg
sudo git pull origin main
sudo npm install
sudo npm run build:web
sudo pm2 restart levarg
```

---

## Support

For issues or questions:
- GitHub: https://github.com/JusClick-TeQiQ/levarg/issues
- Documentation: Check README.md and IMPLEMENTATION_PLAN.md
