# NMEA2000 Monitor

A web-based NMEA2000 monitoring system for Raspberry Pi with PiCAN2 board.

## Features
- Real-time monitoring of NMEA2000 messages
- Multiple temperature sensor support
- Engine parameter monitoring
- Environmental data tracking
- Web-based interface with live graphs

## Hardware Requirements
- Raspberry Pi (any model with 40-pin GPIO)
- PiCAN2 board
- NMEA2000 network connection

## Installation

1. Connect the PiCAN2 board to your Raspberry Pi.

2. Download and extract the package:
```bash
cd ~
git clone https://github.com/Ross-ump/nmea2000-monitor.git
cd nmea2000-monitor
```

3. Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

4. Reboot your Raspberry Pi:
```bash
sudo reboot
```

5. After reboot, the application will be available at:
```
http://[raspberry-pi-ip]:5000
```

## Manual Configuration (if needed)

### CAN Interface Setup
If you need to manually configure the CAN interface:

1. Edit `/boot/firmware/config.txt`:
```
dtparam=spi=on
dtoverlay=mcp2515-can0,oscillator=16000000,interrupt=25
dtoverlay=spi-bcm2835-overlay
```

2. Set up CAN interface:
```bash
sudo ip link set can0 up type can bitrate 250000
```

### Starting/Stopping the Service
```bash
# Start the service
sudo systemctl start nmea2000-monitor

# Stop the service
sudo systemctl stop nmea2000-monitor

# View service logs
journalctl -u nmea2000-monitor -f
```

## Troubleshooting

1. Check CAN interface status:
```bash
ip -details link show can0
```

2. Test CAN communication:
```bash
# Monitor CAN traffic
candump can0
```

3. Check service status:
```bash
systemctl status nmea2000-monitor
```

## NMEA2000 Message Support

The application supports the following NMEA2000 messages:

1. PGN 127488 - Engine Parameters
   - Engine RPM
   - Engine Speed
   - Boost Pressure
   - Tilt/Trim

2. PGN 130312 - Temperature
   - Multiple temperature sources
   - Engine Room
   - Outside
   - Main Cabin

3. PGN 130311 - Environmental Parameters
   - Temperature
   - Humidity
   - Atmospheric Pressure

4. PGN 60928 - ISO Address Claim
   - Device identification
   - Manufacturer information

## License
This project is licensed under the MIT License - see the LICENSE file for details
