#!/bin/bash

# NMEA2000 Monitor Setup Script
echo "Setting up NMEA2000 Monitor..."

# Update package list
sudo apt-get update

# Install required packages
echo "Installing required packages..."
sudo apt-get install -y can-utils nodejs npm

# Enable SPI and CAN in boot config
echo "Configuring boot settings..."
if ! grep -q "dtparam=spi=on" /boot/config.txt; then
    echo "dtparam=spi=on" | sudo tee -a /boot/config.txt
fi
if ! grep -q "dtoverlay=mcp2515-can0" /boot/config.txt; then
    echo "dtoverlay=mcp2515-can0,oscillator=16000000,interrupt=25" | sudo tee -a /boot/config.txt
fi
if ! grep -q "dtoverlay=spi-bcm2835-overlay" /boot/config.txt; then
    echo "dtoverlay=spi-bcm2835-overlay" | sudo tee -a /boot/config.txt
fi

# Create directory for the application
sudo mkdir -p /opt/nmea2000-monitor
sudo chown $USER:$USER /opt/nmea2000-monitor

# Copy application files
echo "Installing application..."
cp -r * /opt/nmea2000-monitor/

# Install Node.js dependencies
cd /opt/nmea2000-monitor
npm install

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/nmea2000-monitor.service << EOF
[Unit]
Description=NMEA2000 Monitor
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/nmea2000-monitor/server.js
WorkingDirectory=/opt/nmea2000-monitor
User=$USER
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create CAN interface configuration
echo "Creating CAN interface configuration..."
sudo tee /etc/network/interfaces.d/can0 << EOF
auto can0
iface can0 inet manual
    pre-up /sbin/ip link set can0 type can bitrate 250000
    up /sbin/ip link set can0 up
    down /sbin/ip link set can0 down
EOF

# Enable and start the service
echo "Enabling and starting service..."
sudo systemctl enable nmea2000-monitor
sudo systemctl start nmea2000-monitor

echo "Setup complete! The application will be available at http://localhost:5000"
echo "Please reboot your Raspberry Pi to apply all changes."
