# API Conventions

Base path: `/api`

## Authentication

Access tokens are JWT bearer tokens. Refresh tokens are opaque, rotated tokens stored as HMAC hashes in PostgreSQL and delivered through an HttpOnly cookie.

## Resource naming

Resources use plural nouns:

- `/api/purchase-requests`
- `/api/rfqs`
- `/api/purchase-orders`
- `/api/goods-receipts/:poId`
- `/api/invoices`
- `/api/vendors`
- `/api/budgets`

## Errors

The API returns JSON with at least:

```json
{
  "statusCode": 400,
  "message": "...",
  "path": "/api/...",
  "timestamp": "..."
}
```

## Validation

Nest `ValidationPipe` is configured with whitelist/transform/forbidNonWhitelisted.

## Pagination and list bounds

The portfolio MVP uses bounded list reads (maximum 100 records in current list services). This keeps implementation simple while preventing unbounded reads. Cursor or page-based pagination can be introduced when requirements demand large datasets.

## Versioning

A version prefix is not used in the MVP because the API is a single deployed portfolio product with no public compatibility contract. The route structure can be moved behind `/api/v1` later without changing the domain model.

## OpenAPI

Swagger UI is available at `/docs`.
