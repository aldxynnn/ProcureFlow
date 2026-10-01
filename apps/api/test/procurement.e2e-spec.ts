import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type Session = { accessToken: string; user: any };
const PASSWORD = 'ProcureFlow123!';

async function login(app: INestApplication, email: string, slug = 'acme-e2e'): Promise<Session> {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: PASSWORD, organizationSlug: slug }).expect(201);
  return res.body;
}
function auth(token: string) { return { Authorization: `Bearer ${token}` }; }

describe('ProcureFlow golden path', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET ||= 'test-secret';
    process.env.JWT_REFRESH_SECRET ||= 'test-refresh';
    process.env.REDIS_URL ||= 'redis://localhost:6379';
    process.env.DATABASE_URL ||= 'postgresql://procureflow:procureflow@localhost:5432/procureflow?schema=public';
    process.env.FRONTEND_ORIGIN ||= 'http://localhost:3000';
    process.env.STORAGE_DRIVER ||= 'local';
    process.env.STORAGE_LOCAL_DIR ||= './tmp/uploads';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const status = await request(app.getHttpServer()).get('/api/setup/status').expect(200);
    if (!status.body.initialized) {
      await request(app.getHttpServer()).post('/api/setup/initialize').send({ organizationName: 'Acme E2E', organizationSlug: 'acme-e2e', adminName: 'E2E Admin', adminEmail: 'admin@acme-e2e.local', adminPassword: PASSWORD, departmentName: 'Engineering', departmentCode: 'ENG' }).expect(201);
    }
  });

  afterAll(async () => { await app.close(); });

  it('runs request → approval → RFQ → invitation → quotes → selection → PO approval → issue → receipt → invoice verify → approve', async () => {
    const admin = await login(app, 'admin@acme-e2e.local');
    const organization = await request(app.getHttpServer()).get('/api/organization').set(auth(admin.accessToken)).expect(200);
    const engineering = organization.body.departments.find((d: any) => d.code === 'ENG');
    expect(engineering?.id).toBeTruthy();

    const createdManager = await request(app.getHttpServer()).post('/api/organization/users').set(auth(admin.accessToken)).send({ name: 'E2E Manager', email: `manager-${Date.now()}@acme-e2e.local`, password: PASSWORD, role: 'MANAGER', departmentId: engineering.id }).expect(201);
    const manager = await login(app, createdManager.body.email);
    const createdEmployee = await request(app.getHttpServer()).post('/api/organization/users').set(auth(admin.accessToken)).send({ name: 'E2E Employee', email: `employee-${Date.now()}@acme-e2e.local`, password: PASSWORD, role: 'EMPLOYEE', departmentId: engineering.id, managerId: manager.user.id }).expect(201);
    const employee = await login(app, createdEmployee.body.email);
    const procurement = await request(app.getHttpServer()).post('/api/organization/users').set(auth(admin.accessToken)).send({ name: 'E2E Procurement', email: `procurement-${Date.now()}@acme-e2e.local`, password: PASSWORD, role: 'PROCUREMENT', departmentId: engineering.id }).expect(201);
    const finance = await request(app.getHttpServer()).post('/api/organization/users').set(auth(admin.accessToken)).send({ name: 'E2E Finance', email: `finance-${Date.now()}@acme-e2e.local`, password: PASSWORD, role: 'FINANCE', departmentId: engineering.id }).expect(201);
    const procurementSession = await login(app, procurement.body.email);
    const financeSession = await login(app, finance.body.email);

    await request(app.getHttpServer()).post('/api/purchase-requests').set(auth(manager.accessToken)).send({ departmentId: engineering.id, title: 'Manager requester boundary', justification: 'RBAC boundary check', items: [{ description: 'Test item', unit: 'unit', quantity: 1, estimatedUnitPrice: 100 }] }).expect(403);
    await request(app.getHttpServer()).post('/api/budgets').set(auth(employee.accessToken)).send({ name: `E2E Employee Budget Forbidden ${Date.now()}`, fiscalYear: new Date().getFullYear(), allocatedAmount: 1000 }).expect(403);
    await request(app.getHttpServer()).get('/api/audit').set(auth(employee.accessToken)).expect(403);
    await request(app.getHttpServer()).get('/api/purchase-requests').set(auth(financeSession.accessToken)).expect(403);
    await request(app.getHttpServer()).post('/api/purchase-requests').set(auth(procurementSession.accessToken)).send({ departmentId: engineering.id, title: 'Forbidden procurement request', justification: 'RBAC boundary check', items: [{ description: 'Test item', unit: 'unit', quantity: 1, estimatedUnitPrice: 100 }] }).expect(403);
    await request(app.getHttpServer()).post('/api/vendors').set(auth(financeSession.accessToken)).send({ legalName: 'Forbidden Finance Vendor', displayName: 'Forbidden Finance Vendor' }).expect(403);
    await request(app.getHttpServer()).get('/api/users').set(auth(employee.accessToken)).expect(403);
    await request(app.getHttpServer()).get('/api/rfqs').set(auth(manager.accessToken)).expect(403);
    await request(app.getHttpServer()).post('/api/vendors').set(auth(manager.accessToken)).send({ legalName: 'Forbidden Manager Vendor', displayName: 'Forbidden Manager Vendor' }).expect(403);

    const suffix = Date.now();
    const budget = await request(app.getHttpServer()).post('/api/budgets').set(auth(manager.accessToken)).send({ name: `E2E Operating Budget ${suffix}`, fiscalYear: new Date().getFullYear(), allocatedAmount: 500000 }).expect(201);
    const vendorA = await request(app.getHttpServer()).post('/api/vendors').set(auth(procurementSession.accessToken)).send({ legalName: `E2E Vendor A ${suffix}`, displayName: `E2E Vendor A ${suffix}`, email: `a-${suffix}@e2e-vendor.local` }).expect(201);
    const vendorB = await request(app.getHttpServer()).post('/api/vendors').set(auth(procurementSession.accessToken)).send({ legalName: `E2E Vendor B ${suffix}`, displayName: `E2E Vendor B ${suffix}`, email: `b-${suffix}@e2e-vendor.local` }).expect(201);

    const created = await request(app.getHttpServer()).post('/api/purchase-requests').set(auth(employee.accessToken)).send({ departmentId: engineering.id, budgetId: budget.body.id, title: `E2E Network Hardware ${suffix}`, justification: 'Procurement workflow integration test', neededBy: new Date(Date.now() + 14 * 86400000).toISOString(), items: [{ description: 'Network switch', unit: 'unit', quantity: 10, estimatedUnitPrice: 1250 }] }).expect(201);
    const prId = created.body.id;
    await request(app.getHttpServer()).post(`/api/purchase-requests/${prId}/submit`).set(auth(employee.accessToken)).expect(201);
    const procurementPendingView = await request(app.getHttpServer()).get('/api/purchase-requests?status=PENDING_APPROVAL').set(auth(procurementSession.accessToken)).expect(200);
    expect(procurementPendingView.body.find((r: any) => r.id === prId)).toBeUndefined();
    const approved = await request(app.getHttpServer()).post(`/api/purchase-requests/${prId}/decision`).set(auth(manager.accessToken)).send({ decision: 'APPROVED' }).expect(201);
    expect(approved.body.status).toBe('APPROVED');

    const rfqCreated = await request(app.getHttpServer()).post('/api/rfqs').set(auth(procurementSession.accessToken)).send({ purchaseRequestId: prId, responseDeadline: new Date(Date.now() + 7 * 86400000).toISOString() }).expect(201);
    const rfqId = rfqCreated.body.id;
    const rfq = await request(app.getHttpServer()).get(`/api/rfqs/${rfqId}`).set(auth(procurementSession.accessToken)).expect(200);
    const rfqItem = rfq.body.items[0];
    await request(app.getHttpServer()).post(`/api/rfqs/${rfqId}/invitations`).set(auth(procurementSession.accessToken)).send({ vendorIds: [vendorA.body.id, vendorB.body.id] }).expect(201);

    const quote1 = await request(app.getHttpServer()).post(`/api/rfqs/${rfqId}/quotes`).set(auth(procurementSession.accessToken)).send({ vendorId: vendorA.body.id, referenceNumber: `E2E-Q1-${Date.now()}`, leadTimeDays: 5, paymentTerms: 'Net 30', validUntil: new Date(Date.now() + 10 * 86400000).toISOString(), items: [{ rfqItemId: rfqItem.id, quantity: 10, unitPrice: 1150 }] }).expect(201);
    const quote2 = await request(app.getHttpServer()).post(`/api/rfqs/${rfqId}/quotes`).set(auth(procurementSession.accessToken)).send({ vendorId: vendorB.body.id, referenceNumber: `E2E-Q2-${Date.now()}`, leadTimeDays: 7, paymentTerms: 'Net 30', validUntil: new Date(Date.now() + 10 * 86400000).toISOString(), items: [{ rfqItemId: rfqItem.id, quantity: 10, unitPrice: 1200 }] }).expect(201);

    const selected = await request(app.getHttpServer()).post(`/api/rfqs/${rfqId}/select/${quote1.body.id}`).set(auth(procurementSession.accessToken)).send({ rationale: 'Lower quoted unit price' }).expect(201);
    expect(selected.body.status).toBe('CLOSED');
    expect(selected.body.quotes.find((q: any) => q.id === quote1.body.id).status).toBe('SELECTED');
    expect(selected.body.quotes.find((q: any) => q.id === quote2.body.id).status).toBe('REJECTED');

    const poCreated = await request(app.getHttpServer()).post(`/api/purchase-orders/from-quote/${quote1.body.id}`).set(auth(procurementSession.accessToken)).expect(201);
    const poId = poCreated.body.id;
    await request(app.getHttpServer()).post(`/api/purchase-orders/${poId}/issue`).set(auth(financeSession.accessToken)).expect(403);
    await request(app.getHttpServer()).post(`/api/purchase-orders/${poId}/issue`).set(auth(manager.accessToken)).expect(403);
    await request(app.getHttpServer()).post(`/api/purchase-orders/${poId}/approve`).set(auth(manager.accessToken)).expect(201);
    const issued = await request(app.getHttpServer()).post(`/api/purchase-orders/${poId}/issue`).set(auth(procurementSession.accessToken)).expect(201);
    expect(issued.body.status).toBe('ISSUED');

    const po = await request(app.getHttpServer()).get(`/api/purchase-orders/${poId}`).set(auth(procurementSession.accessToken)).expect(200);
    const poItem = po.body.items[0];
    await request(app.getHttpServer()).post(`/api/goods-receipts/${poId}`).set(auth(procurementSession.accessToken)).send({ receiptNumber: `GR-${Date.now()}-1`, items: [{ purchaseOrderItemId: poItem.id, quantityReceived: 6 }] }).expect(201);
    await request(app.getHttpServer()).post(`/api/goods-receipts/${poId}`).set(auth(procurementSession.accessToken)).send({ receiptNumber: `GR-${Date.now()}-2`, items: [{ purchaseOrderItemId: poItem.id, quantityReceived: 4 }] }).expect(201);

    const invoice = await request(app.getHttpServer()).post('/api/invoices').set(auth(financeSession.accessToken)).send({ purchaseOrderId: poId, invoiceNumber: `INV-E2E-${Date.now()}`, invoiceDate: new Date().toISOString(), items: [{ purchaseOrderItemId: poItem.id, quantityInvoiced: 10, unitPrice: 1150 }] }).expect(201);
    expect(invoice.body.status).toBe('SUBMITTED');
    await request(app.getHttpServer()).post(`/api/invoices/${invoice.body.id}/verify`).set(auth(procurementSession.accessToken)).expect(403);
    const verified = await request(app.getHttpServer()).post(`/api/invoices/${invoice.body.id}/verify`).set(auth(financeSession.accessToken)).expect(201);
    expect(verified.body.status).toBe('VERIFIED');
    expect(verified.body.matchResult).toBe('MATCH');
    const approvedInvoice = await request(app.getHttpServer()).post(`/api/invoices/${invoice.body.id}/approve`).set(auth(financeSession.accessToken)).expect(201);
    expect(approvedInvoice.body.status).toBe('APPROVED');
  });
});
