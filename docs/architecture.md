# Architecture

## Decision

ProcureFlow uses a **modular monolith**. The codebase is split by business capability but deployed as one API service.

## Modules

- Auth & Users
- Vendors
- Purchase Requests & Approvals
- RFQs & Quotes
- Purchase Orders
- Goods Receipts
- Invoices & Three-Way Matching
- Budgets
- Notifications
- Audit
- Attachments
- Background Jobs
- Dashboard

## Request path

```text
Browser
  -> Next.js UI
  -> REST API
  -> NestJS controller
  -> domain service
  -> Prisma/PostgreSQL
```

Authentication identifies a user and organization. Domain services then enforce role and resource-scope rules. Persistence uses tenant-scoped queries.

## Why modular monolith

This product has several strong domain boundaries, but the portfolio-scale deployment has no requirement for independent scaling or independent release trains. A modular monolith keeps transaction boundaries simple and eliminates distributed consistency/operational overhead.

## Async path

```text
HTTP request
  -> transactional state change
  -> enqueue BullMQ job
  -> Redis
  -> worker
  -> notification/audit side effect
```

The queue is used for delayed or non-blocking work such as approval reminders and RFQ deadline reminders.
