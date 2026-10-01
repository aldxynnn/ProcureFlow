# Database Engineering

PostgreSQL is the system of record.

## Principles

- Monetary values are stored in integer cents (`BIGINT`) to avoid floating-point money arithmetic.
- Quantities are `DECIMAL(18,4)` where fractional quantities may be relevant.
- Foreign keys protect referential integrity.
- Unique constraints prevent duplicate organization-scoped business identifiers.
- Composite indexes support tenant + workflow-state list queries.
- Historical business records are not deleted as part of normal workflow transitions.
- Large binary document content is not stored in PostgreSQL; only metadata/reference is stored in `Attachment`.

## Tenant isolation

Most business entities carry `organizationId`. Application services always scope reads/writes to the authenticated organization.

The attachment object key also starts with the organization ID.

## Transactions

Transactions are used when multiple records must move together:

- approval decision + approval record;
- PO issuance + budget commitment;
- goods receipt + received quantities + PO status;
- invoice approval + budget commitment release + verified spend;
- three-way matching while locking the related PO to reduce concurrent over-invoice races.

## Concurrency

Two examples are intentionally modeled:

1. **Goods receipt:** the PO row is locked before checking remaining quantity and updating received quantities.
2. **Budget commitment:** the budget row is locked before checking available funds and increasing commitment.

These are portfolio-level controls, not a claim of accounting-grade correctness.
