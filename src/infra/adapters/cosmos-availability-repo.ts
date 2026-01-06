import { CosmosClient, Database, Container, SqlQuerySpec } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { DeviceAvailability, AvailabilityStatus } from '../../domain/entities/device-availability';
import { AvailabilityRepo } from '../../domain/repositories/availability-repo';
import { createLogger } from '../logging/logger';
import type { Logger } from '../logging/logger';

export type CosmosAvailabilityRepoOptions = {
  endpoint: string;
  key?: string;
  databaseId: string;
  containerId: string;
};

type AvailabilityDocument = {
  id: string;
  deviceId: string;
  status: AvailabilityStatus;
  reservationId?: string;
  lastCheckedAt: string; // ISO string
  updatedAt: string; // ISO string
};

export class CosmosAvailabilityRepo implements AvailabilityRepo {
  private readonly client: CosmosClient;
  private readonly database: Database;
  private readonly container: Container;
  private readonly log: Logger;

  constructor(private readonly options: CosmosAvailabilityRepoOptions) {
    this.log = createLogger({
      component: 'CosmosAvailabilityRepo',
      database: options.databaseId,
      container: options.containerId,
    });

    this.log.info('Initializing CosmosAvailabilityRepo', {
      endpoint: options.endpoint,
      authMethod: options.key ? 'key' : 'managed-identity',
    });

    if (options.key) {
      this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
    } else {
      this.client = new CosmosClient({ endpoint: options.endpoint, aadCredentials: new DefaultAzureCredential() });
    }
    this.database = this.client.database(options.databaseId);
    this.container = this.database.container(options.containerId);

    this.log.info('CosmosAvailabilityRepo initialized successfully');
  }

  public async save(availability: DeviceAvailability): Promise<DeviceAvailability> {
    const startTime = Date.now();
    this.log.info('Saving device availability', {
      deviceId: availability.deviceId,
      status: availability.status,
      reservationId: availability.reservationId,
    });

    try {
      const document = this.mapToDocument(availability);
      const response = await this.container.items.upsert<AvailabilityDocument>(document);
      const duration = Date.now() - startTime;

      if (!response.resource) {
        this.log.error('Upsert returned no resource', new Error('No resource returned'), { deviceId: availability.deviceId });
        throw new Error('Upsert returned no resource');
      }

      this.log.debug('Device availability saved', {
        deviceId: availability.deviceId,
        status: availability.status,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.Save', this.options.endpoint, duration, true);

      return this.mapToDomain(response.resource);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to save device availability', error as Error, { deviceId: availability.deviceId, durationMs: duration });
      this.log.trackDependency('CosmosDB.Save', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to save device availability', error);
    }
  }

  public async getByDeviceId(deviceId: string): Promise<DeviceAvailability | undefined> {
    const startTime = Date.now();
    this.log.debug('Getting device availability by device ID', { deviceId });

    try {
      // The id is the deviceId for easy lookups
      const { resource } = await this.container.item(deviceId, deviceId).read<AvailabilityDocument>();
      const duration = Date.now() - startTime;

      if (!resource) {
        this.log.debug('Device availability not found', { deviceId, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetByDeviceId', this.options.endpoint, duration, true, { found: false });
        return undefined;
      }

      this.log.debug('Device availability retrieved successfully', { deviceId, durationMs: duration });
      this.log.trackDependency('CosmosDB.GetByDeviceId', this.options.endpoint, duration, true, { found: true });

      return this.mapToDomain(resource);
    } catch (error) {
      if (this.isNotFound(error)) {
        const duration = Date.now() - startTime;
        this.log.debug('Device availability not found (404)', { deviceId, durationMs: duration });
        return undefined;
      }

      // Fallback to query
      this.log.debug('Falling back to query for device availability', { deviceId });

      try {
        const query: SqlQuerySpec = {
          query: 'SELECT TOP 1 * FROM c WHERE c.deviceId = @deviceId',
          parameters: [{ name: '@deviceId', value: deviceId }],
        };
        const { resources } = await this.container.items.query<AvailabilityDocument>(query).fetchAll();
        const duration = Date.now() - startTime;

        if (!resources || resources.length === 0) {
          this.log.debug('Device availability not found (query)', { deviceId, durationMs: duration });
          return undefined;
        }

        this.log.debug('Device availability retrieved via query', { deviceId, durationMs: duration });
        return this.mapToDomain(resources[0]);
      } catch (inner) {
        const duration = Date.now() - startTime;
        this.log.error('Failed to get device availability by device ID', inner as Error, { deviceId, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetByDeviceId', this.options.endpoint, duration, false);
        throw this.wrapError('Failed to get device availability by device ID', inner);
      }
    }
  }

  public async getByDeviceIds(deviceIds: string[]): Promise<DeviceAvailability[]> {
    if (deviceIds.length === 0) {
      return [];
    }

    const startTime = Date.now();
    this.log.debug('Getting device availability for multiple devices', { count: deviceIds.length });

    try {
      // Build parameterized query for multiple IDs
      const paramNames = deviceIds.map((_, i) => `@id${i}`);
      const query: SqlQuerySpec = {
        query: `SELECT * FROM c WHERE c.deviceId IN (${paramNames.join(', ')})`,
        parameters: deviceIds.map((id, i) => ({ name: `@id${i}`, value: id })),
      };

      const { resources } = await this.container.items.query<AvailabilityDocument>(query).fetchAll();
      const duration = Date.now() - startTime;
      const count = resources?.length ?? 0;

      this.log.debug('Device availability records retrieved', { requestedCount: deviceIds.length, foundCount: count, durationMs: duration });
      this.log.trackDependency('CosmosDB.GetByDeviceIds', this.options.endpoint, duration, true, { count });

      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to get device availability by device IDs', error as Error, { count: deviceIds.length, durationMs: duration });
      this.log.trackDependency('CosmosDB.GetByDeviceIds', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to get device availability by device IDs', error);
    }
  }

  public async delete(deviceId: string): Promise<void> {
    const startTime = Date.now();
    this.log.info('Deleting device availability', { deviceId });

    try {
      await this.container.item(deviceId, deviceId).delete();
      const duration = Date.now() - startTime;

      this.log.debug('Device availability deleted', { deviceId, durationMs: duration });
      this.log.trackDependency('CosmosDB.Delete', this.options.endpoint, duration, true);
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.isNotFound(error)) {
        this.log.debug('Device availability not found for deletion (idempotent)', { deviceId, durationMs: duration });
        return; // idempotent delete
      }

      this.log.error('Failed to delete device availability', error as Error, { deviceId, durationMs: duration });
      this.log.trackDependency('CosmosDB.Delete', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to delete device availability', error);
    }
  }

  private mapToDocument(availability: DeviceAvailability): AvailabilityDocument {
    return {
      id: availability.id,
      deviceId: availability.deviceId,
      status: availability.status,
      reservationId: availability.reservationId,
      lastCheckedAt: availability.lastCheckedAt.toISOString(),
      updatedAt: availability.updatedAt.toISOString(),
    };
  }

  private mapToDomain(document: AvailabilityDocument): DeviceAvailability {
    // Validate required fields
    if (!document.id) {
      this.log.error('Availability document missing id field', new Error('Missing id'));
      throw new Error('Availability document missing required field: id');
    }
    if (!document.deviceId) {
      throw new Error('Availability document missing required field: deviceId');
    }
    if (!document.status) {
      throw new Error('Availability document missing required field: status');
    }
    if (!document.lastCheckedAt) {
      throw new Error('Availability document missing required field: lastCheckedAt');
    }
    if (!document.updatedAt) {
      throw new Error('Availability document missing required field: updatedAt');
    }

    const lastCheckedAt = new Date(document.lastCheckedAt);
    if (Number.isNaN(lastCheckedAt.getTime())) {
      throw new Error(`Invalid lastCheckedAt value from Cosmos DB: ${document.lastCheckedAt}`);
    }

    const updatedAt = new Date(document.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error(`Invalid updatedAt value from Cosmos DB: ${document.updatedAt}`);
    }

    return {
      id: document.id,
      deviceId: document.deviceId,
      status: document.status,
      reservationId: document.reservationId,
      lastCheckedAt,
      updatedAt,
    };
  }

  private wrapError(message: string, error: unknown): Error {
    if (error instanceof Error) {
      return new Error(`${message}: ${error.message}`);
    }
    return new Error(`${message}: ${String(error)}`);
  }

  private isNotFound(error: unknown): boolean {
    const anyErr = error as { code?: number; statusCode?: number } | undefined;
    const code = anyErr?.code ?? anyErr?.statusCode;
    return code === 404;
  }
}
