// NMEA2000 Message Definitions and Handlers
const CRC16 = require('crc').crc16;

// NMEA2000 PGNs
const PGNs = {
    // Standard PGNs
    ISO_ADDRESS_CLAIM: 60928,
    ENGINE_PARAMS: 127488,
    TEMPERATURE: 130312,
    ENVIRONMENTAL: 130311,
    HUMIDITY: 130313,
    ACTUAL_PRESSURE: 130314,
    SET_PRESSURE: 130315
};

// NMEA2000 Priorities
const PRIORITIES = {
    HIGH: 2,
    MEDIUM_HIGH: 3,
    MEDIUM: 4,
    MEDIUM_LOW: 5,
    LOW: 6
};

// NMEA2000 Temperature Sources
const TEMP_SOURCES = {
    SEA: 0,
    OUTSIDE: 1,
    INSIDE: 2,
    ENGINE_ROOM: 3,
    MAIN_CABIN: 4,
    LIVE_WELL: 5,
    BAIT_WELL: 6,
    REFRIGERATION: 7,
    HEATING: 8,
    DEW_POINT: 9,
    WIND_CHILL: 10,
    HEAT_INDEX: 11
};

class NMEA2000Message {
    static createISOAddressClaim(uniqueNumber, manufacturerCode, deviceFunction) {
        const data = Buffer.alloc(8);
        // NAME bits according to NMEA2000 standard
        data.writeUInt32LE(uniqueNumber, 0);
        data.writeUInt16LE(manufacturerCode, 4);
        data.writeUInt8(deviceFunction, 6);
        data.writeUInt8(0xFF, 7); // Reserved

        return {
            pgn: PGNs.ISO_ADDRESS_CLAIM,
            priority: PRIORITIES.HIGH,
            data: data
        };
    }

    static createTemperature(instance, source, temp) {
        const tempK = (temp + 273.15) * 100;
        const sid = Math.floor(Math.random() * 255);
        
        const data = Buffer.alloc(8);
        data.writeUInt8(sid, 0);         // SID
        data.writeUInt8(instance, 1);    // Instance
        data.writeUInt8(source, 2);      // Source
        data.writeUInt16LE(tempK, 3);    // Actual Temperature
        data.writeUInt16LE(0xFFFF, 5);   // Set Temperature
        data.writeUInt8(0xFF, 7);        // Reserved

        return {
            pgn: PGNs.TEMPERATURE,
            priority: PRIORITIES.MEDIUM_LOW,
            data: data,
            sid: sid
        };
    }

    static createEnvironmental(instance, humidity, pressure) {
        const sid = Math.floor(Math.random() * 255);
        const data = Buffer.alloc(8);
        
        data.writeUInt8(sid, 0);         // SID
        data.writeUInt8(instance, 1);    // Instance
        data.writeUInt16LE(humidity * 100, 2);  // Humidity (%)
        data.writeUInt16LE(pressure * 100, 4);  // Pressure (hPa)
        data.writeUInt16LE(0xFFFF, 6);   // Reserved

        return {
            pgn: PGNs.ENVIRONMENTAL,
            priority: PRIORITIES.MEDIUM_LOW,
            data: data,
            sid: sid
        };
    }

    static createEngineParams(rpm, engineSpeed, boostPressure, tiltTrim = 0) {
        const rpmValue = Math.round(rpm * 4);
        const data = Buffer.alloc(8);
        
        data.writeUInt16LE(rpmValue, 0);        // Engine RPM
        data.writeUInt16LE(engineSpeed, 2);     // Speed % of rated
        data.writeUInt16LE(boostPressure, 4);   // Boost Pressure
        data.writeUInt8(tiltTrim, 6);           // Tilt/Trim
        data.writeUInt8(0xFF, 7);               // Reserved

        return {
            pgn: PGNs.ENGINE_PARAMS,
            priority: PRIORITIES.MEDIUM_HIGH,
            data: data
        };
    }

    static addChecksum(msg) {
        const crc = CRC16(msg.data);
        const dataWithCRC = Buffer.concat([
            msg.data,
            Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF])
        ]);
        return { ...msg, data: dataWithCRC };
    }

    static createCANFrame(msg) {
        // Create CAN ID according to NMEA2000 format
        const canId = (msg.priority << 26) | (msg.pgn << 8) | msg.sourceAddress;
        return { id: canId, data: msg.data };
    }

    static parseCANFrame(frame) {
        const priority = frame.id >> 26;
        const pgn = (frame.id >> 8) & 0x1FFFF;
        const sourceAddress = frame.id & 0xFF;
        
        // Verify checksum if present
        if (frame.data.length > 8) {
            const data = frame.data.slice(0, -2);
            const receivedCRC = frame.data.readUInt16LE(frame.data.length - 2);
            const calculatedCRC = CRC16(data);
            
            if (receivedCRC !== calculatedCRC) {
                throw new Error('CRC checksum mismatch');
            }
            
            frame.data = data;
        }
        
        return { priority, pgn, sourceAddress, data: frame.data };
    }
}

module.exports = {
    PGNs,
    PRIORITIES,
    TEMP_SOURCES,
    NMEA2000Message
};
