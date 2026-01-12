import { CosmosClient } from '@azure/cosmos';

/**
 * Simple test script to verify Cosmos DB connectivity
 * 
 * Usage: node dist/src/seed/test-cosmos.js
 */
async function testCosmos() {
    console.log('🔍 Testing Cosmos DB connection...\n');

    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_AVAILABILITY_DATABASE_ID || 'availability-db';
    const containerId = process.env.COSMOS_AVAILABILITY_CONTAINER_ID || 'availability';

    console.log('Configuration:');
    console.log(`  Endpoint: ${endpoint ? endpoint.substring(0, 50) + '...' : 'NOT SET'}`);
    console.log(`  Key: ${key ? '***SET***' : 'NOT SET'}`);
    console.log(`  Database: ${databaseId}`);
    console.log(`  Container: ${containerId}`);
    console.log('');

    if (!endpoint || !key) {
        console.error('❌ COSMOS_ENDPOINT and COSMOS_KEY must be set!');
        process.exit(1);
    }

    try {
        console.log('📡 Creating Cosmos client...');
        const client = new CosmosClient({ endpoint, key });

        console.log('📂 Getting database...');
        const database = client.database(databaseId);

        console.log('📦 Getting container...');
        const container = database.container(containerId);

        console.log('📝 Attempting to upsert a test document...');
        const testDoc = {
            id: 'test-device-123',
            deviceId: 'test-device-123',
            status: 'Available',
            lastCheckedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const startTime = Date.now();
        const response = await container.items.upsert(testDoc);
        const duration = Date.now() - startTime;

        console.log(`✅ Upsert successful in ${duration}ms!`);
        console.log(`   Resource: ${JSON.stringify(response.resource)}`);

        console.log('\n🗑️ Cleaning up test document...');
        await container.item('test-device-123', 'test-device-123').delete();
        console.log('✅ Cleanup complete!');

        console.log('\n✅ Cosmos DB connection is working!');
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

testCosmos();
