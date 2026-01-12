import { DeviceAvailability } from '../domain/entities/device-availability';
import { AvailabilityRepo } from '../domain/repositories/availability-repo';

export type GetAvailabilityByDeviceIdsDeps = {
    availabilityRepo: AvailabilityRepo;
};

export type GetAvailabilityByDeviceIdsResult = {
    success: boolean;
    data?: DeviceAvailability[];
    error?: string;
};

/**
 * Use case to get availability for multiple devices in a batch.
 */
export async function getAvailabilityByDeviceIds(
    deps: GetAvailabilityByDeviceIdsDeps,
    deviceIds: string[]
): Promise<GetAvailabilityByDeviceIdsResult> {
    try {
        if (deviceIds.length === 0) {
            return { success: true, data: [] };
        }

        const availability = await deps.availabilityRepo.getByDeviceIds(deviceIds);
        return { success: true, data: availability };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}
