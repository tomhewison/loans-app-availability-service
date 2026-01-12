import { AvailabilityRepo } from '../domain/repositories/availability-repo';

export type DeleteAvailabilityDeps = {
    availabilityRepo: AvailabilityRepo;
};

export type DeleteAvailabilityResult = {
    success: boolean;
    error?: string;
};

/**
 * Use case to delete an availability record.
 * This is idempotent - deleting a non-existent record succeeds.
 */
export async function deleteAvailability(
    deps: DeleteAvailabilityDeps,
    deviceId: string
): Promise<DeleteAvailabilityResult> {
    try {
        await deps.availabilityRepo.delete(deviceId);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}
