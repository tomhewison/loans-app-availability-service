import { DeviceAvailability, AvailabilityStatus, createDeviceAvailability } from '../domain/entities/device-availability';

/**
 * Test data for device availability records.
 * These match the devices defined in the catalogue-service test-devices.ts
 */
export function generateTestAvailability(): DeviceAvailability[] {
    const availability: DeviceAvailability[] = [];

    // Dell XPS 13 devices (5 instances) - matches catalogue
    for (let i = 1; i <= 5; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-dell-xps-13-${i}`,
            status: i <= 3 ? AvailabilityStatus.Available : AvailabilityStatus.Unavailable,
            reservationId: i === 4 ? 'reservation-sample-1' : undefined,
        }));
    }

    // MacBook Air M2 devices (4 instances) - 2 available, 2 in maintenance
    for (let i = 1; i <= 4; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-macbook-air-m2-${i}`,
            status: i <= 2 ? AvailabilityStatus.Available : AvailabilityStatus.Maintenance,
        }));
    }

    // Lenovo ThinkPad X1 devices (6 instances) - 4 available, 2 unavailable
    for (let i = 1; i <= 6; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-thinkpad-x1-${i}`,
            status: i <= 4 ? AvailabilityStatus.Available : AvailabilityStatus.Unavailable,
        }));
    }

    // iPad Air devices (3 instances) - all available
    for (let i = 1; i <= 3; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-ipad-air-${i}`,
            status: AvailabilityStatus.Available,
        }));
    }

    // Surface Pro devices (4 instances) - 3 available, 1 unavailable
    for (let i = 1; i <= 4; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-surface-pro-${i}`,
            status: i <= 3 ? AvailabilityStatus.Available : AvailabilityStatus.Unavailable,
        }));
    }

    // Canon EOS R6 devices (2 instances) - all available
    for (let i = 1; i <= 2; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-canon-eos-r6-${i}`,
            status: AvailabilityStatus.Available,
        }));
    }

    // Sony A7 III devices (2 instances) - 1 available, 1 in maintenance
    for (let i = 1; i <= 2; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-sony-a7iii-${i}`,
            status: i === 1 ? AvailabilityStatus.Available : AvailabilityStatus.Maintenance,
        }));
    }

    // iPhone 14 devices (3 instances) - all available
    for (let i = 1; i <= 3; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-iphone-14-${i}`,
            status: AvailabilityStatus.Available,
        }));
    }

    // Logitech MX Keys keyboards (5 instances) - all available
    for (let i = 1; i <= 5; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-logitech-mx-keys-${i}`,
            status: AvailabilityStatus.Available,
        }));
    }

    // Logitech MX Master 3 mice (5 instances) - all available
    for (let i = 1; i <= 5; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-mx-master-3-${i}`,
            status: AvailabilityStatus.Available,
        }));
    }

    // Anker 65W Chargers (8 instances) - all available
    for (let i = 1; i <= 8; i++) {
        availability.push(createDeviceAvailability({
            deviceId: `device-anker-65w-${i}`,
            status: AvailabilityStatus.Available,
        }));
    }

    return availability;
}
