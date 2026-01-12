import { DeviceAvailability } from '../domain/entities/device-availability';
import { AvailabilityRepo } from '../domain/repositories/availability-repo';

export type GetAvailabilityDeps = {
    availabilityRepo: AvailabilityRepo;
};

export type GetAvailabilityResult = {
    success: boolean;
    data?: DeviceAvailability;
    error?: string;
};

/**
 * Use case to get availability for a single device.
 */
export async function getAvailability(
    deps: GetAvailabilityDeps,
    deviceId: string
): Promise<GetAvailabilityResult> {
    try {
        const availability = await deps.availabilityRepo.getByDeviceId(deviceId);
        return { success: true, data: availability };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}
