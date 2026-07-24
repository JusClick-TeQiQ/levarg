#!/bin/bash

# LevarG Quick Deployment Script
# This script automates the deployment of LevarG to a fresh Ubuntu VPS

set -e

echo "========================================="
echo "LevarG Deployment Script"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Configuration
APP_DIR="/var/www/levarg"
DOMAIN="levarg.ilevelace.com"
EMAIL="admin@ilevelace.com"

echo "Step 1: Updating system..."
apt update && apt upgrade -y

echo "Step 2: Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "Step 3: Installing Chrome/Chromium..."
apt install -y chromium-browser

echo "Step 4: Installing Nginx..."
apt install -y nginx

echo "Step 5: Installing PM2..."
npm install -g pm2

echo "Step 6: Installing Git..."
apt install -y git

echo "Step 7: Installing Certbot..."
apt install -y certbot python3-certbot-nginx

echo "Step 8: Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

echo "Step 9: Cloning repository..."
git clone https://github.com/JusClick-TeQiQ/levarg.git .
chown -R $SUDO_USER:$SUDO_USER $APP_DIR

echo "Step 10: Installing dependencies..."
sudo -u $SUDO_USER npm install

echo "Step 11: Building application..."
sudo -u $SUDO_USER npm run build:web

echo "Step 12: Creating data directory..."
mkdir -p $APP_DIR/data
chown -R $SUDO_USER:$SUDO_USER $APP_DIR/data

echo "Step 13: Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration before starting!"
    echo "   nano $APP_DIR/.env"
fi

echo "Step 14: Configuring Nginx..."
cat > /etc/nginx/sites-available/levarg <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /static/ {
        alias $APP_DIR/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/levarg /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "Step 15: Configuring PM2..."
sudo -u $SUDO_USER pm2 start dist/server.js --name levarg
sudo -u $SUDO_USER pm2 startup
sudo -u $SUDO_USER pm2 save

echo "Step 16: Configuring Firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Point your DNS: $DOMAIN → $(curl -s ifconfig.me)"
echo "2. Edit .env: nano $APP_DIR/.env"
echo "3. Restart PM2: sudo -u $SUDO_USER pm2 restart levarg"
echo "4. Setup SSL: sudo certbot --nginx -d $DOMAIN"
echo ""
echo "Access at: http://$DOMAIN"
echo ""
