import { app } from '@azure/functions';
import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { getAvailabilityRepo, getEventPublisher } from '../config/appServices';
import { getAvailability } from '../app/get-availability';
import { getAvailabilityByDeviceIds } from '../app/get-availability-by-device-ids';
import { updateAvailabilityStatus } from '../app/update-availability-status';
import { deleteAvailability } from '../app/delete-availability';
import { AvailabilityStatus } from '../domain/entities/device-availability';
import { addCorsHeaders } from '../infra/middleware/cors';
import { requireStaff } from '../infra/middleware/auth0-middleware';

/**
 * GET /api/availability/:deviceId - Get availability for a single device
 */
async function handleGetAvailability(request: HttpRequest): Promise<HttpResponseInit> {
    const origin = request.headers.get('origin');

    // Require staff authorization
    const authResult = await requireStaff(request);
    if (!authResult.valid) {
        return addCorsHeaders({
            status: 401,
            jsonBody: {
                success: false,
                message: 'Unauthorized',
                error: authResult.error,
            },
        }, origin);
    }

    const deviceId = request.params.deviceId;
    if (!deviceId) {
        return addCorsHeaders({
            status: 400,
            jsonBody: {
                success: false,
                message: 'Device ID is required',
            },
        }, origin);
    }

    const result = await getAvailability(
        { availabilityRepo: getAvailabilityRepo() },
        deviceId
    );

    if (!result.success) {
        return addCorsHeaders({
            status: 500,
            jsonBody: {
                success: false,
                message: 'Failed to get availability',
                error: result.error,
            },
        }, origin);
    }

    if (!result.data) {
        return addCorsHeaders({
            status: 404,
            jsonBody: {
                success: false,
                message: 'Availability record not found',
            },
        }, origin);
    }

    return addCorsHeaders({
        status: 200,
        jsonBody: {
            id: result.data.id,
            deviceId: result.data.deviceId,
            status: result.data.status,
            reservationId: result.data.reservationId,
            lastCheckedAt: result.data.lastCheckedAt.toISOString(),
            updatedAt: result.data.updatedAt.toISOString(),
        },
    }, origin);
}

/**
 * GET /api/availability - Get availability for multiple devices (batch)
 * Query params: deviceIds (comma-separated)
 */
async function handleListAvailability(request: HttpRequest): Promise<HttpResponseInit> {
    const origin = request.headers.get('origin');

    // Require staff authorization
    const authResult = await requireStaff(request);
    if (!authResult.valid) {
        return addCorsHeaders({
            status: 401,
            jsonBody: {
                success: false,
                message: 'Unauthorized',
                error: authResult.error,
            },
        }, origin);
    }

    const deviceIdsParam = request.query.get('deviceIds');
    if (!deviceIdsParam) {
        return addCorsHeaders({
            status: 400,
            jsonBody: {
                success: false,
                message: 'deviceIds query parameter is required',
            },
        }, origin);
    }

    const deviceIds = deviceIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);
    if (deviceIds.length === 0) {
        return addCorsHeaders({
            status: 200,
            jsonBody: [],
        }, origin);
    }

    const result = await getAvailabilityByDeviceIds(
        { availabilityRepo: getAvailabilityRepo() },
        deviceIds
    );

    if (!result.success) {
        return addCorsHeaders({
            status: 500,
            jsonBody: {
                success: false,
                message: 'Failed to get availability',
                error: result.error,
            },
        }, origin);
    }

    return addCorsHeaders({
        status: 200,
        jsonBody: (result.data ?? []).map(avail => ({
            id: avail.id,
            deviceId: avail.deviceId,
            status: avail.status,
            reservationId: avail.reservationId,
            lastCheckedAt: avail.lastCheckedAt.toISOString(),
            updatedAt: avail.updatedAt.toISOString(),
        })),
    }, origin);
}

/**
 * PUT /api/availability/:deviceId - Update availability status
 */
async function handleUpdateAvailability(request: HttpRequest): Promise<HttpResponseInit> {
    const origin = request.headers.get('origin');

    // Require staff authorization
    const authResult = await requireStaff(request);
    if (!authResult.valid) {
        return addCorsHeaders({
            status: 401,
            jsonBody: {
                success: false,
                message: 'Unauthorized',
                error: authResult.error,
            },
        }, origin);
    }

    const deviceId = request.params.deviceId;
    if (!deviceId) {
        return addCorsHeaders({
            status: 400,
            jsonBody: {
                success: false,
                message: 'Device ID is required',
            },
        }, origin);
    }

    try {
        const body = await request.json() as { status?: string; reservationId?: string | null };

        if (!body.status || !Object.values(AvailabilityStatus).includes(body.status as AvailabilityStatus)) {
            return addCorsHeaders({
                status: 400,
                jsonBody: {
                    success: false,
                    message: `Invalid status. Must be one of: ${Object.values(AvailabilityStatus).join(', ')}`,
                },
            }, origin);
        }

        const result = await updateAvailabilityStatus(
            {
                availabilityRepo: getAvailabilityRepo(),
                eventPublisher: getEventPublisher(),
            },
            deviceId,
            body.status as AvailabilityStatus,
            body.reservationId
        );

        if (!result.success) {
            return addCorsHeaders({
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to update availability',
                    error: result.error,
                },
            }, origin);
        }

        return addCorsHeaders({
            status: 200,
            jsonBody: {
                id: result.data!.id,
                deviceId: result.data!.deviceId,
                status: result.data!.status,
                reservationId: result.data!.reservationId,
                lastCheckedAt: result.data!.lastCheckedAt.toISOString(),
                updatedAt: result.data!.updatedAt.toISOString(),
            },
        }, origin);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return addCorsHeaders({
            status: 400,
            jsonBody: {
                success: false,
                message: 'Invalid request body',
                error: message,
            },
        }, origin);
    }
}

/**
 * DELETE /api/availability/:deviceId - Delete availability record
 */
async function handleDeleteAvailability(request: HttpRequest): Promise<HttpResponseInit> {
    const origin = request.headers.get('origin');

    // Require staff authorization
    const authResult = await requireStaff(request);
    if (!authResult.valid) {
        return addCorsHeaders({
            status: 401,
            jsonBody: {
                success: false,
                message: 'Unauthorized',
                error: authResult.error,
            },
        }, origin);
    }

    const deviceId = request.params.deviceId;
    if (!deviceId) {
        return addCorsHeaders({
            status: 400,
            jsonBody: {
                success: false,
                message: 'Device ID is required',
            },
        }, origin);
    }

    const result = await deleteAvailability(
        { availabilityRepo: getAvailabilityRepo() },
        deviceId
    );

    if (!result.success) {
        return addCorsHeaders({
            status: 500,
            jsonBody: {
                success: false,
                message: 'Failed to delete availability',
                error: result.error,
            },
        }, origin);
    }

    return addCorsHeaders({
        status: 204,
    }, origin);
}

// GET /api/availability - List availability for multiple devices (batch query)
app.http('listAvailabilityHttp', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'availability',
    handler: handleListAvailability,
});

// GET /api/availability/:deviceId - Get availability for single device
app.http('getAvailabilityHttp', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'availability/{deviceId}',
    handler: handleGetAvailability,
});

// PUT /api/availability/:deviceId - Update availability
app.http('updateAvailabilityHttp', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'availability/{deviceId}',
    handler: handleUpdateAvailability,
});

// DELETE /api/availability/:deviceId - Delete availability
app.http('deleteAvailabilityHttp', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'availability/{deviceId}',
    handler: handleDeleteAvailability,
});
