"use client";

import { FormEvent, useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { PageHeader } from "../../../components/page-header";
import { EmptyNotice, ErrorNotice } from "../../../components/notice";
import {
  WalletIcon,
  PlusIcon,
} from "../../../components/icons";
import { formatCurrency } from "../../../lib/format";

export default function BudgetsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["budgets"],
    queryFn: api.budgets,
  });

  const org = useQuery({
    queryKey: ["organization"],
    queryFn: api.organization,
  });

  const [name, setName] = useState("");
  const [year, setYear] = useState(
    String(new Date().getFullYear()),
  );
  const [amount, setAmount] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.createBudget({
        name: name.trim(),
        fiscalYear: Number(year),
        allocatedAmount: Number(amount),
        departmentId: departmentId || undefined,
      }),
    onSuccess: async () => {
      setName("");
      setAmount("");
      setDepartmentId("");

      await qc.invalidateQueries({
        queryKey: ["budgets"],
      });
    },
  });

  const rows = q.data ?? [];

  const allocated = rows.reduce(
    (sum: number, budget: any) =>
      sum + Number(budget.allocatedCents ?? 0),
    0,
  );

  const committed = rows.reduce(
    (sum: number, budget: any) =>
      sum + Number(budget.committedCents ?? 0),
    0,
  );

  const verified = rows.reduce(
    (sum: number, budget: any) =>
      sum + Number(budget.verifiedCents ?? 0),
    0,
  );

  /*
   * Available budget must account for both:
   * - committed spend
   * - verified/realized spend
   *
   * Example:
   * Allocated = 100M
   * Committed = 0
   * Verified = 43.5M
   * Available = 56.5M
   */
  const available = Math.max(
    0,
    allocated - committed - verified,
  );

  /*
   * Utilization represents the portion of the allocation that
   * has already been committed or verified.
   */
  const pct = allocated
    ? Math.min(
        100,
        Math.round(
          ((committed + verified) / allocated) * 100,
        ),
      )
    : 0;

  const canCreate =
    user?.role === "MANAGER" ||
    user?.role === "FINANCE" ||
    user?.role === "ADMIN";

  return (
    <div className="max-w-[1280px]">
      <PageHeader
        eyebrow="Master data / Spend control"
        title="Budgets"
        description="Operational controls for allocated, committed and verified procurement spend. These values support procurement decisions; they are not accounting balances."
      />

      {canCreate ? (
        <section className="pf-panel mb-5 p-5">
          <div className="pf-section-head">
            <div>
              <div className="pf-card-title">
                Create budget
              </div>

              <div className="pf-card-subtitle">
                Set an allocation before purchase orders consume
                committed spend.
              </div>
            </div>

            <span className="pf-step-dot">
              <PlusIcon size={13} />
            </span>
          </div>

          <form
            className="mt-5 grid gap-3 md:grid-cols-[1.5fr_.6fr_1fr_1fr_auto]"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <input
              required
              className="pf-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FY operating budget"
            />

            <input
              required
              className="pf-input"
              type="number"
              min={2000}
              max={2200}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />

            <input
              required
              className="pf-input"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Allocated IDR"
            />

            <select
              className="pf-input"
              value={departmentId}
              onChange={(e) =>
                setDepartmentId(e.target.value)
              }
            >
              <option value="">
                Organization-wide
              </option>

              {org.data?.departments?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              className="pf-btn pf-btn-primary"
              disabled={
                !name.trim() ||
                !amount ||
                create.isPending
              }
            >
              {create.isPending
                ? "Creating…"
                : "Create"}
            </button>
          </form>

          {create.error ? (
            <div className="mt-3">
              <ErrorNotice
                message={create.error.message}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <div className="pf-panel p-4">
          <div className="pf-label">Allocated</div>

          <div className="mt-2 text-[22px] font-[760] tracking-[-.04em]">
            {formatCurrency(allocated)}
          </div>

          <div className="mt-1 text-[9.5px] text-slate-400">
            Total visible budget allocation
          </div>
        </div>

        <div className="pf-panel p-4">
          <div className="pf-label">Committed</div>

          <div className="mt-2 text-[22px] font-[760] tracking-[-.04em]">
            {formatCurrency(committed)}
          </div>

          <div className="mt-1 text-[9.5px] text-slate-400">
            Current purchase commitments
          </div>
        </div>

        <div className="pf-panel p-4">
          <div className="pf-label">Verified</div>

          <div className="mt-2 text-[22px] font-[760] tracking-[-.04em]">
            {formatCurrency(verified)}
          </div>

          <div className="mt-1 text-[9.5px] text-slate-400">
            Verified procurement spend
          </div>
        </div>

        <div className="pf-panel p-4">
          <div className="pf-label">Available</div>

          <div className="mt-2 text-[22px] font-[760] tracking-[-.04em]">
            {formatCurrency(available)}
          </div>

          <div className="mt-1 text-[9.5px] text-slate-400">
            Remaining spend capacity
          </div>
        </div>
      </div>

      <div className="pf-panel mb-5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="pf-label">
              Overall utilization
            </div>

            <div className="mt-1 text-[12px] text-slate-500">
              Committed + verified spend against total allocation
            </div>
          </div>

          <div className="text-[18px] font-[760] tracking-[-.03em]">
            {pct}%
          </div>
        </div>

        <div className="pf-progress mt-3">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      {q.error ? (
        <ErrorNotice message={q.error.message} />
      ) : q.isLoading ? (
        <div className="p-2 text-[11px] text-slate-500">
          Loading budgets…
        </div>
      ) : !rows.length ? (
        <EmptyNotice>
          No budgets have been configured.
        </EmptyNotice>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((b: any) => {
            const a = Number(
              b.allocatedCents ?? 0,
            );

            const c = Number(
              b.committedCents ?? 0,
            );

            const v = Number(
              b.verifiedCents ?? 0,
            );

            /*
             * Remaining budget:
             *
             * allocated
             *   - committed
             *   - verified
             */
            const budgetAvailable = Math.max(
              0,
              a - c - v,
            );

            /*
             * Utilization:
             *
             * (committed + verified) / allocated
             */
            const budgetPercentage = a
              ? Math.min(
                  100,
                  ((c + v) / a) * 100,
                )
              : 0;

            return (
              <div
                key={b.id}
                className="pf-panel p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="pf-card-title">
                      {b.name}
                    </div>

                    <div className="pf-card-subtitle">
                      FY {b.fiscalYear}

                      {b.department
                        ? ` · ${b.department.name}`
                        : " · organization-wide"}
                    </div>
                  </div>

                  <span className="pf-kpi-icon">
                    <WalletIcon size={15} />
                  </span>
                </div>

                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <div className="text-[24px] font-[760] tracking-[-.04em]">
                      {formatCurrency(
                        budgetAvailable,
                      )}
                    </div>

                    <div className="mt-1 text-[9.5px] text-slate-400">
                      available of{" "}
                      {formatCurrency(a)}
                    </div>
                  </div>

                  <div className="text-[12px] font-bold text-[#356f82]">
                    {Math.round(budgetPercentage)}%
                  </div>
                </div>

                <div className="pf-progress mt-3">
                  <span
                    style={{
                      width: `${budgetPercentage}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div>
                    <div className="pf-label">
                      Committed
                    </div>

                    <div className="mt-1 text-[11px] font-semibold">
                      {formatCurrency(c)}
                    </div>
                  </div>

                  <div>
                    <div className="pf-label">
                      Verified
                    </div>

                    <div className="mt-1 text-[11px] font-semibold">
                      {formatCurrency(v)}
                    </div>
                  </div>

                  <div>
                    <div className="pf-label">
                      Available
                    </div>

                    <div className="mt-1 text-[11px] font-semibold">
                      {formatCurrency(
                        budgetAvailable,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}