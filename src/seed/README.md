# Seed Scripts

Scripts for populating the availability database with test data.

## Usage

```bash
# Build first
npm run build

# Seed availability records
node dist/src/seed/seed-availability.js
```

## Test Data

The test data mirrors the devices in the catalogue-service, creating availability records for each device with matching statuses.
