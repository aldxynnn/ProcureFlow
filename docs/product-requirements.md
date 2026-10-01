# Product Requirements — ProcureFlow

## 1. Product Overview

### Vision

Give growing organizations one traceable workflow from internal purchase request to verified supplier invoice.

### Problem statement

Procurement work often crosses spreadsheets, email, chat and document attachments. This fragments approval history, sourcing comparisons, receipt evidence and invoice verification. ProcureFlow provides a single auditable workflow.

## 2. Scope

### MVP goals

- multi-tenant procurement lifecycle;
- lightweight budget control;
- role-based access;
- auditable workflow transitions;
- partial/full goods receipt;
- three-way invoice verification;
- secure document attachment path;
- basic notifications and reminders.

### Non-goals

No payment execution, general ledger, ERP integration, vendor portal accounts, advanced workflow builder, accounting-grade tax engine or AI automation.

## 3. Personas

- Employee / Requester
- Manager / Approver
- Procurement Specialist
- Finance Analyst
- Organization Admin

## 4. Roles

| Role | Primary responsibilities |
|---|---|
| EMPLOYEE | Create/submit own requests, track status |
| MANAGER | Review direct-report approvals |
| PROCUREMENT | Vendors, RFQs, quotes, selection, POs, receipts |
| FINANCE | Invoices, matching, verification, approval |
| ADMIN | Organization/user administration |

## 5. Golden Workflow

`Purchase Request → Approval → RFQ → Vendor Quotes → Comparison → Vendor Selection → Purchase Order → Goods Receipt → Invoice → Three-Way Match → Completed`

## 6. Core business rules

- requester cannot approve own request;
- manager scope is based on manager relationship and organization;
- rejection requires a reason;
- every material state transition is audited;
- only approved PRs can create RFQs;
- only RFQ quotes for the current organization can be selected;
- only selected quotes can produce a PO;
- a PO cannot be received beyond ordered quantity;
- PO issuance reserves procurement budget commitment where a budget is attached;
- invoice vendor must match the PO vendor;
- cumulative invoice quantity cannot exceed received quantity without becoming a discrepancy;
- invoice unit price must match the PO unit price for an automatic match;
- invoice approval releases its committed budget amount and increments verified spend.

## 7. MVP acceptance flow

A provisioned user must be able to:

1. log in;
2. create and submit a purchase request;
3. have a manager approve it;
4. procurement creates an RFQ;
5. procurement records at least two vendor quotes;
6. procurement compares and selects a quote;
7. procurement creates and issues a PO;
8. procurement records partial then full receipt;
9. finance records an invoice;
10. the system computes three-way match;
11. finance approves a clean invoice;
12. audit history shows the critical actions.
