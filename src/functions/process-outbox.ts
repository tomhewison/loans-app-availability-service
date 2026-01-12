import { app, InvocationContext, Timer } from '@azure/functions';
import { getOutboxRepo, getEventGridPublisher } from '../config/appServices';

/**
 * Timer-triggered function to process outbox messages.
 * Implements the transactional outbox pattern for reliable event publishing.
 * 
 * The outbox pattern ensures that domain events are reliably published even
 * if the initial publish attempt fails. Events are first written to the outbox
 * table as part of the same transaction that updates the domain, then this
 * function periodically processes and publishes them.
 */
export async function processOutbox(myTimer: Timer, context: InvocationContext): Promise<void> {
    const outboxRepo = getOutboxRepo();
    const eventGridPublisher = getEventGridPublisher();

    // Check if EventGrid is configured
    const isEventGridConfigured = process.env.EVENT_GRID_TOPIC_ENDPOINT && process.env.EVENT_GRID_TOPIC_KEY;
    if (!isEventGridConfigured) {
        context.log('[process-outbox] EventGrid not configured - outbox messages will accumulate but not be published');
    }

    try {
        const messages = await outboxRepo.listUnprocessed(20); // Process 20 at a time

        if (messages.length === 0) {
            return;
        }

        context.log(`[process-outbox] Processing ${messages.length} outbox messages...`);

        for (const message of messages) {
            try {
                await eventGridPublisher.publish(
                    message.topic,
                    message.eventType,
                    message.subject,
                    message.data,
                    message.dataVersion
                );

                await outboxRepo.markAsProcessed(message.id);
                context.log(`[process-outbox] Successfully processed message ${message.id} (${message.eventType})`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                context.error(`[process-outbox] Failed to process message ${message.id}:`, error);
                await outboxRepo.markAsFailed(message.id, errorMessage);
            }
        }

        context.log(`[process-outbox] Finished processing outbox messages`);
    } catch (error) {
        context.error('[process-outbox] Error in processOutbox:', error);
    }
}

// Timer trigger to process outbox messages every 5 minutes (NCRONTAB format)
app.timer('processOutbox', {
    schedule: '0 */5 * * * *',
    handler: processOutbox,
});
