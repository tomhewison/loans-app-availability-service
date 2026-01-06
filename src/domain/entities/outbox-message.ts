/**
 * Represents a message in the outbox for reliable event publishing.
 * Uses the transactional outbox pattern to ensure events are published reliably.
 */
export type OutboxMessage = {
  id: string;
  topic: string;
  eventType: string;
  subject: string;
  data: unknown;
  dataVersion: string;
  eventTime: Date;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  retryCount: number;
};

/**
 * Event types published by the Availability Service.
 */
export const AvailabilityEventTypes = {
  AvailabilityChanged: 'Availability.Changed',
  AvailabilityChecked: 'Availability.Checked',
} as const;

export type AvailabilityEventType = typeof AvailabilityEventTypes[keyof typeof AvailabilityEventTypes];
