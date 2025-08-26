#!/bin/bash

# NYU LIMS Deployment Script
# Run this script on the NYU server after getting approval

set -e  # Exit on any error

echo "🚀 Starting NYU LIMS Deployment..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root or with sudo"
    exit 1
fi

# Create application user
echo "👤 Creating application user..."
useradd -r -s /bin/false -d /opt/nyu-lims nyu-lims || echo "User already exists"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/nyu-lims/{backend,frontend,logs}
chown -R nyu-lims:nyu-lims /opt/nyu-lims

# Install system dependencies
echo "📦 Installing system dependencies..."
apt-get update
apt-get install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib

# Setup PostgreSQL database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres createdb nyu_lims_db || echo "Database already exists"
sudo -u postgres createuser nyu_lims_user || echo "User already exists"
sudo -u postgres psql -c "ALTER USER nyu_lims_user WITH PASSWORD 'your_secure_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nyu_lims_db TO nyu_lims_user;"

# Setup Python virtual environment
echo "🐍 Setting up Python environment..."
cd /opt/nyu-lims/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Install systemd service
echo "⚙️ Installing systemd service..."
cp nyu-lims.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable nyu-lims

# Setup nginx
echo "🌐 Setting up nginx..."
cp nginx.conf /etc/nginx/sites-available/nyu-lims
ln -sf /etc/nginx/sites-available/nyu-lims /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # Remove default site
nginx -t  # Test nginx configuration
systemctl restart nginx

# Setup SSL certificates (you'll need to provide these)
echo "🔒 SSL Setup Required:"
echo "   - Place your SSL certificate at: /etc/ssl/certs/nyu-lims.crt"
echo "   - Place your SSL key at: /etc/ssl/private/nyu-lims.key"
echo "   - Update nginx.conf with correct domain name"

# Create environment file
echo "🔧 Creating environment file..."
cat > /opt/nyu-lims/backend/.env << EOF
DATABASE_URL=postgresql://nyu_lims_user:your_secure_password_here@localhost/nyu_lims_db
SECRET_KEY=your_super_secret_key_here_change_this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
EOF

chown nyu-lims:nyu-lims /opt/nyu-lims/backend/.env
chmod 600 /opt/nyu-lims/backend/.env

# Start services
echo "🚀 Starting services..."
systemctl start nyu-lims
systemctl status nyu-lims

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update nginx.conf with your actual domain name"
echo "2. Add SSL certificates"
echo "3. Update .env file with secure passwords"
echo "4. Deploy your frontend build to /opt/nyu-lims/frontend/dist"
echo "5. Test the application at https://your-domain.nyu.edu"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs: journalctl -u nyu-lims -f"
echo "  - Restart service: systemctl restart nyu-lims"
echo "  - Check status: systemctl status nyu-lims"
