import { app, EventGridEvent, InvocationContext } from '@azure/functions';
import { getAvailabilityRepo, getEventPublisher } from '../config/appServices';
import { updateAvailabilityStatus } from '../app/update-availability-status';
import { AvailabilityStatus } from '../domain/entities/device-availability';

/**
 * Event types published by the Reservation Service that we need to handle.
 */
const ReservationEventTypes = {
    ReservationCreated: 'Reservation.Created',
    ReservationCancelled: 'Reservation.Cancelled',
    ReservationCollected: 'Reservation.Collected',
    ReservationReturned: 'Reservation.Returned',
    ReservationExpired: 'Reservation.Expired',
} as const;

/**
 * Reservation event payload structure.
 */
type ReservationEventData = {
    reservationId: string;
    userId: string;
    userEmail?: string;
    deviceId: string;
    deviceModelId: string;
    reservedAt?: string;
    expiresAt?: string;
    collectedAt?: string;
    returnDueAt?: string;
    returnedAt?: string;
    cancelledAt?: string;
};

/**
 * Determines the availability status based on reservation event type.
 * 
 * Business logic:
 * - When a reservation is created → device becomes Unavailable (on hold)
 * - When a reservation is collected → device remains Unavailable (on loan)
 * - When a reservation is returned/cancelled/expired → device becomes Available
 */
function getAvailabilityFromEvent(eventType: string): { status: AvailabilityStatus; clearReservation: boolean } | null {
    switch (eventType) {
        case ReservationEventTypes.ReservationCreated:
        case ReservationEventTypes.ReservationCollected:
            return { status: AvailabilityStatus.Unavailable, clearReservation: false };

        case ReservationEventTypes.ReservationReturned:
        case ReservationEventTypes.ReservationCancelled:
        case ReservationEventTypes.ReservationExpired:
            return { status: AvailabilityStatus.Available, clearReservation: true };

        default:
            return null;
    }
}

/**
 * Handles Event Grid events from the Reservation Service.
 * Updates device availability based on reservation lifecycle.
 * 
 * The Availability Service is the source of truth for device availability.
 * When reservation events occur, we update the availability status accordingly.
 */
async function handleReservationEvent(
    event: EventGridEvent,
    context: InvocationContext
): Promise<void> {
    const eventType = event.eventType;
    const data = event.data as ReservationEventData;

    context.log(`[reservation-events] Received event: ${eventType}`);
    context.log(`[reservation-events] Event data:`, JSON.stringify(data));

    // Validate event data
    if (!data?.deviceId) {
        context.warn(`[reservation-events] Missing deviceId in event data, skipping`);
        return;
    }

    // Determine the new availability status
    const availability = getAvailabilityFromEvent(eventType);
    if (!availability) {
        context.log(`[reservation-events] Unhandled event type: ${eventType}, skipping`);
        return;
    }

    const reservationId = availability.clearReservation ? null : data.reservationId;

    context.log(
        `[reservation-events] Updating device ${data.deviceId} to ${availability.status}` +
        (reservationId ? ` with reservation ${reservationId}` : '')
    );

    const result = await updateAvailabilityStatus(
        {
            availabilityRepo: getAvailabilityRepo(),
            eventPublisher: getEventPublisher(),
        },
        data.deviceId,
        availability.status,
        reservationId
    );

    if (!result.success) {
        context.error(`[reservation-events] Failed to update availability: ${result.error}`);
        // Throw to trigger retry (unless it's a not found error)
        if (result.code !== 'NOT_FOUND') {
            throw new Error(`Failed to update device ${data.deviceId}: ${result.error}`);
        }
        context.warn(`[reservation-events] Device ${data.deviceId} not found, skipping`);
        return;
    }

    context.log(
        `[reservation-events] Successfully updated device ${data.deviceId} to ${availability.status}`
    );
}

/**
 * Event Grid trigger for reservation events.
 * 
 * This function subscribes to reservation events published by the Reservation Service
 * and updates device availability accordingly.
 * 
 * Event Grid subscription should be configured to filter on:
 * - Reservation.Created
 * - Reservation.Collected
 * - Reservation.Returned
 * - Reservation.Cancelled
 * - Reservation.Expired
 */
app.eventGrid('reservationEventsTrigger', {
    handler: handleReservationEvent,
});
