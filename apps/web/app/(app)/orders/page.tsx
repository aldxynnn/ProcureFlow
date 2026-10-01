'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '../../../lib/format';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/badge';
import { Table, Th, Td } from '../../../components/table';
import { ErrorNotice, EmptyNotice } from '../../../components/notice';
import { AttachmentPanel } from '../../../components/attachment-panel';
import { ArrowUpRightIcon, CheckIcon, ReceiptIcon, ShoppingCartIcon } from '../../../components/icons';

export default function OrdersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders });
  const rfqs = useQuery({ queryKey: ['rfqs'], queryFn: api.rfqs, enabled: user?.role === 'PROCUREMENT' || user?.role === 'ADMIN' });
  const [createQuoteId, setCreateQuoteId] = useState('');
  const [receiptPoId, setReceiptPoId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptItems, setReceiptItems] = useState<Record<string, string>>({});

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['orders'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
      qc.invalidateQueries({ queryKey: ['invoices'] }),
      qc.invalidateQueries({ queryKey: ['budgets'] }),
      qc.invalidateQueries({ queryKey: ['audit'] }),
    ]);
  };

  const create = useMutation({
    mutationFn: () => api.createOrder(createQuoteId),
    onSuccess: async () => { setCreateQuoteId(''); await invalidate(); },
  });
  const approve = useMutation({ mutationFn: (id: string) => api.approveOrder(id), onSuccess: invalidate });
  const issue = useMutation({ mutationFn: (id: string) => api.issueOrder(id), onSuccess: invalidate });
  const receipt = useMutation({
    mutationFn: (id: string) => api.createReceipt(id, {
      receiptNumber: receiptNumber.trim() || undefined,
      note: receiptNote.trim() || undefined,
      items: Object.entries(receiptItems)
        .filter(([, value]) => Number(value) > 0)
        .map(([purchaseOrderItemId, quantityReceived]) => ({ purchaseOrderItemId, quantityReceived: Number(quantityReceived) })),
    }),
    onSuccess: async () => { setReceiptPoId(''); setReceiptNumber(''); setReceiptNote(''); setReceiptItems({}); await invalidate(); },
  });

  const selectedQuotes = useMemo(() => {
    const existing = new Set((orders.data ?? []).map((po: any) => po.sourceQuote?.id).filter(Boolean));
    return (rfqs.data ?? []).flatMap((rfq: any) => (rfq.quotes ?? [])
      .filter((quote: any) => quote.status === 'SELECTED' && !existing.has(quote.id))
      .map((quote: any) => ({ rfq, quote })));
  }, [rfqs.data]);
  const allErrors = [orders.error, create.error, approve.error, issue.error, receipt.error].filter(Boolean) as Error[];
  const canApprove = user?.role === 'MANAGER' || user?.role === 'FINANCE' || user?.role === 'ADMIN';
  const canIssue = user?.role === 'PROCUREMENT' || user?.role === 'ADMIN';
  const canReceive = user?.role === 'PROCUREMENT' || user?.role === 'ADMIN';

  return (
    <div className='max-w-[1380px]'>
      <PageHeader eyebrow='Source & buy / Execution' title='Purchase orders' description='Control the commitment created from a selected supplier quote, route the PO for approval, issue it, then record delivery against the exact ordered lines.' action={user?.role === 'PROCUREMENT' || user?.role === 'ADMIN' ? <Link href='/rfqs' className='pf-btn'><ArrowUpRightIcon size={14} /> Sourcing workspace</Link> : user?.role === 'MANAGER' ? <Link href='/requests' className='pf-btn'><ArrowUpRightIcon size={14} /> Approval queue</Link> : <Link href='/invoices' className='pf-btn'><ArrowUpRightIcon size={14} /> Invoice control</Link>} />
      {(user?.role === 'PROCUREMENT' || user?.role === 'ADMIN') && <section className='pf-panel mb-5 p-5'>
        <div className='pf-section-head'><div><div className='pf-card-title'>Create purchase order</div><div className='pf-card-subtitle'>Only a selected quotation can become a PO. Creation starts the approval chain; it does not issue the order.</div></div><span className='pf-step-dot'><ShoppingCartIcon size={13} /></span></div>
        <div className='mt-4 flex flex-col gap-3 lg:flex-row'><select className='pf-input flex-1' value={createQuoteId} onChange={e => setCreateQuoteId(e.target.value)}><option value=''>Select awarded quotation</option>{selectedQuotes.map(({ rfq, quote }: any) => <option key={quote.id} value={quote.id}>{rfq.number} · {quote.vendor.displayName} · {formatCurrency(quote.totalCents)}</option>)}</select><button className='pf-btn pf-btn-primary' disabled={!createQuoteId || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create PO'}</button></div>
        {!selectedQuotes.length && !rfqs.isLoading ? <p className='mt-3 text-[10px] text-slate-500'>No selected quotations are ready. Complete sourcing and vendor selection first.</p> : null}
      </section>}
      {allErrors.map((error, index) => <div key={`${error.message}-${index}`} className='mb-3'><ErrorNotice message={error.message} /></div>)}
      <section className='pf-panel overflow-hidden'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5'><div><div className='pf-card-title'>Order register</div><div className='pf-card-subtitle'>Lifecycle: draft → approved → issued → received → closed.</div></div><div className='pf-badge pf-badge-neutral'><span className='pf-badge-dot' />{orders.data?.length ?? 0} orders</div></div>
        {orders.isLoading ? <div className='p-7 text-[11px] text-slate-500'>Loading purchase orders…</div> : !orders.data?.length ? <div className='p-4'><EmptyNotice>No purchase orders have been created yet.</EmptyNotice></div> : <div className='divide-y divide-slate-100'>{orders.data.map((po: any) => {
          const outstanding = po.items.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.quantityOrdered) - Number(item.quantityReceived)), 0);
          const receiptActive = receiptPoId === po.id;
          return <article key={po.id} className='p-5 md:p-6'>
            <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'><div className='min-w-0'><div className='flex flex-wrap items-center gap-2'><span className='pf-label'>{po.number}</span><StatusBadge value={po.status} /></div><h2 className='mt-2 truncate text-[17px] font-bold tracking-[-.02em] text-slate-900'>{po.vendor.displayName}</h2><p className='mt-1 text-[10px] text-slate-500'>Created {formatDate(po.createdAt)} · Total <span className='font-semibold text-slate-700'>{formatCurrency(po.totalCents)}</span></p></div><div className='flex flex-wrap items-center gap-2'>{canApprove && po.status === 'DRAFT' && !po.approvedAt ? <button className='pf-btn pf-btn-primary' disabled={approve.isPending} onClick={() => approve.mutate(po.id)}><CheckIcon size={14} />{approve.isPending ? 'Approving…' : 'Approve PO'}</button> : null}{canIssue && po.status === 'DRAFT' && po.approvedAt ? <button className='pf-btn pf-btn-primary' disabled={issue.isPending} onClick={() => issue.mutate(po.id)}><ShoppingCartIcon size={14} />{issue.isPending ? 'Issuing…' : 'Issue PO'}</button> : null}<Link href={`/orders/${po.id}`} className='pf-btn'><ArrowUpRightIcon size={14} /> Open</Link></div></div>
            <div className='mt-5 grid gap-3 sm:grid-cols-3'><div className='pf-panel-soft p-3'><div className='pf-label'>Approval</div><div className='mt-1 text-[10.5px] font-semibold'>{po.approvedBy?.name ?? 'Pending approval'}</div>{po.approvedAt ? <div className='mt-1 text-[9px] text-slate-400'>{formatDateTime(po.approvedAt)}</div> : null}</div><div className='pf-panel-soft p-3'><div className='pf-label'>Delivery balance</div><div className='mt-1 text-[10.5px] font-semibold'>{outstanding} units outstanding</div><div className='mt-1 text-[9px] text-slate-400'>Across all order lines</div></div><div className='pf-panel-soft p-3'><div className='pf-label'>Issued</div><div className='mt-1 text-[10.5px] font-semibold'>{formatDateTime(po.issuedAt)}</div></div></div>
            <div className='mt-5 overflow-hidden rounded-[11px] border border-slate-200'><Table><thead><tr><Th>Item</Th><Th>Ordered</Th><Th>Received</Th><Th>Unit price</Th><Th>Open qty</Th></tr></thead><tbody>{po.items.map((item: any) => <tr key={item.id}><Td className='font-semibold text-slate-800'>{item.description}<div className='mt-1 text-[9px] font-normal text-slate-400'>{item.unit}</div></Td><Td>{Number(item.quantityOrdered)}</Td><Td>{Number(item.quantityReceived)}</Td><Td className='whitespace-nowrap'>{formatCurrency(item.unitPriceCents)}</Td><Td>{Math.max(0, Number(item.quantityOrdered) - Number(item.quantityReceived))}</Td></tr>)}</tbody></Table></div>
            {canReceive && (po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED') && outstanding > 0 ? <div className='mt-5 border-t border-slate-100 pt-5'><div className='flex items-start gap-3'><span className='pf-step-dot'><ReceiptIcon size={13} /></span><div><div className='pf-card-title'>Record goods receipt</div><div className='pf-card-subtitle'>Record only what physically arrived. Partial receipts are supported.</div></div></div><div className='mt-4 grid gap-3 md:grid-cols-[1fr_180px]'><input className='pf-input' value={receiptNumber} onChange={e => { setReceiptPoId(po.id); setReceiptNumber(e.target.value); }} placeholder='Receipt number (optional; system can generate one)' /><input className='pf-input' value={receiptNote} onChange={e => { setReceiptPoId(po.id); setReceiptNote(e.target.value); }} placeholder='Receiving note' /></div><div className='mt-3 grid gap-2'>{po.items.filter((item: any) => Number(item.quantityOrdered) > Number(item.quantityReceived)).map((item: any) => { const remaining = Number(item.quantityOrdered) - Number(item.quantityReceived); return <label key={item.id} className='grid gap-2 rounded-[10px] border border-slate-200 p-3 sm:grid-cols-[1fr_150px] sm:items-center'><span><span className='block text-[10.5px] font-semibold text-slate-800'>{item.description}</span><span className='mt-1 block text-[9px] text-slate-400'>Remaining {remaining} {item.unit}</span></span><input className='pf-input' type='number' min='0' max={remaining} step='0.0001' value={receiptActive ? (receiptItems[item.id] ?? '') : ''} onChange={e => { setReceiptPoId(po.id); setReceiptItems(current => ({ ...current, [item.id]: e.target.value })); }} placeholder='Received qty' /></label>; })}</div><button className='pf-btn pf-btn-primary mt-3' disabled={receiptPoId !== po.id || receipt.isPending || !Object.values(receiptItems).some(v => Number(v) > 0)} onClick={() => receipt.mutate(po.id)}><ReceiptIcon size={14} />{receipt.isPending ? 'Recording…' : 'Record receipt'}</button>{receipt.error && receiptPoId === po.id ? <div className='mt-3'><ErrorNotice message={receipt.error.message} /></div> : null}</div> : null}
            <div className='mt-5 grid gap-5 lg:grid-cols-[1fr_380px]'><div className='rounded-[11px] border border-slate-200 bg-slate-50 p-4'><div className='flex items-center gap-2'><ReceiptIcon size={14} className='text-slate-400' /><div className='pf-label'>Next control</div></div><p className='mt-2 text-[10px] leading-5 text-slate-500'>{po.status === 'DRAFT' && !po.approvedAt ? 'Approval is required before this PO can be issued.' : po.status === 'DRAFT' ? 'The PO is approved and ready for procurement to issue.' : outstanding > 0 ? 'Record remaining delivery as goods arrive.' : 'All ordered quantities have been received.'}</p></div><AttachmentPanel entityType='PurchaseOrder' entityId={po.id} canUpload={canIssue || user?.role === 'FINANCE'} /></div>
          </article>
        })}</div>}
      </section>
    </div>
  );
}
