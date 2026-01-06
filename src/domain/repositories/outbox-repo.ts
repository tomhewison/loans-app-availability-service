import { OutboxMessage } from '../entities/outbox-message';

/**
 * Repository interface for the transactional outbox.
 * Used to reliably publish events to Event Grid.
 */
export interface OutboxRepo {
  /**
   * Saves a new outbox message.
   */
  save(message: OutboxMessage): Promise<void>;

  /**
   * Lists unprocessed messages for publishing.
   * @param batchSize Maximum number of messages to return (default: 20)
   */
  listUnprocessed(batchSize?: number): Promise<OutboxMessage[]>;

  /**
   * Marks a message as successfully processed.
   */
  markAsProcessed(id: string): Promise<void>;

  /**
   * Marks a message as failed with an error message.
   * Increments the retry count.
   */
  markAsFailed(id: string, error: string): Promise<void>;
}
