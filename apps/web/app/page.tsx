"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

import {
  CheckIcon,
  FileTextIcon,
  ReceiptIcon,
  RepeatIcon,
  ShoppingCartIcon,
} from "../components/icons";

const workflow = [
  {
    label: "Request",
    description: "Capture demand",
    icon: FileTextIcon,
  },
  {
    label: "Approve",
    description: "Route controls",
    icon: CheckIcon,
  },
  {
    label: "Source",
    description: "Compare quotes",
    icon: RepeatIcon,
  },
  {
    label: "Order",
    description: "Commit spend",
    icon: ShoppingCartIcon,
  },
  {
    label: "Verify",
    description: "Match invoice",
    icon: ReceiptIcon,
  },
];

function Brand({
  inverted = false,
}: {
  inverted?: boolean;
}) {
  return (
    <div className="pf-brand-lockup">
      <div className="pf-brand-logo">
        <Image
          src="/procureflow-logo.png"
          alt="ProcureFlow"
          width={56}
          height={56}
          priority
          className="pf-brand-logo-image"
        />
      </div>

      <div className="pf-brand-wordmark-wrap">
        <div
          className={`pf-brand-wordmark ${
            inverted ? "is-inverted" : ""
          }`}
        >
          <span className="pf-brand-procure">
            Procure
          </span>
          <span className="pf-brand-flow">
            Flow
          </span>
        </div>

        <div className="pf-brand-tagline">
          Procurement control
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const setup = useQuery({
    queryKey: ["setup-status"],
    queryFn: api.setupStatus,
    staleTime: 30000,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="pf-login-loading">
        <div className="pf-login-loading-mark">
          <Image
            src="/procureflow-logo.svg"
            alt=""
            width={34}
            height={34}
            priority
          />
        </div>

        <div>
          <div className="pf-login-loading-title">
            Loading workspace
          </div>
          <div className="pf-login-loading-subtitle">
            Preparing your ProcureFlow session
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await login(email.trim(), password, slug.trim());
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in to the workspace.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pf-login-shell">
      <section className="pf-login-visual">
        {/* <div className="pf-login-orbit pf-login-orbit-a" />
        <div className="pf-login-orbit pf-login-orbit-b" />
        <div className="pf-login-glow pf-login-glow-a" />
        <div className="pf-login-glow pf-login-glow-b" />

        <div className="pf-login-grid" />
        <div className="pf-login-scanline" /> */}

        <div className="pf-login-visual-head">
          <Brand inverted />
        </div>

        <div className="pf-login-copy">
          <div className="pf-login-kicker">
  Procurement workflow
</div>

          <h1>
  Procurement
  <br />
  <span>under control.</span>
</h1>

          <p>
            A traceable workspace for demand, approvals, sourcing,
            purchasing, receiving, and invoice verification.
          </p>

          <div className="pf-login-flow">
            {workflow.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="pf-login-flow-item"
                  style={
                    {
                      "--pf-flow-delay": `${index * 90}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div className="pf-login-flow-top">
                    <div className="pf-login-flow-icon">
                      <Icon size={15} />
                    </div>

                    <span className="pf-login-flow-index">
                      0{index + 1}
                    </span>
                  </div>

                  <strong>{item.label}</strong>
                  <span>{item.description}</span>

                  {index < workflow.length - 1 ? (
                    <div className="pf-login-flow-connector">
                      <span />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="pf-login-proof">
            <div className="pf-login-proof-line" />

            <div>
              <span>Designed for operational control</span>
              <strong>
                Multi-tenant · RBAC · Auditable workflow
              </strong>
            </div>
          </div>
        </div>

        <div className="pf-login-visual-foot">
          <span>ProcureFlow</span>
          <span>Operational procurement platform</span>
        </div>
      </section>

      <section className="pf-login-panel">
        <div className="pf-login-panel-inner">
          <div className="pf-login-mobile-brand">
            <Brand />
          </div>

          <form
            onSubmit={submit}
            className="pf-login-card"
          >
            <div className="pf-login-card-head">
              <div className="pf-login-card-eyebrow">
                Secure sign in
              </div>

              <h2>Open your workspace</h2>

              <p>
                Enter the organization and account created during
                workspace setup.
              </p>
            </div>

            <div className="pf-login-form">
              <label className="pf-login-field">
                <span>Organization slug</span>

                <div className="pf-login-input-wrap">
                  <input
                    required
                    className="pf-input pf-login-input"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value)
                    }
                    placeholder="acme-manufacturing"
                    autoComplete="organization"
                  />
                </div>
              </label>

              <label className="pf-login-field">
                <span>Email</span>

                <div className="pf-login-input-wrap">
                  <input
                    required
                    className="pf-input pf-login-input"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="pf-login-field">
                <span>Password</span>

                <div className="pf-login-input-wrap">
                  <input
                    required
                    className="pf-input pf-login-input"
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Your password"
                    autoComplete="current-password"
                  />
                </div>
              </label>

              {error ? (
                <div className="pf-login-error">
                  <div className="pf-login-error-icon">
                    !
                  </div>

                  <div>
                    <strong>Sign in failed</strong>
                    <p>{error}</p>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="pf-login-submit"
              >
                <span>
                  {busy
                    ? "Opening workspace…"
                    : "Continue to workspace"}
                </span>

                <span
                  className={`pf-login-submit-arrow ${
                    busy ? "is-loading" : ""
                  }`}
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            </div>

            {!setup.isLoading &&
            !setup.data?.initialized ? (
              <div className="pf-login-setup">
                <div className="pf-login-setup-indicator">
                  +
                </div>

                <div className="pf-login-setup-copy">
                  <strong>New workspace</strong>

                  <p>
                    This database is empty. Create the first
                    administrator to get started.
                  </p>

                  <Link
                    href="/setup"
                    className="pf-login-setup-link"
                  >
                    Set up workspace
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="pf-login-meta">
              <span>
                <span className="pf-login-meta-dot" />
                ProcureFlow
              </span>

              <span>Local / self-hosted</span>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
