import { AvailabilityRepo } from '../domain/repositories/availability-repo';
import { OutboxRepo } from '../domain/repositories/outbox-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';
import { CosmosAvailabilityRepo } from '../infra/adapters/cosmos-availability-repo';
import { CosmosOutboxRepo } from '../infra/adapters/cosmos-outbox-repo';
import { EventGridPublisher } from '../infra/adapters/event-grid-publisher';
import { OutboxEventPublisher } from '../infra/adapters/outbox-event-publisher';

let cachedAvailabilityRepo: AvailabilityRepo | undefined;
let cachedOutboxRepo: OutboxRepo | undefined;
let cachedEventPublisher: EventPublisher | undefined;
let cachedEventGridPublisher: EventPublisher | undefined;

/**
 * Gets or creates a singleton AvailabilityRepo instance.
 */
export const getAvailabilityRepo = (): AvailabilityRepo => {
  if (!cachedAvailabilityRepo) {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const databaseId = process.env.COSMOS_DATABASE_ID || 'availability-db';
    const containerId = process.env.COSMOS_AVAILABILITY_CONTAINER_ID || 'availability';
    const key = process.env.COSMOS_KEY;

    if (!endpoint) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    cachedAvailabilityRepo = new CosmosAvailabilityRepo({
      endpoint,
      key,
      databaseId,
      containerId,
    });
  }
  return cachedAvailabilityRepo;
};

/**
 * Gets or creates a singleton OutboxRepo instance.
 */
export const getOutboxRepo = (): OutboxRepo => {
  if (!cachedOutboxRepo) {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const databaseId = process.env.COSMOS_DATABASE_ID || 'availability-db';
    const containerId = process.env.COSMOS_OUTBOX_CONTAINER_ID || 'outbox';
    const key = process.env.COSMOS_KEY;

    if (!endpoint) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    cachedOutboxRepo = new CosmosOutboxRepo({
      endpoint,
      key,
      databaseId,
      containerId,
    });
  }
  return cachedOutboxRepo;
};

/**
 * Gets or creates a singleton EventGridPublisher instance.
 * This is the direct publisher used by the Outbox Processor.
 */
export const getEventGridPublisher = (): EventPublisher => {
  if (!cachedEventGridPublisher) {
    const topicEndpoint = process.env.EVENT_GRID_TOPIC_ENDPOINT || '';
    const key = process.env.EVENT_GRID_TOPIC_KEY || '';

    cachedEventGridPublisher = new EventGridPublisher({
      topicEndpoint,
      key,
    });
  }
  return cachedEventGridPublisher;
};

/**
 * Gets or creates a singleton OutboxEventPublisher instance.
 * This is used by the Application Layer to publish events via the Outbox pattern.
 */
export const getEventPublisher = (): EventPublisher => {
  if (!cachedEventPublisher) {
    cachedEventPublisher = new OutboxEventPublisher(getOutboxRepo());
  }
  return cachedEventPublisher;
};
