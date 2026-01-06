/**
 * Represents the availability status of a device.
 * The availability-service is the source of truth for device availability.
 */
export enum AvailabilityStatus {
  Available = 'Available',
  Unavailable = 'Unavailable',
  Maintenance = 'Maintenance',
  Retired = 'Retired',
  Lost = 'Lost'
}

/**
 * Represents the availability record for a device.
 */
export type DeviceAvailability = {
  id: string;
  deviceId: string;
  status: AvailabilityStatus;
  /** The ID of the current reservation holding this device (if any) */
  reservationId?: string;
  /** When the availability was last checked/updated */
  lastCheckedAt: Date;
  updatedAt: Date;
};

export type CreateDeviceAvailabilityParams = {
  deviceId: string;
  status?: AvailabilityStatus;
  reservationId?: string;
};

export type UpdateDeviceAvailabilityParams = {
  status?: AvailabilityStatus;
  reservationId?: string | null;
};

export class DeviceAvailabilityError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'DeviceAvailabilityError';
  }
}

const validateDeviceAvailability = (deviceId: string, status: AvailabilityStatus): void => {
  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
    throw new DeviceAvailabilityError('deviceId', 'Device ID must be a non-empty string.');
  }

  if (!Object.values(AvailabilityStatus).includes(status)) {
    throw new DeviceAvailabilityError('status', 'Status must be a valid AvailabilityStatus.');
  }
};

/**
 * Creates a new device availability record.
 * Devices default to Available status when first tracked.
 */
export function createDeviceAvailability(params: CreateDeviceAvailabilityParams): DeviceAvailability {
  const status = params.status ?? AvailabilityStatus.Available;
  validateDeviceAvailability(params.deviceId, status);

  const now = new Date();
  return {
    id: params.deviceId, // Use deviceId as the id for easy lookups
    deviceId: params.deviceId.trim(),
    status,
    reservationId: params.reservationId?.trim(),
    lastCheckedAt: now,
    updatedAt: now,
  };
}

/**
 * Updates an existing device availability record.
 */
export function updateDeviceAvailability(
  existing: DeviceAvailability,
  params: UpdateDeviceAvailabilityParams
): DeviceAvailability {
  const newStatus = params.status ?? existing.status;
  validateDeviceAvailability(existing.deviceId, newStatus);

  const now = new Date();
  return {
    ...existing,
    status: newStatus,
    // If reservationId is explicitly null, clear it; otherwise use new value or keep existing
    reservationId: params.reservationId === null ? undefined : (params.reservationId ?? existing.reservationId),
    lastCheckedAt: now,
    updatedAt: now,
  };
}

/**
 * Checks if a device is currently available for reservation.
 */
export function isDeviceAvailable(availability: DeviceAvailability): boolean {
  return availability.status === AvailabilityStatus.Available;
}
