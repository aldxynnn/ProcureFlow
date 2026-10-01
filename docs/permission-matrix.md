# Permission Matrix

| Resource/action | Employee | Manager | Procurement | Finance | Admin |
|---|---:|---:|---:|---:|---:|
| Create own purchase request | ✓ | — | — | — | — |
| View role-scoped purchase requests | Own | Direct reports | Approved only | — | Tenant-wide |
| View direct-report purchase requests | — | ✓ | — | — | ✓ |
| View approved demand for sourcing | — | — | ✓ | — | ✓ |
| Submit own purchase request | ✓ | — | — | — | — |
| Approve/reject purchase request | — | ✓ | — | — | ✓ |
| View budgets | Own department/context | ✓ | ✓ | ✓ | ✓ |
| Create budgets | — | ✓ | — | ✓ | ✓ |
| Vendor directory | — | — | Manage | Read | Full |
| RFQs / quotations / selection | — | — | Full | — | Full |
| Purchase orders | — | Approve team POs | Create / issue / receive | View / approve | Full |
| Goods receipt | — | — | Full | — | Full |
| Invoice intake | — | — | Create | Create | Full |
| Invoice verify / approve / reject | — | — | — | Full | Full |
| Audit trail | — | ✓ | ✓ | ✓ | ✓ |
| Organization / user administration | — | — | — | — | Full |

## Ownership principle

Administration configures identities, reporting lines and organization structure. Operational roles execute the procurement workflow inside their own workspaces; Admin access is a fallback control plane, not the normal owner of every process.
