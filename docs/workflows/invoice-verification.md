# Invoice Verification Workflow

```text
SUBMITTED
  → MATCHING
  → VERIFIED / DISCREPANCY
  → APPROVED / REJECTED
```

The MVP compares invoice lines against PO unit prices and cumulative received quantities. A discrepancy is persisted as structured JSON text for the prototype so finance can inspect the reason.

The project intentionally does not implement payments or accounting ledger behavior.
