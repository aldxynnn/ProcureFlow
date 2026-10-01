'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '../../../lib/format';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/badge';
import { Table, Th, Td } from '../../../components/table';
import { EmptyNotice, ErrorNotice } from '../../../components/notice';
import { AttachmentPanel } from '../../../components/attachment-panel';
import { CheckIcon, ReceiptIcon, ShieldIcon, XIcon } from '../../../components/icons';

export default function InvoicesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: api.invoices });
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders });
  const [poId, setPoId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [tax, setTax] = useState('0');
  const [lineQty, setLineQty] = useState<Record<string, string>>({});
  const [linePrices, setLinePrices] = useState<Record<string, string>>({});
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const invalidate = async () => Promise.all([
    qc.invalidateQueries({ queryKey: ['invoices'] }),
    qc.invalidateQueries({ queryKey: ['orders'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
    qc.invalidateQueries({ queryKey: ['budgets'] }),
    qc.invalidateQueries({ queryKey: ['audit'] }),
  ]);

  const eligibleOrders = useMemo(() => (orders.data ?? []).filter((o: any) => ['ISSUED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].includes(o.status)), [orders.data]);
  const selectedPo = eligibleOrders.find((o: any) => o.id === poId);

  function choosePo(id: string) {
    setPoId(id);
    const po = eligibleOrders.find((o: any) => o.id === id);
    const nextQty: Record<string, string> = {}; const nextPrices: Record<string, string> = {};
    (po?.items ?? []).forEach((item: any) => { nextQty[item.id] = Number(item.quantityReceived) > 0 ? String(item.quantityReceived) : ''; nextPrices[item.id] = (Number(item.unitPriceCents) / 100).toFixed(0); });
    setLineQty(nextQty); setLinePrices(nextPrices);
  }

  const create = useMutation({
    mutationFn: () => api.createInvoice({ purchaseOrderId: poId, invoiceNumber: invoiceNumber.trim(), invoiceDate, tax: Number(tax || 0), items: (selectedPo?.items ?? []).filter((item: any) => Number(lineQty[item.id]) > 0).map((item: any) => ({ purchaseOrderItemId: item.id, quantityInvoiced: Number(lineQty[item.id]), unitPrice: Number(linePrices[item.id] || 0) })) }),
    onSuccess: async () => { setPoId(''); setInvoiceNumber(''); setTax('0'); setLineQty({}); setLinePrices({}); await invalidate(); },
  });
  const verify = useMutation({ mutationFn: (id: string) => api.verifyInvoice(id), onSuccess: invalidate });
  const approve = useMutation({ mutationFn: (id: string) => api.approveInvoice(id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectInvoice(id, reason), onSuccess: async () => { setRejectId(''); setRejectReason(''); await invalidate(); } });

  const canVerify = user?.role === 'FINANCE' || user?.role === 'ADMIN';
  const canCreate = user?.role === 'FINANCE' || user?.role === 'PROCUREMENT' || user?.role === 'ADMIN';
  const errors = [invoices.error, orders.error, create.error, verify.error, approve.error, reject.error].filter(Boolean) as Error[];
  const subtotal = (selectedPo?.items ?? []).reduce((sum: number, item: any) => sum + Number(lineQty[item.id] || 0) * Number(linePrices[item.id] || 0), 0);

  return <div className='max-w-[1380px]'>
    <PageHeader eyebrow={`${user?.role === 'PROCUREMENT' ? 'Procurement / Supplier invoice intake' : 'Finance / Invoice control'}`} title='Invoices' description='Capture supplier invoices against received goods, verify the three-way match, document discrepancies, then approve the payment-side commitment release.' action={<div className='pf-badge pf-badge-neutral'><span className='pf-badge-dot' />Three-way control</div>} />
    {canCreate ? <section className='pf-panel mb-5 p-5'><div className='pf-section-head'><div><div className='pf-card-title'>Record supplier invoice</div><div className='pf-card-subtitle'>An invoice is submitted first. Verification and approval are separate finance controls.</div></div><span className='pf-step-dot'><ReceiptIcon size={13} /></span></div>
      <div className='mt-4 grid gap-3 md:grid-cols-4'><select className='pf-input md:col-span-2' value={poId} onChange={e => choosePo(e.target.value)}><option value=''>Choose an issued / received PO</option>{eligibleOrders.map((po: any) => <option key={po.id} value={po.id}>{po.number} · {po.vendor.displayName} · {formatCurrency(po.totalCents)}</option>)}</select><input className='pf-input' value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder='Supplier invoice number' /><input className='pf-input' type='date' value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
      {selectedPo ? <><div className='mt-4 rounded-[11px] border border-slate-200 bg-slate-50 p-4'><div className='grid gap-3 sm:grid-cols-3'><div><div className='pf-label'>Supplier</div><div className='mt-1 text-[11px] font-semibold'>{selectedPo.vendor.displayName}</div></div><div><div className='pf-label'>PO value</div><div className='mt-1 text-[11px] font-semibold'>{formatCurrency(selectedPo.totalCents)}</div></div><div><div className='pf-label'>Goods received</div><div className='mt-1 text-[11px] font-semibold'>{selectedPo.items.reduce((s: number, i: any) => s + Number(i.quantityReceived), 0)} units</div></div></div></div>
        <div className='mt-4 overflow-hidden rounded-[11px] border border-slate-200'><Table><thead><tr><Th>PO line</Th><Th>Received</Th><Th>Invoice qty</Th><Th>Invoice unit price</Th><Th>Line total</Th></tr></thead><tbody>{selectedPo.items.map((item: any) => { const qty = Number(lineQty[item.id] || 0); const unit = Number(linePrices[item.id] || 0); return <tr key={item.id}><Td className='font-semibold'>{item.description}<div className='mt-1 text-[9px] font-normal text-slate-400'>{item.unit}</div></Td><Td>{Number(item.quantityReceived)}</Td><Td><input className='pf-input max-w-[150px]' type='number' min='0' max={Number(item.quantityReceived)} step='0.0001' value={lineQty[item.id] ?? ''} onChange={e => setLineQty(current => ({ ...current, [item.id]: e.target.value }))} /></Td><Td><input className='pf-input max-w-[180px]' type='number' min='0' step='1' value={linePrices[item.id] ?? ''} onChange={e => setLinePrices(current => ({ ...current, [item.id]: e.target.value }))} /></Td><Td className='whitespace-nowrap font-semibold'>{formatCurrency(Math.round(qty * unit * 100))}</Td></tr>; })}</tbody></Table></div>
        <div className='mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end'><label className='pf-field'><span>Tax (IDR)</span><input className='pf-input w-[180px]' type='number' min='0' step='1' value={tax} onChange={e => setTax(e.target.value)} /></label><div className='text-right'><div className='pf-label'>Invoice total</div><div className='mt-1 text-[20px] font-bold tracking-[-.03em]'>{formatCurrency(Math.round(subtotal * 100) + Math.round(Number(tax || 0) * 100))}</div><button className='pf-btn pf-btn-primary mt-3' disabled={!invoiceNumber.trim() || !(selectedPo.items ?? []).some((i: any) => Number(lineQty[i.id]) > 0) || create.isPending} onClick={() => create.mutate()}><ReceiptIcon size={14} />{create.isPending ? 'Submitting…' : 'Submit invoice'}</button></div></div></> : <div className='mt-4 rounded-[11px] border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-500'>Choose a PO to map received quantities into the supplier invoice.</div>}
    </section> : null}
    {errors.map((error, index) => <div key={`${error.message}-${index}`} className='mb-3'><ErrorNotice message={error.message} /></div>)}
    <section className='pf-panel overflow-hidden'><div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5'><div><div className='pf-card-title'>Invoice register</div><div className='pf-card-subtitle'>Submission, match result, finance decision and supporting documents.</div></div><div className='pf-badge pf-badge-neutral'><span className='pf-badge-dot' />{invoices.data?.length ?? 0} invoices</div></div>
      {invoices.isLoading ? <div className='p-7 text-[11px] text-slate-500'>Loading invoices…</div> : !invoices.data?.length ? <div className='p-4'><EmptyNotice>No supplier invoices have been recorded yet.</EmptyNotice></div> : <div className='divide-y divide-slate-100'>{invoices.data.map((invoice: any) => <article key={invoice.id} className='p-5 md:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'><div><div className='flex flex-wrap items-center gap-2'><span className='pf-label'>{invoice.invoiceNumber}</span><StatusBadge value={invoice.status} /><StatusBadge value={invoice.matchResult} /></div><h2 className='mt-2 text-[16px] font-bold tracking-[-.02em]'>{invoice.vendor.displayName}</h2><p className='mt-1 text-[10px] text-slate-500'>PO {invoice.purchaseOrder.number} · invoice date {formatDate(invoice.invoiceDate)} · total <span className='font-semibold text-slate-700'>{formatCurrency(invoice.totalCents)}</span></p></div><div className='flex flex-wrap gap-2'>{canVerify && invoice.status === 'SUBMITTED' ? <button className='pf-btn' disabled={verify.isPending} onClick={() => verify.mutate(invoice.id)}><ShieldIcon size={14} />{verify.isPending ? 'Verifying…' : 'Run three-way match'}</button> : null}{canVerify && invoice.status === 'VERIFIED' ? <button className='pf-btn pf-btn-primary' disabled={approve.isPending} onClick={() => approve.mutate(invoice.id)}><CheckIcon size={14} />{approve.isPending ? 'Approving…' : 'Approve invoice'}</button> : null}{canVerify && ['SUBMITTED','DISCREPANCY'].includes(invoice.status) ? <button className='pf-btn' onClick={() => { setRejectId(invoice.id); setRejectReason(invoice.rejectionReason ?? ''); }}><XIcon size={14} />Reject</button> : null}</div></div>
        {invoice.matchingNotes ? <div className={`mt-4 rounded-[11px] border p-4 ${invoice.matchResult === 'DISCREPANCY' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><div className='text-[10px] font-bold uppercase tracking-[.1em]'>Matching notes</div><pre className='mt-2 whitespace-pre-wrap font-sans text-[10px] leading-5 text-slate-700'>{invoice.matchingNotes}</pre></div> : null}
        <div className='mt-4 grid gap-5 xl:grid-cols-[1fr_380px]'><Table><thead><tr><Th>Line</Th><Th>Qty</Th><Th>Unit price</Th><Th>Amount</Th></tr></thead><tbody>{invoice.items.map((item: any) => <tr key={item.id}><Td className='font-semibold'>{item.description}<div className='mt-1 text-[9px] font-normal text-slate-400'>{item.unit}</div></Td><Td>{Number(item.quantityInvoiced)}</Td><Td>{formatCurrency(item.unitPriceCents)}</Td><Td className='font-semibold'>{formatCurrency(Math.round(Number(item.quantityInvoiced) * Number(item.unitPriceCents)))}</Td></tr>)}</tbody></Table><div className='space-y-4'><div className='pf-panel-soft p-4'><div className='pf-label'>Control timeline</div><div className='mt-3 space-y-2 text-[10px]'><div className='flex justify-between gap-4'><span className='text-slate-500'>Submitted</span><span className='font-semibold'>{formatDateTime(invoice.submittedAt)}</span></div><div className='flex justify-between gap-4'><span className='text-slate-500'>Verified</span><span className='font-semibold'>{formatDateTime(invoice.verifiedAt)}</span></div><div className='flex justify-between gap-4'><span className='text-slate-500'>Approved</span><span className='font-semibold'>{formatDateTime(invoice.approvedAt)}</span></div>{invoice.rejectedAt ? <div className='flex justify-between gap-4'><span className='text-slate-500'>Rejected</span><span className='font-semibold'>{formatDateTime(invoice.rejectedAt)}</span></div> : null}</div></div><AttachmentPanel entityType='Invoice' entityId={invoice.id} canUpload={canCreate} /></div></div>
        {invoice.rejectionReason ? <div className='mt-4 text-[10px] text-red-700'>Rejection reason: {invoice.rejectionReason}</div> : null}
      </article>)}</div>}
    </section>
    {rejectId ? <div className='fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4' role='dialog' aria-modal='true'><div className='w-full max-w-[520px] rounded-[16px] bg-white p-6 shadow-2xl'><div className='text-[15px] font-bold text-slate-900'>Reject invoice</div><p className='mt-2 text-[11px] leading-5 text-slate-500'>A rejection reason is persisted in the invoice and audit trail.</p><textarea className='pf-input mt-4 min-h-[120px] resize-y' value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder='Explain the discrepancy or required correction…' /><div className='mt-4 flex justify-end gap-2'><button className='pf-btn' onClick={() => { setRejectId(''); setRejectReason(''); }}>Cancel</button><button className='pf-btn pf-btn-danger' disabled={!rejectReason.trim() || reject.isPending} onClick={() => reject.mutate({ id: rejectId, reason: rejectReason.trim() })}>{reject.isPending ? 'Rejecting…' : 'Reject invoice'}</button></div></div></div> : null}
  </div>;
}
