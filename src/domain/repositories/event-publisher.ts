/**
 * Interface for publishing events.
 * Can be implemented by direct Event Grid publishing or via the outbox pattern.
 */
export interface EventPublisher {
  /**
   * Publishes a single event.
   */
  publish(
    topic: string,
    eventType: string,
    subject: string,
    data: unknown,
    dataVersion?: string
  ): Promise<void>;

  /**
   * Publishes multiple events as a batch.
   */
  publishBatch(
    events: {
      topic: string;
      eventType: string;
      subject: string;
      data: unknown;
      dataVersion?: string;
    }[]
  ): Promise<void>;
}
