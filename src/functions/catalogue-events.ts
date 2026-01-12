import { app, EventGridEvent, InvocationContext } from '@azure/functions';
import { getAvailabilityRepo, getEventPublisher } from '../config/appServices';
import { updateAvailabilityStatus } from '../app/update-availability-status';
import { deleteAvailability } from '../app/delete-availability';
import { AvailabilityStatus } from '../domain/entities/device-availability';

/**
 * Event types published by the Catalogue Service that we need to handle.
 */
const CatalogueEventTypes = {
    DeviceUpserted: 'Catalogue.Device.Upserted',
    DeviceDeleted: 'Catalogue.Device.Deleted',
} as const;

/**
 * Device event payload structure from the Catalogue Service.
 */
type DeviceEventData = {
    id: string;
    deviceModelId: string;
    serialNumber: string;
    assetId: string;
    status: string;
    condition: string;
    notes?: string;
    purchaseDate: string;
    updatedAt: string;
};

/**
 * Device deleted event payload.
 */
type DeviceDeletedEventData = {
    id: string;
    deviceModelId: string;
};

/**
 * Maps catalogue device status to availability status.
 */
function mapToAvailabilityStatus(status: string): AvailabilityStatus {
    switch (status) {
        case 'Available':
            return AvailabilityStatus.Available;
        case 'Unavailable':
            return AvailabilityStatus.Unavailable;
        case 'Maintenance':
            return AvailabilityStatus.Maintenance;
        case 'Retired':
            return AvailabilityStatus.Retired;
        case 'Lost':
            return AvailabilityStatus.Lost;
        default:
            // Default to Available for unknown statuses
            return AvailabilityStatus.Available;
    }
}

/**
 * Handles Event Grid events from the Catalogue Service.
 * Syncs device availability when devices are created, updated, or deleted.
 * 
 * This maintains eventual consistency:
 * 1. Catalogue Service creates/updates/deletes devices
 * 2. It publishes device events
 * 3. Availability Service listens and maintains its own records
 */
async function handleCatalogueEvent(
    event: EventGridEvent,
    context: InvocationContext
): Promise<void> {
    const eventType = event.eventType;

    context.log(`[catalogue-events] Received event: ${eventType}`);
    context.log(`[catalogue-events] Event data:`, JSON.stringify(event.data));

    switch (eventType) {
        case CatalogueEventTypes.DeviceUpserted: {
            const data = event.data as DeviceEventData;

            if (!data?.id) {
                context.warn(`[catalogue-events] Missing device id in upsert event, skipping`);
                return;
            }

            const status = mapToAvailabilityStatus(data.status);
            context.log(`[catalogue-events] Syncing availability for device ${data.id} with status ${status}`);

            const result = await updateAvailabilityStatus(
                {
                    availabilityRepo: getAvailabilityRepo(),
                    eventPublisher: getEventPublisher(),
                },
                data.id,
                status
            );

            if (!result.success) {
                context.error(`[catalogue-events] Failed to sync availability: ${result.error}`);
                throw new Error(`Failed to sync availability for device ${data.id}: ${result.error}`);
            }

            context.log(`[catalogue-events] Successfully synced availability for device ${data.id}`);
            break;
        }

        case CatalogueEventTypes.DeviceDeleted: {
            const data = event.data as DeviceDeletedEventData;

            if (!data?.id) {
                context.warn(`[catalogue-events] Missing device id in delete event, skipping`);
                return;
            }

            context.log(`[catalogue-events] Deleting availability for device ${data.id}`);

            const result = await deleteAvailability(
                { availabilityRepo: getAvailabilityRepo() },
                data.id
            );

            if (!result.success) {
                context.error(`[catalogue-events] Failed to delete availability: ${result.error}`);
                // Don't throw - deletion is idempotent
            }

            context.log(`[catalogue-events] Deleted availability for device ${data.id}`);
            break;
        }

        default:
            context.log(`[catalogue-events] Unhandled event type: ${eventType}, skipping`);
    }
}

/**
 * Event Grid trigger for catalogue events.
 * 
 * This function subscribes to device events published by the Catalogue Service
 * and maintains availability records accordingly.
 * 
 * Event Grid subscription should be configured to filter on:
 * - Catalogue.Device.Upserted
 * - Catalogue.Device.Deleted
 */
app.eventGrid('catalogueEventsTrigger', {
    handler: handleCatalogueEvent,
});
