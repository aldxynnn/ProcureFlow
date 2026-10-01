"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import {
  BuildingIcon,
  CheckIcon,
  ShieldIcon,
} from "../../components/icons";

export default function SetupPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState<boolean | null>(
    null,
  );

  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      adminEmail.trim(),
    );

  const slugValid =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      organizationSlug.trim(),
    );

  const departmentCodeValid =
    /^[A-Za-z0-9_-]{2,12}$/.test(
      departmentCode.trim(),
    );

  const passwordValid =
    adminPassword.length >= 12;

  const valid = useMemo(
    () =>
      Boolean(
        organizationName.trim() &&
          slugValid &&
          adminName.trim() &&
          emailValid &&
          passwordValid &&
          departmentName.trim() &&
          departmentCodeValid,
      ),
    [
      organizationName,
      slugValid,
      adminName,
      emailValid,
      passwordValid,
      departmentName,
      departmentCodeValid,
    ],
  );

  const completedSections =
    Number(
      Boolean(
        organizationName.trim() &&
          slugValid,
      ),
    ) +
    Number(
      Boolean(
        adminName.trim() &&
          emailValid &&
          passwordValid,
      ),
    ) +
    Number(
      Boolean(
        departmentName.trim() &&
          departmentCodeValid,
      ),
    );

  useEffect(() => {
    api
      .setupStatus()
      .then((value) => {
        setInitialized(value.initialized);
      })
      .catch((cause) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to read workspace state",
        );
        setInitialized(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || initialized === null) {
    return (
      <div className="pf-setup-loading">
        <div className="pf-setup-loading-card">
          <span className="pf-setup-loading-logo">
            <img
              src="/procureflow-logo.png"
              alt="ProcureFlow"
            />
          </span>

          <div>
            <strong>Preparing workspace setup</strong>
            <span>
              Checking the current database state.
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  if (
    error &&
    initialized === false &&
    !organizationName &&
    !adminName
  ) {
    return (
      <div className="pf-setup-state">
        <div className="pf-setup-state-card">
          <span className="pf-setup-state-icon">
            !
          </span>

          <div className="pf-setup-state-eyebrow">
            Workspace unavailable
          </div>

          <h1>
            We could not check
            <br />
            the database.
          </h1>

          <p>{error}</p>

          <button
            type="button"
            className="pf-btn pf-btn-primary pf-setup-state-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Retry connection
          </button>

          <Link
            href="/"
            className="pf-setup-back-link"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (initialized) {
    return (
      <div className="pf-setup-state">
        <div className="pf-setup-state-card">
          <span className="pf-setup-state-logo">
            <img
              src="/procureflow-logo.png"
              alt="ProcureFlow"
            />
          </span>

          <div className="pf-setup-state-eyebrow">
            Workspace already initialized
          </div>

          <h1>
            This workspace
            <br />
            is ready to use.
          </h1>

          <p>
            First-run setup has already been completed
            for this database. Sign in with an existing
            organization account to continue.
          </p>

          <Link
            href="/"
            className="pf-btn pf-btn-primary pf-setup-state-button"
          >
            Go to sign in
          </Link>

          <div className="pf-setup-state-meta">
            <span>ProcureFlow</span>
            <span>Workspace initialized</span>
          </div>
        </div>
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!valid || busy) {
      return;
    }

    setBusy(true);
    setError("");

    const slug =
      organizationSlug.trim().toLowerCase();

    const email =
      adminEmail.trim().toLowerCase();

    try {
      await api.initializeSetup({
        organizationName:
          organizationName.trim(),

        organizationSlug: slug,

        adminName:
          adminName.trim(),

        adminEmail: email,

        adminPassword,

        departmentName:
          departmentName.trim(),

        departmentCode:
          departmentCode.trim().toUpperCase(),
      });

      await login(
        email,
        adminPassword,
        slug,
      );

      router.replace("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Workspace setup failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pf-setup-shell">
      {/* =====================================================
          ASIDE
          ===================================================== */}

      <aside className="pf-setup-aside">
        <div className="pf-setup-aside-top">
          <Link
            href="/"
            className="pf-setup-brand"
          >
            <span className="pf-setup-brand-logo">
              <img
                src="/procureflow-logo.png"
                alt="ProcureFlow"
              />
            </span>

            <span>
              <strong>
                <span className="pf-brand-procure">
                  Procure
                </span>
                <span className="pf-brand-flow">
                  Flow
                </span>
              </strong>

              <small>
                Procurement control
              </small>
            </span>
          </Link>
        </div>

        <div className="pf-setup-aside-main">
          <div className="pf-setup-kicker">
            First-run workspace
          </div>

          <h1>
            Establish the
            <br />
            control layer first.
          </h1>

          <p>
            Set up the organization, primary
            administrator, and first operating
            department before procurement activity
            begins.
          </p>

          <div className="pf-setup-principles">
            <div className="pf-setup-principle">
              <span className="pf-setup-principle-icon">
                <BuildingIcon size={15} />
              </span>

              <span>
                <strong>Organization</strong>
                <small>
                  Isolated tenant and workspace
                  identity.
                </small>
              </span>
            </div>

            <div className="pf-setup-principle">
              <span className="pf-setup-principle-icon">
                <ShieldIcon size={15} />
              </span>

              <span>
                <strong>Administrator</strong>
                <small>
                  Initial account with controlled
                  access.
                </small>
              </span>
            </div>

            <div className="pf-setup-principle">
              <span className="pf-setup-principle-icon">
                <CheckIcon size={15} />
              </span>

              <span>
                <strong>Operating structure</strong>
                <small>
                  First department for real
                  transactions.
                </small>
              </span>
            </div>
          </div>
        </div>

        <div className="pf-setup-aside-bottom">
          <span className="pf-setup-secure-dot" />

          <span>
            No demo records are created.
          </span>

          <Link href="/">
            Return to sign in
          </Link>
        </div>
      </aside>

      {/* =====================================================
          FORM PANEL
          ===================================================== */}

      <main className="pf-setup-panel">
        <div className="pf-setup-form-wrap">
          <header className="pf-setup-header">
            <div>
              <div className="pf-setup-eyebrow">
                Workspace initialization
              </div>

              <h2>
                Configure your workspace
              </h2>

              <p>
                These details become the initial
                organization data used throughout
                ProcureFlow.
              </p>
            </div>

            <div className="pf-setup-progress">
              <strong>
                {completedSections}/3
              </strong>

              <span>sections ready</span>
            </div>
          </header>

          <div className="pf-setup-progress-bar">
            <span
              style={{
                width: `${
                  (completedSections / 3) * 100
                }%`,
              }}
            />
          </div>

          <form
            className="pf-setup-form"
            onSubmit={submit}
          >
            {/* =================================================
                SECTION 01
                ================================================= */}

            <section className="pf-setup-section">
              <div className="pf-setup-section-head">
                <span className="pf-setup-section-number">
                  01
                </span>

                <div>
                  <h3>Organization</h3>
                  <p>
                    Define the identity of this
                    ProcureFlow workspace.
                  </p>
                </div>

                {organizationName.trim() &&
                slugValid ? (
                  <span className="pf-setup-section-check">
                    <CheckIcon size={13} />
                    Ready
                  </span>
                ) : null}
              </div>

              <div className="pf-setup-fields">
                <label className="pf-setup-field">
                  <span>Organization name</span>

                  <input
                    required
                    className="pf-input"
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(
                        event.target.value,
                      )
                    }
                    placeholder="Acme Manufacturing"
                  />

                  <small>
                    The legal or operating name
                    users will see in the workspace.
                  </small>
                </label>

                <label className="pf-setup-field">
                  <span>Organization slug</span>

                  <input
                    required
                    className={`pf-input ${
                      organizationSlug &&
                      !slugValid
                        ? "pf-setup-input-invalid"
                        : ""
                    }`}
                    value={organizationSlug}
                    onChange={(event) =>
                      setOrganizationSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9\s-]/g, "")
                          .replace(/\s+/g, "-")
                          .replace(/-+/g, "-"),
                      )
                    }
                    placeholder="acme-manufacturing"
                  />

                  <small>
                    Lowercase letters, numbers and
                    hyphens only.
                  </small>
                </label>
              </div>
            </section>

            {/* =================================================
                SECTION 02
                ================================================= */}

            <section className="pf-setup-section">
              <div className="pf-setup-section-head">
                <span className="pf-setup-section-number">
                  02
                </span>

                <div>
                  <h3>Administrator</h3>
                  <p>
                    Create the first account with
                    administrative control.
                  </p>
                </div>

                {adminName.trim() &&
                emailValid &&
                passwordValid ? (
                  <span className="pf-setup-section-check">
                    <CheckIcon size={13} />
                    Ready
                  </span>
                ) : null}
              </div>

              <div className="pf-setup-fields">
                <label className="pf-setup-field">
                  <span>Full name</span>

                  <input
                    required
                    className="pf-input"
                    value={adminName}
                    onChange={(event) =>
                      setAdminName(
                        event.target.value,
                      )
                    }
                    placeholder="Alicia Tan"
                  />
                </label>

                <label className="pf-setup-field">
                  <span>Email address</span>

                  <input
                    required
                    type="email"
                    className={`pf-input ${
                      adminEmail &&
                      !emailValid
                        ? "pf-setup-input-invalid"
                        : ""
                    }`}
                    value={adminEmail}
                    onChange={(event) =>
                      setAdminEmail(
                        event.target.value,
                      )
                    }
                    placeholder="admin@company.com"
                  />
                </label>

                <label className="pf-setup-field pf-setup-field-full">
                  <span>
                    Administrator password
                  </span>

                  <input
                    required
                    minLength={12}
                    type="password"
                    className="pf-input"
                    value={adminPassword}
                    onChange={(event) =>
                      setAdminPassword(
                        event.target.value,
                      )
                    }
                    placeholder="At least 12 characters"
                  />

                  <div className="pf-setup-password-meta">
                    <span>
                      Minimum 12 characters.
                    </span>

                    <span
                      className={
                        passwordValid
                          ? "is-valid"
                          : ""
                      }
                    >
                      {passwordValid
                        ? "Password accepted"
                        : `${adminPassword.length}/12 characters`}
                    </span>
                  </div>
                </label>
              </div>
            </section>

            {/* =================================================
                SECTION 03
                ================================================= */}

            <section className="pf-setup-section">
              <div className="pf-setup-section-head">
                <span className="pf-setup-section-number">
                  03
                </span>

                <div>
                  <h3>First department</h3>
                  <p>
                    Create the first organizational
                    unit for requests and budgets.
                  </p>
                </div>

                {departmentName.trim() &&
                departmentCodeValid ? (
                  <span className="pf-setup-section-check">
                    <CheckIcon size={13} />
                    Ready
                  </span>
                ) : null}
              </div>

              <div className="pf-setup-fields">
                <label className="pf-setup-field">
                  <span>Department name</span>

                  <input
                    required
                    className="pf-input"
                    value={departmentName}
                    onChange={(event) =>
                      setDepartmentName(
                        event.target.value,
                      )
                    }
                    placeholder="Engineering"
                  />
                </label>

                <label className="pf-setup-field">
                  <span>Department code</span>

                  <input
                    required
                    maxLength={12}
                    className={`pf-input ${
                      departmentCode &&
                      !departmentCodeValid
                        ? "pf-setup-input-invalid"
                        : ""
                    }`}
                    value={departmentCode}
                    onChange={(event) =>
                      setDepartmentCode(
                        event.target.value
                          .toUpperCase()
                          .replace(
                            /[^A-Z0-9_-]/g,
                            "",
                          ),
                      )
                    }
                    placeholder="ENG"
                  />

                  <small>
                    2–12 characters. Used as the
                    department identifier.
                  </small>
                </label>
              </div>
            </section>

            {/* =================================================
                ERROR
                ================================================= */}

            {error ? (
              <div className="pf-setup-error">
                <span className="pf-setup-error-icon">
                  !
                </span>

                <div>
                  <strong>
                    Workspace setup failed
                  </strong>

                  <p>{error}</p>
                </div>
              </div>
            ) : null}

            {/* =================================================
                FORM FOOTER
                ================================================= */}

            <div className="pf-setup-form-footer">
              <div className="pf-setup-form-note">
                <span className="pf-setup-form-note-icon">
                  <ShieldIcon size={13} />
                </span>

                <span>
                  <strong>
                    This creates real workspace data.
                  </strong>

                  <small>
                    No sample users, budgets, vendors,
                    or transactions will be added.
                  </small>
                </span>
              </div>

              <button
                type="submit"
                disabled={!valid || busy}
                className="pf-setup-submit"
              >
                <span>
                  {busy
                    ? "Creating workspace…"
                    : "Create workspace"}
                </span>

                <span className="pf-setup-submit-arrow">
                  {busy ? "…" : "→"}
                </span>
              </button>
            </div>
          </form>

          <footer className="pf-setup-page-footer">
            <span>
              ProcureFlow
            </span>

            <span>
              Initial workspace setup
            </span>

            <Link href="/">
              Sign in instead
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}