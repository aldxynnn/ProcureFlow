# ProcureFlow

ProcureFlow is a web-first, multi-tenant Procurement & Spend Management Platform built as a serious portfolio-grade software product.

## Product scope

Golden path:

`Purchase Request → Approval → RFQ → Quotes → Vendor Selection → Purchase Order → Goods Receipt → Invoice Verification`

The MVP deliberately excludes payment processing, general ledger/accounting, vendor portal accounts, ERP integration, advanced workflow builders, and AI features.

## Architecture

```text
Next.js / React / TypeScript
          │
          │ REST / JSON
          ▼
NestJS Modular Monolith
  ├─ Auth / RBAC / Tenancy
  ├─ Procurement domains
  ├─ Invoice verification
  ├─ Notifications / Audit
  └─ Background jobs
          │
     ┌────┴─────┐
     ▼          ▼
PostgreSQL   Redis/BullMQ
     │
     └──────────────► S3 (document storage)
```

See `docs/architecture.md`, `docs/database.md`, `docs/api.md`, `docs/security.md`, `docs/workflows/`, and `docs/decisions/`.

## Local setup

1. For local-only development, the included Compose defaults are sufficient; copy `.env.example` to `.env` only when you want to override them.
2. Keep `STORAGE_DRIVER=local` for local document uploads.
3. From this repository root, run `docker compose up --build`. The API container applies committed Prisma migrations and starts without creating any organization or user data.
4. Open `http://localhost:3000`. On the first run, complete the workspace setup form to create the real organization, first department, and first administrator.
5. Open `http://localhost:4000/docs` for the API. Configure managers, employees, procurement, finance users, budgets, and vendors from the application before processing live procurement work.
6. To start over from an empty local database, stop Compose and run `docker compose down -v`, then run `docker compose up --build` again.

## Production storage

Set `STORAGE_DRIVER=s3` and provide S3-compatible AWS credentials/bucket configuration. Object keys are always prefixed by tenant ID; downloads use short-lived signed URLs. No credentials are committed to the repository.

## Quality gates

The CI workflow runs install, lint, typecheck, backend/frontend unit tests, Prisma migrations, API integration/e2e tests, and production builds. Playwright covers the browser authentication smoke path; the API e2e suite covers the full procurement golden path.

## Engineering position

This repository intentionally uses a modular monolith. Microservices, Kubernetes, Kafka, GraphQL, Elasticsearch, MongoDB, gRPC, and Terraform are not used because the current domain does not justify their operational complexity.

## Environment notes

This repository is delivered with source, committed migrations, tests, Dockerfiles, and CI configuration. No demo accounts or seeded business records are created at runtime. External runtime credentials are intentionally not committed. The included `.env.example` files are the only values you should normally need to complete for a real AWS/S3 deployment.

## Known limitations

- single organization membership per user in MVP;
- vendors are managed as external parties, not authenticated application users;
- tax handling is intentionally simple;
- no payment execution or accounting ledger;
- budget figures are procurement-control figures, not accounting truth;
- local storage is a development adapter, not a production document store;
- login/API rate limiting is not yet implemented; observability is intentionally basic and not a full production SRE platform.
