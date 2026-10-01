# Engineering Evidence Map

This document maps product behavior to engineering evidence a reviewer can inspect in the repository.

| Engineering capability | Concrete evidence |
| --- | --- |
| Domain modeling | Separate modules and stateful entities for PR, RFQ, Quote, PO, Receipt and Invoice |
| REST API design | Controller/resource conventions in `apps/api/src/modules` and Swagger at `/docs` |
| RBAC | `JwtGuard`, `RolesGuard`, role-scoped controllers and resource-level checks |
| Multi-tenancy | `organizationId` constraints on business data, services and attachments |
| Transactions | PR approval, PO issuance/budget commitment, goods receipt, invoice match/approval |
| Concurrency awareness | `FOR UPDATE` locking on PO and Budget rows before critical checks |
| Auditability | `AuditService` records actor, entity, old/new values and timestamped actions |
| Async processing | BullMQ jobs for approval reminders using Redis |
| Object storage | S3 adapter with tenant-prefixed object keys and signed download URLs |
| Testing | Unit tests plus the API golden-path E2E and browser login smoke test |
| CI/CD | GitHub Actions quality gates and AWS/ECR/ECS deployment workflow |
| Documentation | Product requirements, workflows, architecture, database, security and ADRs |

## Interview checklist

A candidate maintaining this repository should be able to explain, without reading generated code during the interview:

1. why a modular monolith was selected;
2. how tenant isolation is enforced at every data access boundary;
3. why money uses integer cents and quantity uses decimal precision;
4. why PO issuance and budget commitment are atomic;
5. how concurrent goods receipts are prevented from over-receiving;
6. how three-way matching treats partial receipts and cumulative invoices;
7. why reminder jobs are asynchronous;
8. why large documents live in object storage rather than PostgreSQL;
9. what the known security limitations are;
10. which MVP boundaries are intentionally deferred.
