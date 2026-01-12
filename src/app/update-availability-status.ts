import {
    DeviceAvailability,
    AvailabilityStatus,
    createDeviceAvailability,
    updateDeviceAvailability
} from '../domain/entities/device-availability';
import { AvailabilityRepo } from '../domain/repositories/availability-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';
import { AvailabilityEventTypes } from '../domain/entities/outbox-message';

export type UpdateAvailabilityStatusDeps = {
    availabilityRepo: AvailabilityRepo;
    eventPublisher: EventPublisher;
};

export type UpdateAvailabilityStatusResult = {
    success: boolean;
    data?: DeviceAvailability;
    error?: string;
    code?: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
};

/**
 * Event data published when availability changes.
 */
type AvailabilityChangedEventData = {
    deviceId: string;
    previousStatus: string | null;
    newStatus: string;
    reservationId: string | null;
    updatedAt: string;
};

/**
 * Use case to update device availability status.
 * Creates the record if it doesn't exist.
 * Publishes Availability.Changed event on status change.
 * 
 * @param deps - Repository and event publisher dependencies
 * @param deviceId - The device ID to update
 * @param newStatus - The new availability status
 * @param reservationId - Optional reservation ID to associate (or null to clear)
 */
export async function updateAvailabilityStatus(
    deps: UpdateAvailabilityStatusDeps,
    deviceId: string,
    newStatus: AvailabilityStatus,
    reservationId?: string | null
): Promise<UpdateAvailabilityStatusResult> {
    try {
        // Get existing record
        const existing = await deps.availabilityRepo.getByDeviceId(deviceId);

        let saved: DeviceAvailability;
        let previousStatus: string | null = null;

        if (existing) {
            // Update existing record
            previousStatus = existing.status;

            // Skip if no change
            if (existing.status === newStatus && existing.reservationId === reservationId) {
                return { success: true, data: existing };
            }

            const updated = updateDeviceAvailability(existing, {
                status: newStatus,
                reservationId: reservationId,
            });
            saved = await deps.availabilityRepo.save(updated);
        } else {
            // Create new record
            const newRecord = createDeviceAvailability({
                deviceId,
                status: newStatus,
                reservationId: reservationId ?? undefined,
            });
            saved = await deps.availabilityRepo.save(newRecord);
        }

        // Publish event if status changed
        if (previousStatus !== saved.status) {
            const eventData: AvailabilityChangedEventData = {
                deviceId: saved.deviceId,
                previousStatus,
                newStatus: saved.status,
                reservationId: saved.reservationId ?? null,
                updatedAt: saved.updatedAt.toISOString(),
            };

            await deps.eventPublisher.publish(
                'Availability',
                AvailabilityEventTypes.AvailabilityChanged,
                saved.deviceId,
                eventData
            );
        }

        return { success: true, data: saved };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message, code: 'INTERNAL_ERROR' };
    }
}
