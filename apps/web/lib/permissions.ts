export type AppRole = 'EMPLOYEE' | 'MANAGER' | 'PROCUREMENT' | 'FINANCE' | 'ADMIN';

export const ROLE_LABELS: Record<AppRole, string> = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  PROCUREMENT: 'Procurement',
  FINANCE: 'Finance',
  ADMIN: 'Administrator',
};

export const ROLE_RESPONSIBILITIES: Record<AppRole, string[]> = {
  EMPLOYEE: ['Create and track your own purchase requests', 'Monitor approval status and supporting documents'],
  MANAGER: ['Review and decide direct-report purchase requests', 'Maintain budgets and approve eligible purchase orders'],
  PROCUREMENT: ['Manage suppliers and sourcing', 'Compare quotations, create purchase orders and record receipts'],
  FINANCE: ['Control budgets and supplier invoices', 'Verify three-way matches and approve invoices'],
  ADMIN: ['Configure the organization', 'Manage users, roles, departments and tenant-wide administration'],
};

const routeRules: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: '/requests/new', roles: ['EMPLOYEE'] },
  { prefix: '/settings', roles: ['ADMIN'] },
  { prefix: '/rfqs', roles: ['PROCUREMENT', 'ADMIN'] },
  { prefix: '/invoices', roles: ['FINANCE', 'PROCUREMENT', 'ADMIN'] },
  { prefix: '/orders', roles: ['MANAGER', 'PROCUREMENT', 'FINANCE', 'ADMIN'] },
  { prefix: '/vendors', roles: ['PROCUREMENT', 'FINANCE', 'ADMIN'] },
  { prefix: '/audit', roles: ['MANAGER', 'PROCUREMENT', 'FINANCE', 'ADMIN'] },
  { prefix: '/budgets', roles: ['EMPLOYEE', 'MANAGER', 'PROCUREMENT', 'FINANCE', 'ADMIN'] },
  { prefix: '/requests', roles: ['EMPLOYEE', 'MANAGER', 'PROCUREMENT', 'ADMIN'] },
  { prefix: '/dashboard', roles: ['EMPLOYEE', 'MANAGER', 'PROCUREMENT', 'FINANCE', 'ADMIN'] },
];

export function canAccessPath(role: string | undefined, pathname: string) {
  if (!role) return false;
  const rule = [...routeRules].sort((a, b) => b.prefix.length - a.prefix.length).find(r => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return !rule || rule.roles.includes(role as AppRole);
}

export function hasRole(role: string | undefined, ...roles: AppRole[]) {
  return !!role && roles.includes(role as AppRole);
}

export function canCreatePurchaseRequest(role: string | undefined) {
  return hasRole(role, 'EMPLOYEE');
}

export function canManageVendors(role: string | undefined) {
  return hasRole(role, 'PROCUREMENT', 'ADMIN');
}

export function canCreateBudget(role: string | undefined) {
  return hasRole(role, 'MANAGER', 'FINANCE', 'ADMIN');
}

export function canApprovePurchaseRequest(role: string | undefined) {
  return hasRole(role, 'MANAGER', 'ADMIN');
}

export function canManageSourcing(role: string | undefined) {
  return hasRole(role, 'PROCUREMENT', 'ADMIN');
}

export function canApprovePurchaseOrder(role: string | undefined) {
  return hasRole(role, 'MANAGER', 'FINANCE', 'ADMIN');
}

export function canExecutePurchaseOrder(role: string | undefined) {
  return hasRole(role, 'PROCUREMENT', 'ADMIN');
}

export function canCreateInvoice(role: string | undefined) {
  return hasRole(role, 'FINANCE', 'PROCUREMENT', 'ADMIN');
}

export function canVerifyInvoice(role: string | undefined) {
  return hasRole(role, 'FINANCE', 'ADMIN');
}
