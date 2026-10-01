"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { PageHeader } from "../../../components/page-header";
import { Table, Th, Td } from "../../../components/table";
import {
  EmptyNotice,
  ErrorNotice,
} from "../../../components/notice";
import { ShieldIcon } from "../../../components/icons";

function formatAuditValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}

export default function AuditPage() {
  const q = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.audit(),
  });

  const rows = q.data ?? [];

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Governance / Traceability"
        title="Audit trail"
        description="A chronological record of who changed what, on which resource, and when."
        meta={
          <span className="pf-badge pf-badge-success">
            <span className="pf-badge-dot" />
            Immutable business history
          </span>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="pf-panel min-w-0 p-4">
          <div className="pf-label">
            Events
          </div>

          <div className="mt-2 text-[22px] font-[760] tracking-[-.04em]">
            {rows.length}
          </div>

          <div className="mt-1 text-[9.5px] text-slate-400">
            Visible audit scope
          </div>
        </div>

        <div className="pf-panel min-w-0 p-4">
          <div className="pf-label">
            Coverage
          </div>

          <div className="mt-2 text-[12px] font-bold">
            Who · What · When
          </div>

          <div className="mt-1 text-[9.5px] text-slate-400">
            Resource-level history
          </div>
        </div>

        <div className="pf-panel min-w-0 p-4">
          <div className="pf-label">
            Tenant
          </div>

          <div className="mt-2 flex items-center gap-2 text-[12px] font-bold">
            <span className="pf-kpi-icon">
              <ShieldIcon size={13} />
            </span>

            Organization scoped
          </div>
        </div>
      </div>

      {q.error ? (
        <ErrorNotice
          message={q.error.message}
        />
      ) : q.isLoading ? (
        <div className="p-2 text-[11px] text-slate-500">
          Loading audit events…
        </div>
      ) : !rows.length ? (
        <EmptyNotice>
          No audit events yet.
        </EmptyNotice>
      ) : (
        <section className="pf-panel min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <div className="pf-card-title">
              Event ledger
            </div>

            <div className="pf-card-subtitle">
              Newest activity appears first.
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1120px]">
              <Table>
                <thead>
                  <tr>
                    <Th>
                      Timestamp
                    </Th>

                    <Th>
                      Actor
                    </Th>

                    <Th>
                      Action
                    </Th>

                    <Th>
                      Resource
                    </Th>

                    <Th>
                      Previous
                    </Th>

                    <Th>
                      New
                    </Th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((a: any) => {
                    const oldValue =
                      formatAuditValue(
                        a.oldValueJson,
                      );

                    const newValue =
                      formatAuditValue(
                        a.newValueJson,
                      );

                    return (
                      <tr key={a.id}>
                        <Td className="align-top whitespace-nowrap text-slate-500">
                          <div className="text-[10px] leading-5">
                            {new Date(
                              a.createdAt,
                            ).toLocaleString()}
                          </div>
                        </Td>

                        <Td className="align-top">
                          <div className="max-w-[150px] break-words font-medium leading-5 text-slate-700">
                            {a.actor?.name ??
                              "System"}
                          </div>
                        </Td>

                        <Td className="align-top">
                          <div className="max-w-[190px] break-words font-semibold leading-5 text-slate-800">
                            {a.action}
                          </div>
                        </Td>

                        <Td className="align-top">
                          <div className="max-w-[180px] break-words font-semibold leading-5 text-slate-800">
                            {a.entityType}
                          </div>

                          <div className="mt-1 max-w-[180px] break-all font-mono text-[8.5px] leading-4 text-slate-400">
                            {a.entityId}
                          </div>
                        </Td>

                        <Td className="align-top">
                          {a.oldValueJson ? (
                            <pre
                              className="m-0 w-[210px] max-w-[210px] overflow-hidden whitespace-pre-wrap break-words font-mono text-[9px] leading-[1.55] text-slate-500"
                              style={{
                                overflowWrap:
                                  "anywhere",
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {oldValue}
                            </pre>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                        </Td>

                        <Td className="align-top">
                          {a.newValueJson ? (
                            <pre
                              className="m-0 w-[250px] max-w-[250px] overflow-hidden whitespace-pre-wrap break-words font-mono text-[9px] leading-[1.55] text-slate-700"
                              style={{
                                overflowWrap:
                                  "anywhere",
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {newValue}
                            </pre>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}