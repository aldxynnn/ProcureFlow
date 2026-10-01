"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";
import { PageHeader } from "../../../../components/page-header";
import { ErrorNotice } from "../../../../components/notice";
import {
  ArrowUpRightIcon,
  PlusIcon,
  XIcon,
} from "../../../../components/icons";
import { formatCurrency } from "../../../../lib/format";

const emptyItem = {
  description: "",
  unit: "ea",
  quantity: "1",
  estimatedUnitPrice: "",
  notes: "",
};

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useAuth();

  const org = useQuery({
    queryKey: ["organization"],
    queryFn: api.organization,
  });

  const budgets = useQuery({
    queryKey: ["budgets"],
    queryFn: api.budgets,
  });

  const [title, setTitle] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [justification, setJustification] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [items, setItems] = useState([{ ...emptyItem }]);

  const departmentId = user?.departmentId ?? "";

  const create = useMutation({
    mutationFn: () =>
      api.createRequest({
        title: title.trim(),
        departmentId,
        budgetId: budgetId || undefined,
        justification: justification.trim(),
        neededBy: neededBy || undefined,
        items: items.map((i) => ({
          description: i.description.trim(),
          unit: i.unit.trim(),
          quantity: Number(i.quantity),
          estimatedUnitPrice: Number(i.estimatedUnitPrice),
          notes: i.notes.trim() || undefined,
        })),
      }),
    onSuccess: (d) => router.push(`/requests/${d.id}`),
  });

  const total = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum +
          (Number(i.quantity) || 0) *
            (Number(i.estimatedUnitPrice) || 0),
        0,
      ),
    [items],
  );

  const updateItem = (
    index: number,
    key: keyof typeof emptyItem,
    value: string,
  ) =>
    setItems((xs) =>
      xs.map((x, i) =>
        i === index ? { ...x, [key]: value } : x,
      ),
    );

  const ready = Boolean(
    title.trim() &&
      departmentId &&
      justification.trim() &&
      items.length &&
      items.every(
        (i) =>
          i.description.trim() &&
          i.unit.trim() &&
          Number(i.quantity) > 0 &&
          Number.isFinite(Number(i.estimatedUnitPrice)) &&
          Number(i.estimatedUnitPrice) >= 0,
      ),
  );

  return (
    <div className="max-w-[1100px]">
      <PageHeader
        eyebrow="Purchase requests / New"
        title="Create a purchase request"
        description="Start with the business need. The request becomes the traceable baseline for approval, sourcing and the eventual purchase order."
        action={
          <Link href="/requests" className="pf-btn">
            Back to requests
          </Link>
        }
      />

      {org.error || budgets.error ? (
        <div className="mb-4">
          <ErrorNotice
            message={(org.error || budgets.error)!.message}
          />
        </div>
      ) : null}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();

          if (ready) {
            create.mutate();
          }
        }}
      >
        <section className="pf-panel p-5 md:p-6">
          <div className="pf-section-head">
            <div>
              <div className="pf-card-title">
                Request context
              </div>
              <div className="pf-card-subtitle">
                Department ownership, budget allocation and business
                justification.
              </div>
            </div>

            <span className="pf-step-dot">01</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="pf-field">
              <span>Request title</span>
              <input
                required
                className="pf-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Engineering laptops — Q4 hires"
              />
            </label>

            <label className="pf-field">
              <span>Department</span>
              <select
                required
                className="pf-input"
                value={departmentId}
                disabled={org.isLoading || !user?.departmentId}
                onChange={() => undefined}
              >
                {org.data?.departments
                  ?.filter(
                    (d: any) => d.id === user?.departmentId,
                  )
                  .map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.code}
                    </option>
                  ))}

                {!user?.departmentId ? (
                  <option value="">
                    No department assigned
                  </option>
                ) : null}
              </select>
            </label>

            <label className="pf-field">
              <span>Budget</span>
              <select
                className="pf-input"
                value={budgetId}
                onChange={(e) => setBudgetId(e.target.value)}
                disabled={budgets.isLoading}
              >
                <option value="">No budget selected</option>

                {budgets.data?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · FY {b.fiscalYear}
                  </option>
                ))}
              </select>
            </label>

            <label className="pf-field">
              <span>Needed by</span>
              <input
                className="pf-input"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
              />
            </label>

            <label className="pf-field md:col-span-2">
              <span>Business justification</span>
              <textarea
                required
                className="pf-input min-h-[120px] resize-y"
                value={justification}
                onChange={(e) =>
                  setJustification(e.target.value)
                }
                placeholder="Describe the outcome, urgency, operational requirement or business case."
              />
            </label>
          </div>
        </section>

        <section className="pf-panel mt-4 p-5 md:p-6">
          <div className="pf-section-head">
            <div>
              <div className="pf-card-title">
                Requested items
              </div>
              <div className="pf-card-subtitle">
                Use the same units and quantity assumptions procurement will
                compare against supplier quotations.
              </div>
            </div>

            <div className="text-right">
              <div className="pf-label">Estimated value</div>
              <div className="mt-1 text-[20px] font-[760] tracking-[-.035em]">
                {formatCurrency(total * 100)}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item, index) => (
              <div key={index} className="pf-line-item">
                <div className="pf-line-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="grid flex-1 gap-3 md:grid-cols-[1.7fr_.5fr_.7fr] md:items-end">
                  <label className="pf-field">
                    <span>Description</span>
                    <input
                      required
                      className="pf-input"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "description",
                          e.target.value,
                        )
                      }
                      placeholder="Item or service"
                    />
                  </label>

                  <label className="pf-field">
                    <span>Unit</span>
                    <input
                      required
                      className="pf-input"
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "unit",
                          e.target.value,
                        )
                      }
                      placeholder="ea"
                    />
                  </label>

                  <label className="pf-field">
                    <span>Quantity</span>
                    <input
                      required
                      className="pf-input"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          e.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="pf-field md:col-span-3">
                    <span>
                      Estimated unit price (IDR)
                    </span>
                    <input
                      required
                      className="pf-input"
                      type="number"
                      min="0"
                      step="1"
                      value={item.estimatedUnitPrice}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "estimatedUnitPrice",
                          e.target.value,
                        )
                      }
                      placeholder="0"
                    />
                    <span className="mt-1 block text-[9px] font-normal normal-case tracking-normal text-slate-400">
                      Enter the amount in whole rupiah; the API stores money
                      in minor units.
                    </span>
                  </label>

                  <label className="pf-field md:col-span-3">
                    <span>Item notes</span>
                    <input
                      className="pf-input"
                      value={item.notes}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "notes",
                          e.target.value,
                        )
                      }
                      placeholder="Optional specifications, model, service scope…"
                    />
                  </label>
                </div>

                {items.length > 1 ? (
                  <button
                    type="button"
                    className="pf-icon-btn"
                    onClick={() =>
                      setItems((xs) =>
                        xs.filter((_, i) => i !== index),
                      )
                    }
                    aria-label="Remove item"
                  >
                    <XIcon size={15} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="pf-btn mt-4"
            onClick={() =>
              setItems((xs) => [
                ...xs,
                { ...emptyItem },
              ])
            }
          >
            <PlusIcon size={14} />
            Add another item
          </button>
        </section>

        {create.error ? (
          <div className="mt-4">
            <ErrorNotice message={create.error.message} />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[10px] text-slate-400">
            You can add supporting documents after the request is created.
          </div>

          <div className="flex items-center gap-2">
            <Link href="/requests" className="pf-btn">
              Discard
            </Link>

            <button
              className="pf-btn pf-btn-primary"
              disabled={!ready || create.isPending}
            >
              {create.isPending ? (
                "Creating request…"
              ) : (
                <>
                  Create request <ArrowUpRightIcon size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}