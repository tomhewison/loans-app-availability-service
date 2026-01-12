import { getAvailabilityRepo } from '../config/appServices';
import { generateTestAvailability } from './test-availability';

/**
 * Seed script for populating availability records in the database
 * 
 * Usage: npm run build && node dist/src/seed/seed-availability.js
 */
async function seedAvailability() {
    console.log('🌱 Starting availability seeding...\n');

    const availabilityRepo = getAvailabilityRepo();
    const records = generateTestAvailability();

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
        try {
            await availabilityRepo.save(record);
            console.log(`✅ Created availability: ${record.deviceId} (${record.status})`);
            successCount++;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`❌ Failed to create availability for ${record.deviceId}: ${message}`);
            errorCount++;
        }
    }

    console.log('\n=== Seeding Summary ===');
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${records.length}`);

    if (errorCount > 0) {
        process.exit(1);
    } else {
        console.log('\n✅ Availability seeding completed successfully!');
    }
}

// Run if executed directly
if (require.main === module) {
    seedAvailability().catch((error) => {
        console.error('Fatal error during seeding:', error);
        process.exit(1);
    });
}

export { seedAvailability };
