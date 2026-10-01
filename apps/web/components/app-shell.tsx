"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  canAccessPath,
  ROLE_LABELS,
} from "../lib/permissions";
import {
  ArrowUpRightIcon,
  BellIcon,
  BuildingIcon,
  ChevronDownIcon,
  FileTextIcon,
  GridIcon,
  MenuIcon,
  ReceiptIcon,
  RepeatIcon,
  ShieldIcon,
  ShoppingCartIcon,
  WalletIcon,
  LogoutIcon,
  CheckIcon,
  SearchIcon,
  CommandIcon,
} from "./icons";

type NavItem = {
  label: string;
  href: string;
  roles: string[];
  icon: typeof GridIcon;
  group: string;
};

type OpenPopover =
  | "sidebar-profile"
  | "topbar-profile"
  | "desktop-notifications"
  | "mobile-notifications"
  | null;

const nav: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    roles: [
      "EMPLOYEE",
      "MANAGER",
      "PROCUREMENT",
      "FINANCE",
      "ADMIN",
    ],
    icon: GridIcon,
    group: "Workspace",
  },
  {
    label: "Purchase requests",
    href: "/requests",
    roles: [
      "EMPLOYEE",
      "MANAGER",
      "PROCUREMENT",
      "ADMIN",
    ],
    icon: FileTextIcon,
    group: "Workspace",
  },
  {
    label: "RFQs",
    href: "/rfqs",
    roles: ["PROCUREMENT", "ADMIN"],
    icon: RepeatIcon,
    group: "Source & buy",
  },
  {
    label: "Purchase orders",
    href: "/orders",
    roles: [
      "PROCUREMENT",
      "FINANCE",
      "ADMIN",
      "MANAGER",
    ],
    icon: ShoppingCartIcon,
    group: "Source & buy",
  },
  {
    label: "Invoices",
    href: "/invoices",
    roles: [
      "FINANCE",
      "PROCUREMENT",
      "ADMIN",
    ],
    icon: ReceiptIcon,
    group: "Source & buy",
  },
  {
    label: "Vendors",
    href: "/vendors",
    roles: [
      "PROCUREMENT",
      "ADMIN",
      "FINANCE",
    ],
    icon: BuildingIcon,
    group: "Master data",
  },
  {
    label: "Budgets",
    href: "/budgets",
    roles: [
      "EMPLOYEE",
      "MANAGER",
      "PROCUREMENT",
      "FINANCE",
      "ADMIN",
    ],
    icon: WalletIcon,
    group: "Master data",
  },
  {
    label: "Audit trail",
    href: "/audit",
    roles: [
      "MANAGER",
      "PROCUREMENT",
      "FINANCE",
      "ADMIN",
    ],
    icon: ShieldIcon,
    group: "Governance",
  },
  {
    label: "Administration",
    href: "/settings",
    roles: ["ADMIN"],
    icon: ShieldIcon,
    group: "Governance",
  },
];

const searchableRoutes: Array<
  Pick<
    NavItem,
    "label" | "href" | "roles" | "group"
  >
> = nav.map(
  ({
    label,
    href,
    roles,
    group,
  }) => ({
    label,
    href,
    roles,
    group,
  }),
);

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    loading,
    logout,
  } = useAuth();

  const queryClient = useQueryClient();

  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);
  const [openPopover, setOpenPopover] =
    useState<OpenPopover>(null);
  const [searchOpen, setSearchOpen] =
    useState(false);
  const [search, setSearch] =
    useState("");

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    enabled: !!user,
    staleTime: 30000,
  });

  const organization = useQuery({
    queryKey: ["organization"],
    queryFn: api.organization,
    enabled: !!user,
    staleTime: 60000,
  });

  const unread =
    notifications.data?.filter(
      (n: any) => !n.readAt,
    ).length ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api.readNotification(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      }),
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [
    loading,
    user,
    router,
  ]);

  // Route changes intentionally reset transient shell UI state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenPopover(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (
      !loading &&
      user &&
      !canAccessPath(
        user.role,
        pathname,
      )
    ) {
      router.replace("/dashboard");
    }
  }, [
    loading,
    user,
    pathname,
    router,
  ]);

  useEffect(() => {
    const onKey = (
      e: KeyboardEvent,
    ) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();

        setOpenPopover(null);
        setSearchOpen(
          (value) => !value,
        );
      }

      if (e.key === "Escape") {
        setSearchOpen(false);
        setOpenPopover(null);
        setMobileOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKey,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKey,
      );
    };
  }, []);

  const links = useMemo(
    () =>
      nav.filter(
        (item) =>
          item.roles.includes(
            user?.role ?? "",
          ),
      ),
    [user?.role],
  );

  const groups = useMemo(
    () =>
      Array.from(
        new Set(
          links.map(
            (link) => link.group,
          ),
        ),
      ),
    [links],
  );

  const searchResults = useMemo(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    return searchableRoutes
      .filter(
        (route) =>
          route.roles.includes(
            user?.role ?? "",
          ) &&
          route.label
            .toLowerCase()
            .includes(query),
      )
      .slice(0, 8);
  }, [
    search,
    user?.role,
  ]);

  const togglePopover = (
    popover: Exclude<
      OpenPopover,
      null
    >,
  ) => {
    setOpenPopover(
      (current) =>
        current === popover
          ? null
          : popover,
    );
  };

  const openSearch = () => {
    setOpenPopover(null);
    setSearchOpen(true);
  };

  if (loading) {
    return (
      <div className="pf-loading-screen">
        <div className="pf-spinner" />

        <span>
          Loading workspace
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pf-loading-screen">
        Redirecting…
      </div>
    );
  }

  const current =
    links.find(
      (link) =>
        pathname === link.href ||
        pathname.startsWith(
          `${link.href}/`,
        ),
    );

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map(
      (value) =>
        value[0],
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const orgName =
    organization.data?.name ??
    "Organization workspace";

  const roleLabel =
    ROLE_LABELS[
      user.role as keyof typeof ROLE_LABELS
    ] ?? user.role;

  const NotificationPanel = ({
    mobile = false,
  }: {
    mobile?: boolean;
  }) => (
    <div
      className={`pf-notif-panel ${
        mobile
          ? "pf-notif-panel-mobile"
          : ""
      }`}
    >
      <div className="pf-notif-head">
        <div>
          <strong>
            Notifications
          </strong>

          <span>
            {unread
              ? `${unread} unread`
              : "All caught up"}
          </span>
        </div>

        {unread ? (
          <span className="pf-notif-count">
            {unread}
          </span>
        ) : null}
      </div>

      <div className="pf-notif-list">
        {!notifications.data?.length ? (
          <div className="pf-notif-empty">
            No activity yet.
          </div>
        ) : (
          notifications.data
            .slice(0, 8)
            .map(
              (n: any) => (
                <button
                  key={n.id}
                  type="button"
                  className={`pf-notif-item ${
                    !n.readAt
                      ? "is-unread"
                      : ""
                  }`}
                  onClick={() => {
                    if (
                      !n.readAt
                    ) {
                      markRead.mutate(
                        n.id,
                      );
                    }
                  }}
                >
                  <span className="pf-notif-icon">
                    <BellIcon
                      size={13}
                    />
                  </span>

                  <span className="min-w-0 text-left">
                    <strong>
                      {n.title}
                    </strong>

                    <small>
                      {n.body}
                    </small>

                    <em>
                      {new Date(
                        n.createdAt,
                      ).toLocaleString(
                        [],
                        {
                          month:
                            "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute:
                            "2-digit",
                        },
                      )}
                    </em>
                  </span>

                  {!n.readAt ? (
                    <CheckIcon
                      size={14}
                      className="ml-auto shrink-0 text-slate-400"
                    />
                  ) : null}
                </button>
              ),
            )
        )}
      </div>
    </div>
  );

  const ProfileMenu = ({
    sidebar = false,
  }: {
    sidebar?: boolean;
  }) => (
    <div
      className={`pf-profile-menu ${
        sidebar
          ? "pf-profile-menu-sidebar"
          : ""
      }`}
    >
      <div className="pf-profile-head">
        <span className="pf-avatar">
          {initials}
        </span>

        <div className="min-w-0">
          <strong>
            {user.name}
          </strong>

          <small>
            {user.email}
          </small>
        </div>
      </div>

      <div className="pf-profile-role">
        <span>
          Current role
        </span>

        <strong>
          {roleLabel}
        </strong>
      </div>

      <div className="pf-profile-actions">
        {user.role === "ADMIN" ? (
          <Link
            href="/settings"
            className="pf-profile-item"
            onClick={() =>
              setOpenPopover(null)
            }
          >
            <ShieldIcon
              size={14}
            />

            Administration
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="pf-profile-item"
            onClick={() =>
              setOpenPopover(null)
            }
          >
            <GridIcon
              size={14}
            />

            Workspace overview
          </Link>
        )}

        <button
          type="button"
          className="pf-profile-item pf-profile-item-danger"
          onClick={async () => {
            setOpenPopover(null);

            await logout();

            router.replace("/");
          }}
        >
          <LogoutIcon
            size={14}
          />

          Sign out
        </button>
      </div>
    </div>
  );

  const SearchPalette = () =>
    searchOpen ? (
      <div
        className="pf-command-overlay"
        onMouseDown={(
          event,
        ) => {
          if (
            event.currentTarget ===
            event.target
          ) {
            setSearchOpen(
              false,
            );
          }
        }}
      >
        <div className="pf-command-panel">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4">
            <SearchIcon
              size={17}
              className="text-slate-400"
            />

            <input
              autoFocus
              className="w-full border-0 bg-transparent text-[13px] outline-none"
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search workspace navigation…"
            />

            <kbd className="pf-command-kbd">
              ESC
            </kbd>
          </div>

          <div className="p-2">
            {!searchResults.length ? (
              <div className="p-7 text-center text-[10px] text-slate-500">
                No destinations
                match “{search}”.
              </div>
            ) : (
              searchResults.map(
                (item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    onClick={() => {
                      setSearchOpen(
                        false,
                      );
                      setSearch("");
                    }}
                    className="pf-command-item"
                  >
                    <span className="pf-kpi-icon">
                      <CommandIcon
                        size={14}
                      />
                    </span>

                    <span>
                      <strong>
                        {
                          item.label
                        }
                      </strong>

                      <small>
                        {item.group ??
                          "Workspace"}
                      </small>
                    </span>

                    <ArrowUpRightIcon
                      size={14}
                      className="ml-auto text-slate-400"
                    />
                  </Link>
                ),
              )
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-3 text-[9px] text-slate-400">
            Use Ctrl K / ⌘ K
            to open search.
            Esc closes.
          </div>
        </div>
      </div>
    ) : null;

  const sidebar = (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="pf-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setMobileOpen(
              false,
            )
          }
        />
      ) : null}

      <aside
        className={`pf-sidebar ${
          mobileOpen
            ? "is-open"
            : ""
        }`}
      >
        <div className="pf-sidebar-head">
          <Link
            href="/dashboard"
            className="pf-brand"
            onClick={() =>
              setMobileOpen(
                false,
              )
            }
          >
            <span className="pf-sidebar-brand-logo">
              <img
                src="/procureflow-logo.png"
                alt="ProcureFlow"
              />
            </span>

            <span className="pf-sidebar-brand-copy">
              <strong className="pf-sidebar-brand-wordmark">
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

          <button
            type="button"
            className="pf-mobile-close"
            onClick={() =>
              setMobileOpen(
                false,
              )
            }
            aria-label="Close navigation"
          >
            <MenuIcon
              size={19}
            />
          </button>
        </div>

        <div className="pf-workspace-switcher">
          <div className="pf-workspace-icon">
            <BuildingIcon
              size={15}
            />
          </div>

          <div className="min-w-0">
            <div className="pf-workspace-label">
              Workspace
            </div>

            <div className="pf-workspace-name">
              {orgName}
            </div>
          </div>

          <span
            className="pf-workspace-status"
            aria-hidden="true"
          />
        </div>

        <nav
          className="pf-nav"
          aria-label="Primary navigation"
        >
          {groups.map(
            (group) => (
              <div
                key={group}
                className="pf-nav-group"
              >
                <div className="pf-nav-caption">
                  {group}
                </div>

                {links
                  .filter(
                    (item) =>
                      item.group ===
                      group,
                  )
                  .map(
                    (link) => {
                      const Icon =
                        link.icon;

                      const active =
                        pathname ===
                          link.href ||
                        pathname.startsWith(
                          `${link.href}/`,
                        );

                      return (
                        <Link
                          key={
                            link.href
                          }
                          href={
                            link.href
                          }
                          aria-current={
                            active
                              ? "page"
                              : undefined
                          }
                          className={`pf-nav-item ${
                            active
                              ? "is-active"
                              : ""
                          }`}
                          onClick={() => {
                            setOpenPopover(
                              null,
                            );
                            setMobileOpen(
                              false,
                            );
                          }}
                        >
                          <span className="pf-nav-icon">
                            <Icon
                              size={
                                17
                              }
                            />
                          </span>

                          <span className="pf-nav-label">
                            {
                              link.label
                            }
                          </span>

                          {active ? (
                            <span
                              className="pf-nav-active-mark"
                              aria-hidden="true"
                            />
                          ) : null}
                        </Link>
                      );
                    },
                  )}
              </div>
            ),
          )}
        </nav>

        <div className="pf-sidebar-footer">
          <button
            type="button"
            className={`pf-user-card ${
              openPopover ===
              "sidebar-profile"
                ? "is-open"
                : ""
            }`}
            aria-expanded={
              openPopover ===
              "sidebar-profile"
            }
            onClick={() => {
              togglePopover(
                "sidebar-profile",
              );
              setMobileOpen(
                true,
              );
            }}
          >
            <span className="pf-avatar">
              {initials}
            </span>

            <span className="min-w-0 text-left">
              <strong>
                {user.name}
              </strong>

              <small>
                {roleLabel}
              </small>
            </span>

            <ChevronDownIcon
              size={16}
              className={`ml-auto text-slate-500 transition ${
                openPopover ===
                "sidebar-profile"
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {openPopover ===
          "sidebar-profile" ? (
            // eslint-disable-next-line react-hooks/static-components
            <ProfileMenu
              sidebar
            />
          ) : null}
        </div>
      </aside>
    </>
  );

  const notificationButton = ({
    mobile = false,
  }: {
    mobile?: boolean;
  }) => {
    const popover = mobile
      ? "mobile-notifications"
      : "desktop-notifications";

    const active =
      openPopover ===
      popover;

    return (
      <div className="pf-popover-anchor">
        <button
          type="button"
          className={`pf-icon-btn ${
            active
              ? "is-active"
              : ""
          }`}
          aria-label={`Notifications${
            unread
              ? `, ${unread} unread`
              : ""
          }`}
          aria-expanded={active}
          onClick={() => {
            togglePopover(
              popover,
            );

            setSearchOpen(
              false,
            );

            if (!mobile) {
              setMobileOpen(
                false,
              );
            }
          }}
        >
          <BellIcon
            size={18}
          />

          {unread ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-[4px] -top-[4px] z-10 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-[#b54a4a] px-[3px] text-[8px] font-extrabold leading-none text-white shadow-[0_2px_5px_rgba(18,35,44,0.18)]"
            >
              {unread}
            </span>
          ) : null}
        </button>

        {active ? (
          <NotificationPanel
            mobile={mobile}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div className="pf-app-shell">
      {/* eslint-disable-next-line react-hooks/static-components */}
      <SearchPalette />

      <div className="pf-mobile-topbar">
        <button
          type="button"
          className="pf-icon-btn"
          onClick={() => {
            setMobileOpen(
              true,
            );
            setOpenPopover(
              null,
            );
          }}
          aria-label="Open navigation"
        >
          <MenuIcon
            size={19}
          />
        </button>

        <Link
          href="/dashboard"
          className="pf-mobile-brand"
          onClick={() =>
            setOpenPopover(
              null,
            )
          }
        >
          <span className="pf-mobile-logo">
            <img
              src="/procureflow-logo.png"
              alt="ProcureFlow"
            />
          </span>

          <span className="pf-mobile-wordmark">
            <span className="pf-brand-procure">
              Procure
            </span>

            <span className="pf-brand-flow">
              Flow
            </span>
          </span>
        </Link>

        <div className="pf-topbar-actions">
          <button
            type="button"
            className="pf-icon-btn"
            aria-label="Search"
            onClick={openSearch}
          >
            <SearchIcon
              size={17}
            />
          </button>

          {notificationButton({
            mobile: true,
          })}
        </div>
      </div>

      {sidebar}

      <div className="pf-main">
        <header className="pf-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <div className="pf-breadcrumb">
              <span>
                Workspace
              </span>

              <span>
                /
              </span>

              <strong>
                {current?.label ??
                  "Overview"}
              </strong>
            </div>
          </div>

          <div className="pf-topbar-right">
            <button
              type="button"
              className="pf-search"
              onClick={
                openSearch
              }
            >
              <span className="flex items-center gap-2">
                <SearchIcon
                  size={14}
                  className="text-slate-400"
                />

                Search workspace
              </span>

              <kbd>
                ⌘ K
              </kbd>
            </button>

            {notificationButton({
              mobile: false,
            })}

            <div className="pf-popover-anchor">
              <button
                type="button"
                className={`pf-topbar-user ${
                  openPopover ===
                  "topbar-profile"
                    ? "is-open"
                    : ""
                }`}
                aria-expanded={
                  openPopover ===
                  "topbar-profile"
                }
                onClick={() => {
                  togglePopover(
                    "topbar-profile",
                  );

                  setMobileOpen(
                    false,
                  );

                  setSearchOpen(
                    false,
                  );
                }}
              >
                <span className="pf-avatar pf-avatar-sm">
                  {
                    initials
                  }
                </span>

                <span className="hidden xl:block">
                  <strong>
                    {
                      user.name
                    }
                  </strong>

                  <small>
                    {
                      roleLabel
                    }
                  </small>
                </span>

                <ChevronDownIcon
                  size={14}
                  className={`text-slate-400 transition ${
                    openPopover ===
                    "topbar-profile"
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {openPopover ===
              "topbar-profile" ? (
                // eslint-disable-next-line react-hooks/static-components
                <ProfileMenu />
              ) : null}
            </div>
          </div>
        </header>

        <main className="pf-content">
          {children}
        </main>
      </div>
    </div>
  );
}