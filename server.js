const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const socketcan = require('socketcan');
const { PGNs, PRIORITIES, TEMP_SOURCES, NMEA2000Message } = require('./nmea2000_messages');

// Serve static files from public directory
app.use(express.static('public'));

// NMEA2000 Device Configuration
const DEVICE_CONFIG = {
    manufacturerCode: 0x7FF, // Development code
    uniqueNumber: Math.floor(Math.random() * 0xFFFFFF),
    deviceFunction: 0x32, // Temperature monitoring
    sourceAddress: 0x01
};

// Initialize CAN channel
let channel;
try {
    channel = socketcan.createRawChannel("can0", { bitrate: 250000 });
    channel.start();

    // Send ISO Address Claim
    const addressClaim = NMEA2000Message.createISOAddressClaim(
        DEVICE_CONFIG.uniqueNumber,
        DEVICE_CONFIG.manufacturerCode,
        DEVICE_CONFIG.deviceFunction
    );

    const frame = NMEA2000Message.createCANFrame({
        ...addressClaim,
        sourceAddress: DEVICE_CONFIG.sourceAddress
    });

    channel.send(frame);
} catch (error) {
    console.error("Failed to initialize CAN interface:", error);
}

// Handle socket connections
io.on('connection', (socket) => {
    console.log('Client connected');

    // Handle temperature updates from client
    socket.on('temperature', (data) => {
        if (channel) {
            const { temp, instance, source } = data;
            const msg = NMEA2000Message.createTemperature(
                instance || 0,
                source || TEMP_SOURCES.ENGINE_ROOM,
                temp
            );

            const frame = NMEA2000Message.createCANFrame({
                ...NMEA2000Message.addChecksum(msg),
                sourceAddress: DEVICE_CONFIG.sourceAddress
            });

            channel.send(frame);
            console.log(`Sending temperature: ${temp}°C, Instance: ${instance}, Source: ${source}`);
        }
    });

    // Handle environmental updates
    socket.on('environmental', (data) => {
        if (channel) {
            const { instance, humidity, pressure } = data;
            const msg = NMEA2000Message.createEnvironmental(instance, humidity, pressure);

            const frame = NMEA2000Message.createCANFrame({
                ...NMEA2000Message.addChecksum(msg),
                sourceAddress: DEVICE_CONFIG.sourceAddress
            });

            channel.send(frame);
            console.log(`Sending environmental data - Humidity: ${humidity}%, Pressure: ${pressure}hPa`);
        }
    });

    // Handle RPM updates from client
    socket.on('rpm', (data) => {
        if (channel) {
            const { rpm, engineSpeed, boostPressure, tiltTrim } = data;
            const msg = NMEA2000Message.createEngineParams(rpm, engineSpeed, boostPressure, tiltTrim);

            const frame = NMEA2000Message.createCANFrame({
                ...NMEA2000Message.addChecksum(msg),
                sourceAddress: DEVICE_CONFIG.sourceAddress
            });

            channel.send(frame);
            console.log(`Sending Engine RPM: ${rpm}, Speed: ${engineSpeed}%, Boost: ${boostPressure}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Listen for CAN messages
if (channel) {
    channel.addListener("onMessage", (frame) => {
        try {
            const msg = NMEA2000Message.parseCANFrame(frame);

            switch (msg.pgn) {
                case PGNs.TEMPERATURE: {
                    const sid = msg.data[0];
                    const instance = msg.data[1];
                    const source = msg.data[2];
                    const tempK = msg.data.readUInt16LE(3);
                    const tempC = (tempK / 100) - 273.15;

                    console.log(`Received temperature: ${tempC.toFixed(1)}°C from source ${source}, instance ${instance}, SID ${sid}`);
                    io.emit('temperature_update', { temp: tempC, instance, source });
                    break;
                }

                case PGNs.ENVIRONMENTAL: {
                    const sid = msg.data[0];
                    const instance = msg.data[1];
                    const humidity = msg.data.readUInt16LE(2) / 100;
                    const pressure = msg.data.readUInt16LE(4) / 100;

                    console.log(`Received environmental data - Humidity: ${humidity}%, Pressure: ${pressure}hPa`);
                    io.emit('environmental_update', { humidity, pressure, instance });
                    break;
                }

                case PGNs.ENGINE_PARAMS: {
                    const rpm = msg.data.readUInt16LE(0) / 4;
                    const engineSpeed = msg.data.readUInt16LE(2);
                    const boostPressure = msg.data.readUInt16LE(4);
                    const tiltTrim = msg.data[6];

                    console.log(`Received Engine RPM: ${rpm}, Speed: ${engineSpeed}%, Boost: ${boostPressure}, Trim: ${tiltTrim}`);
                    io.emit('engine_update', { rpm, engineSpeed, boostPressure, tiltTrim });
                    break;
                }

                case PGNs.ISO_ADDRESS_CLAIM: {
                    const uniqueNumber = msg.data.readUInt32LE(0);
                    const manufacturerCode = msg.data.readUInt16LE(4);
                    const deviceFunction = msg.data[6];

                    console.log(`Received ISO Address Claim - Manufacturer: 0x${manufacturerCode.toString(16)}, Function: 0x${deviceFunction.toString(16)}`);
                    break;
                }
            }
        } catch (error) {
            console.error('Error processing CAN frame:', error);
        }
    });
}

// Start server
const PORT = 5000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});