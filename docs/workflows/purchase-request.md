# Purchase Request Workflow

```text
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED
                               └──────→ REJECTED
DRAFT/SUBMITTED/PENDING_APPROVAL → CANCELLED
```

A user submits a draft. The service records the `DRAFT → SUBMITTED` transition and then immediately routes the request into `PENDING_APPROVAL` in the same database transaction so the approval queue cannot observe a half-routed request. Both logical transitions are written to the audit trail.

The API uses server-side checks for the transition, role and manager relationship. Approval decisions and state transitions are recorded in `AuditLog` and `Approval`.
