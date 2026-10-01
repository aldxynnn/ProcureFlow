# Final verification notes

## Role/workflow alignment

- Employee: own purchase requests and status tracking.
- Manager: direct-report approval queue plus eligible PO approvals.
- Procurement: sourcing, vendor master management, quote comparison, vendor selection, PO creation/issue and goods receipt.
- Finance: budget control and invoice verification/approval; PO visibility for spend context.
- Admin: tenant, user, role and department administration, with privileged oversight/control on operational records.

## Authorization controls added

- Purchase request creation is limited to Employee. Manager, Procurement and Finance are not treated as requesters.
- Purchase request submit is requester-only.
- Purchase request cancellation is requester-only.
- Procurement cannot approve requests through the API.
- Manager PO detail access is limited to their direct-report scope.
- Admin user management validates department, manager relationship, self-assignment and active direct reports.
- Deactivating a user revokes outstanding refresh tokens; inactive accounts cannot refresh a session.
- Employees are required to have an active Manager before they can be created/assigned.
- Direct URLs are checked against the same role route rules used by navigation.

## UI alignment

- Manager gets a real approval queue with Review / Approve / Reject actions.
- Procurement gets sourcing-first navigation and approved-demand context instead of a generic New Request CTA.
- Finance gets invoice/budget workspaces and read-only vendor/PO context where appropriate.
- Vendor creation is hidden for Finance because the API is read-only for that role.
- Administration is exposed only to Admin.
- PO attachment upload is disabled for Manager because that role has view/approval responsibility there.

## Static validation

- `node scripts/preflight.mjs` passes.
- TypeScript/TSX source parse validation passes with TypeScript 5.8.3.

Runtime builds and Docker execution should still be run on the target machine because this build environment does not provide the project's installed dependency tree or Docker daemon.
