# Device Availability Service

Azure Functions microservice for managing device availability following Clean Architecture principles.

## Project Structure

```
src/
├── domain/           # Core business logic and entities
├── app/             # Application use cases (business workflows)
├── infra/           # Infrastructure adapters (database, external services)
├── functions/       # Azure Functions HTTP triggers
└── config/          # Dependency injection and configuration
```

## Development Commands

- `npm run build` - Compile TypeScript
- `npm run start` - Start Azure Functions runtime
- `npm run clean` - Clean build artifacts

## Environment Variables

### Required
- `COSMOS_ENDPOINT` - Azure Cosmos DB endpoint URL
- `COSMOS_KEY` - Azure Cosmos DB access key
- `AUTH0_DOMAIN` - Auth0 domain (e.g., `your-tenant.auth0.com` or `your-tenant.us.auth0.com`)
- `AUTH0_AUDIENCE` - Auth0 API identifier/audience (the API identifier configured in Auth0)

### Optional
- `COSMOS_DATABASE_ID` - Cosmos DB database ID (default: `availability-db`)
- `COSMOS_CONTAINER_ID` - Cosmos DB container ID (default: `devices`)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins (default: `http://localhost:5173,http://localhost:3000`)

