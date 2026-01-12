import { DeviceAvailability } from '../domain/entities/device-availability';
import { AvailabilityRepo } from '../domain/repositories/availability-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';
import { AvailabilityEventTypes } from '../domain/entities/outbox-message';

export type SaveAvailabilityDeps = {
    availabilityRepo: AvailabilityRepo;
    eventPublisher: EventPublisher;
};

export type SaveAvailabilityResult = {
    success: boolean;
    data?: DeviceAvailability;
    error?: string;
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
 * Use case to save/update device availability.
 * Publishes Availability.Changed event when status changes.
 * 
 * @param deps - Repository and event publisher dependencies
 * @param availability - The availability record to save
 * @param previousStatus - The previous status (if known) to detect changes
 */
export async function saveAvailability(
    deps: SaveAvailabilityDeps,
    availability: DeviceAvailability,
    previousStatus?: string | null
): Promise<SaveAvailabilityResult> {
    try {
        const saved = await deps.availabilityRepo.save(availability);

        // Publish event if status changed
        if (previousStatus !== undefined && previousStatus !== saved.status) {
            const eventData: AvailabilityChangedEventData = {
                deviceId: saved.deviceId,
                previousStatus: previousStatus,
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
        return { success: false, error: message };
    }
}
