const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type User = { id: string; name: string; email: string; role: string; organizationId: string; departmentId?: string }; 
let accessToken: string | null = null;
export const tokenStore = { get: () => accessToken, set: (token: string | null) => { accessToken = token; } };

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  if (res.status === 401 && !retried && path !== '/api/auth/login') {
    const refreshed = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) {
      const data = await refreshed.json(); tokenStore.set(data.accessToken); return request<T>(path, init, true);
    }
  }
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message ?? `Request failed (${res.status})`); }
  return res.json();
}

export const api = {
  login: (body: { email: string; password: string; organizationSlug: string }) => request<{ accessToken: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  refresh: () => request<{ accessToken: string; user: User }>('/api/auth/refresh', { method: 'POST' }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<any>('/api/auth/me'),
  setupStatus: () => request<{initialized:boolean}>('/api/setup/status'),
  initializeSetup: (body: any) => request<any>('/api/setup/initialize', { method: 'POST', body: JSON.stringify(body) }),

  organization: () => request<any>('/api/organization'),
  renameOrganization: (name: string) => request<any>('/api/organization', { method: 'PATCH', body: JSON.stringify({ name }) }),
  attachments: (entityType: string, entityId: string) => request<any[]>(`/api/attachments?${new URLSearchParams({ entityType, entityId })}`),
  uploadAttachment: async (entityType: string, entityId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const makeHeaders = (token: string | null) => {
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    };
    let res = await fetch(`${API}/api/attachments?${new URLSearchParams({ entityType, entityId })}`, { method: 'POST', headers: makeHeaders(tokenStore.get()), body: form, credentials: 'include' });
    if (res.status === 401) {
      const refreshed = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshed.ok) {
        const data = await refreshed.json();
        tokenStore.set(data.accessToken);
        res = await fetch(`${API}/api/attachments?${new URLSearchParams({ entityType, entityId })}`, { method: 'POST', headers: makeHeaders(data.accessToken), body: form, credentials: 'include' });
      }
    }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message ?? `Upload failed (${res.status})`); }
    return res.json();
  },
  downloadAttachment: async (id: string) => {
    const headers = new Headers();
    const token = tokenStore.get();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let res = await fetch(`${API}/api/attachments/${id}/download`, { headers, credentials: 'include' });
    if (res.status === 401) {
      const refreshed = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshed.ok) {
        const data = await refreshed.json();
        tokenStore.set(data.accessToken);
        headers.set('Authorization', `Bearer ${data.accessToken}`);
        res = await fetch(`${API}/api/attachments/${id}/download`, { headers, credentials: 'include' });
      }
    }
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const contentType = res.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) { const data = await res.json(); window.open(data.url, '_blank', 'noopener,noreferrer'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  dashboard: () => request<any>('/api/dashboard'),
  requests: (status?: string) => request<any[]>(`/api/purchase-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  request: (id: string) => request<any>(`/api/purchase-requests/${id}`),
  createRequest: (body: any) => request<any>('/api/purchase-requests', { method: 'POST', body: JSON.stringify(body) }),
  submitRequest: (id: string) => request<any>(`/api/purchase-requests/${id}/submit`, { method: 'POST' }),
  decideRequest: (id: string, body: any) => request<any>(`/api/purchase-requests/${id}/decision`, { method: 'POST', body: JSON.stringify(body) }),
  cancelRequest: (id: string) => request<any>(`/api/purchase-requests/${id}/cancel`, { method: 'POST' }),
  vendors: (q?: string) => request<any[]>(`/api/vendors${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createVendor: (body: any) => request<any>('/api/vendors', { method: 'POST', body: JSON.stringify(body) }),
  createBudget: (body: any) => request<any>('/api/budgets', { method: 'POST', body: JSON.stringify(body) }),
  createDepartment: (body: any) => request<any>('/api/organization/departments', { method: 'POST', body: JSON.stringify(body) }),
  createUser: (body: any) => request<any>('/api/organization/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: any) => request<any>(`/api/organization/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  rfqs: () => request<any[]>('/api/rfqs'),
  createRfq: (body: any) => request<any>('/api/rfqs', { method: 'POST', body: JSON.stringify(body) }),
  inviteVendors: (rfqId: string, vendorIds: string[]) => request<any>(`/api/rfqs/${rfqId}/invitations`, { method: 'POST', body: JSON.stringify({ vendorIds }) }),
  createQuote: (rfqId: string, body: any) => request<any>(`/api/rfqs/${rfqId}/quotes`, { method: 'POST', body: JSON.stringify(body) }),
  selectQuote: (rfqId: string, quoteId: string, body: any = {}) => request<any>(`/api/rfqs/${rfqId}/select/${quoteId}`, { method: 'POST', body: JSON.stringify(body) }),
  orders: () => request<any[]>('/api/purchase-orders'),
  order: (id: string) => request<any>(`/api/purchase-orders/${id}`),
  createOrder: (quoteId: string) => request<any>(`/api/purchase-orders/from-quote/${quoteId}`, { method: 'POST' }),
  approveOrder: (id: string) => request<any>(`/api/purchase-orders/${id}/approve`, { method: 'POST' }),
  issueOrder: (id: string) => request<any>(`/api/purchase-orders/${id}/issue`, { method: 'POST' }),
  createReceipt: (poId: string, body: any) => request<any>(`/api/goods-receipts/${poId}`, { method: 'POST', body: JSON.stringify(body) }),
  invoices: () => request<any[]>('/api/invoices'),
  invoice: (id: string) => request<any>(`/api/invoices/${id}`),
  createInvoice: (body: any) => request<any>('/api/invoices', { method: 'POST', body: JSON.stringify(body) }),
  verifyInvoice: (id: string) => request<any>(`/api/invoices/${id}/verify`, { method: 'POST' }),
  approveInvoice: (id: string) => request<any>(`/api/invoices/${id}/approve`, { method: 'POST' }),
  rejectInvoice: (id: string, reason: string) => request<any>(`/api/invoices/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  budgets: () => request<any[]>('/api/budgets'),
  users: () => request<any[]>('/api/users'),
  notifications: () => request<any[]>('/api/notifications'),
  readNotification: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  audit: (entityType?: string, entityId?: string) => request<any[]>(`/api/audit?${new URLSearchParams({ ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) })}`),
};
