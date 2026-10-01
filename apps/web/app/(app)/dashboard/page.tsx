'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/badge';
import { Table, Th, Td } from '../../../components/table';
import { ErrorNotice, EmptyNotice } from '../../../components/notice';
import {
  ArrowUpRightIcon,
  BuildingIcon,
  CheckIcon,
  FileTextIcon,
  ReceiptIcon,
  RepeatIcon,
  ShoppingCartIcon,
  ShieldIcon,
  WalletIcon,
} from '../../../components/icons';
import { formatCurrency, formatDate } from '../../../lib/format';

const roleCopy: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
    primary: [string, string];
  }
> = {
  EMPLOYEE: {
    eyebrow: 'Employee / My work',
    title: 'My procurement requests',
    description:
      'Track the requests you own, their approval state and the next action required from your manager or procurement.',
    primary: ['/requests/new', 'Create purchase request'],
  },
  MANAGER: {
    eyebrow: 'Manager / Approvals',
    title: 'Approval workspace',
    description:
      'Review direct-report requests and eligible purchase orders without stepping into administration or sourcing tasks.',
    primary: ['/requests', 'Review approvals'],
  },
  PROCUREMENT: {
    eyebrow: 'Procurement / Source & buy',
    title: 'Sourcing workspace',
    description:
      'Move approved demand through suppliers, quotations, purchase orders and goods receipt.',
    primary: ['/rfqs', 'Open sourcing'],
  },
  FINANCE: {
    eyebrow: 'Finance / Spend control',
    title: 'Finance workspace',
    description:
      'Control budgets and invoice verification. Purchase orders remain visible for context; procurement execution stays with Procurement.',
    primary: ['/invoices', 'Review invoices'],
  },
  ADMIN: {
    eyebrow: 'Administration / Control plane',
    title: 'Organization workspace',
    description:
      'Monitor the tenant and maintain the configuration that other roles depend on. Operational work remains assigned to the business roles.',
    primary: ['/settings', 'Open administration'],
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard,
  });

  if (q.isLoading) {
    return (
      <div className="pf-loading-screen">
        <div className="pf-spinner" />
        Loading dashboard
      </div>
    );
  }

  if (q.error) {
    return <ErrorNotice message={q.error.message} />;
  }

  const d = q.data;
  const copy = roleCopy[d.role] ?? roleCopy.EMPLOYEE;
  const budget = d.budgets?.[0];
  const allocated = budget ? Number(budget.allocatedCents) : 0;
  const committed = budget ? Number(budget.committedCents) : 0;
  const budgetPct = allocated
    ? Math.min(100, Math.round((committed / allocated) * 100))
    : 0;

  const kpis =
    d.role === 'EMPLOYEE'
      ? [
          [
            'My requests',
            d.metrics.visibleRequests,
            FileTextIcon,
            'Requests in your scope',
          ],
          [
            'Awaiting approval',
            d.metrics.pendingApprovals,
            CheckIcon,
            'Waiting for manager decision',
          ],
          [
            'Approved',
            d.metrics.approvedRequests,
            ShieldIcon,
            'Ready for sourcing',
          ],
        ]
      : d.role === 'MANAGER'
        ? [
            [
              'Pending approvals',
              d.metrics.pendingApprovals,
              CheckIcon,
              'Direct-report decisions',
            ],
            [
              'Team requests',
              d.metrics.visibleRequests,
              FileTextIcon,
              'Your approval scope',
            ],
            [
              'POs to approve',
              d.metrics.pendingPurchaseOrders,
              ShoppingCartIcon,
              'Eligible purchase orders',
            ],
          ]
        : d.role === 'PROCUREMENT'
          ? [
              [
                'Open RFQs',
                d.metrics.openRfqs,
                RepeatIcon,
                'Active sourcing events',
              ],
              [
                'Quotes to review',
                d.metrics.quotesAwaitingAction,
                BuildingIcon,
                'Commercial comparison',
              ],
              [
                'Receipts due',
                d.metrics.receiptsDue,
                ReceiptIcon,
                'Issued orders with open quantity',
              ],
              [
                'Active POs',
                d.metrics.activePurchaseOrders,
                ShoppingCartIcon,
                'Orders in motion',
              ],
            ]
          : d.role === 'FINANCE'
            ? [
                [
                  'Invoices needing attention',
                  d.metrics.invoicesNeedingAttention,
                  ReceiptIcon,
                  'Submit / verify / resolve',
                ],
                [
                  'POs in motion',
                  d.metrics.activePurchaseOrders,
                  ShoppingCartIcon,
                  'Spend context',
                ],
                [
                  'Budgets',
                  d.metrics.budgetCount,
                  WalletIcon,
                  'Configured spend controls',
                ],
              ]
            : [
                [
                  'Users',
                  d.metrics.userCount,
                  ShieldIcon,
                  'Organization identities',
                ],
                [
                  'Open RFQs',
                  d.metrics.openRfqs,
                  RepeatIcon,
                  'Sourcing events in flight',
                ],
                [
                  'Invoices attention',
                  d.metrics.invoicesNeedingAttention,
                  ReceiptIcon,
                  'Finance exceptions / verification',
                ],
                [
                  'Budgets',
                  d.metrics.budgetCount,
                  WalletIcon,
                  'Configured spend controls',
                ],
              ];

  return (
    <div>
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        action={
          <Link
            href={copy.primary[0]}
            className="pf-btn pf-btn-primary"
          >
            <span>{copy.primary[1]}</span>
            <ArrowUpRightIcon size={14} />
          </Link>
        }
      />

      <section
        className={`pf-kpi-grid mb-5 ${
          kpis.length === 3 ? 'xl:grid-cols-3' : ''
        }`}
      >
        {kpis.map(([label, value, Icon, note]: any) => (
          <div className="pf-kpi" key={label}>
            <div className="pf-kpi-top">
              <span className="pf-kpi-label">{label}</span>
              <span className="pf-kpi-icon">
                <Icon size={15} />
              </span>
            </div>
            <div className="pf-kpi-value">{value}</div>
            <div className="pf-kpi-note">{note}</div>
          </div>
        ))}
      </section>

      <section className="pf-panel mb-5 p-5">
        <div className="pf-section-head">
          <div>
            <div className="pf-card-title">Role responsibilities</div>
            <div className="pf-card-subtitle">
              The workspace is intentionally shaped around the job this role
              performs.
            </div>
          </div>
          <StatusBadge value={d.role} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(d.responsibilities ?? []).map((item: string) => (
            <div
              key={item}
              className="pf-panel-soft flex items-start gap-3 p-4"
            >
              <span className="pf-step-dot">
                <CheckIcon size={13} />
              </span>
              <span className="text-[10.5px] leading-5 text-slate-700">
                {item}
              </span>
            </div>
          ))}
        </div>
      </section>

      {d.role === 'FINANCE' || d.role === 'ADMIN' ? (
        <section className="pf-panel mb-5 p-5">
          <div className="pf-section-head">
            <div>
              <div className="pf-card-title">
                Spend control snapshot
              </div>
              <div className="pf-card-subtitle">
                Operational budget data only; this is not an accounting
                balance.
              </div>
            </div>
            <WalletIcon size={15} className="text-slate-400" />
          </div>

          {budget ? (
            <>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="pf-label">{budget.name}</div>
                  <div className="mt-1 text-[20px] font-[760]">
                    {formatCurrency(committed)}
                  </div>
                  <div className="mt-1 text-[9.5px] text-slate-400">
                    committed of {formatCurrency(allocated)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="pf-label">Utilization</div>
                  <div className="mt-1 text-[18px] font-bold">
                    {budgetPct}%
                  </div>
                </div>
              </div>

              <div className="pf-progress mt-4">
                <span style={{ width: `${budgetPct}%` }} />
              </div>
            </>
          ) : (
            <EmptyNotice>No budgets configured yet.</EmptyNotice>
          )}
        </section>
      ) : null}

      <section className="pf-panel overflow-hidden">
        <div className="p-5 pb-4">
          <div className="pf-section-head mb-0">
            <div>
              <div className="pf-card-title">
                Recent purchase requests
              </div>
              <div className="pf-card-subtitle">
                Only requests within the current role visibility scope are
                shown.
              </div>
            </div>

            {d.role !== 'FINANCE' ? (
              <Link
                className="pf-link inline-flex items-center gap-1"
                href="/requests"
              >
                Open register <ArrowUpRightIcon size={12} />
              </Link>
            ) : null}
          </div>
        </div>

        {d.recentRequests?.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Request</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>

            <tbody>
              {d.recentRequests.map((r: any) => (
                <tr key={r.id}>
                  <Td>
                    <Link
                      href={`/requests/${r.id}`}
                      className="font-semibold text-slate-900 hover:text-[#0d4f67]"
                    >
                      {r.title}
                    </Link>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {r.department.name}
                    </div>
                  </Td>

                  <Td>{r.requester.name}</Td>

                  <Td>
                    <StatusBadge value={r.status} />
                  </Td>

                  <Td className="whitespace-nowrap text-slate-500">
                    {formatDate(r.createdAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="p-4">
            <EmptyNotice>
              {d.role === 'FINANCE'
                ? 'Invoice control is your active queue. No request register is shown here.'
                : 'No requests are currently visible in this workspace.'}
            </EmptyNotice>
          </div>
        )}
      </section>
    </div>
  );
}