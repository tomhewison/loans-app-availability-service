import { DeviceAvailability } from '../entities/device-availability';

/**
 * Repository interface for device availability records.
 * The availability-service is the source of truth for device availability.
 */
export interface AvailabilityRepo {
  /**
   * Saves a device availability record (create or update).
   */
  save(availability: DeviceAvailability): Promise<DeviceAvailability>;

  /**
   * Gets a device availability record by device ID.
   * Returns undefined if no record exists for this device.
   */
  getByDeviceId(deviceId: string): Promise<DeviceAvailability | undefined>;

  /**
   * Gets multiple device availability records by device IDs.
   */
  getByDeviceIds(deviceIds: string[]): Promise<DeviceAvailability[]>;

  /**
   * Deletes a device availability record.
   */
  delete(deviceId: string): Promise<void>;
}
