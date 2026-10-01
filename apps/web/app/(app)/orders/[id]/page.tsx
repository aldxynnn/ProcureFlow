'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../lib/auth';
import { api } from '../../../../lib/api';
import { formatCurrency, formatDate, formatDateTime } from '../../../../lib/format';
import { PageHeader } from '../../../../components/page-header';
import { StatusBadge } from '../../../../components/badge';
import { Table, Th, Td } from '../../../../components/table';
import { ErrorNotice } from '../../../../components/notice';
import { AttachmentPanel } from '../../../../components/attachment-panel';
import { ArrowUpRightIcon, ShoppingCartIcon } from '../../../../components/icons';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['order', params.id], queryFn: () => api.order(params.id), enabled: Boolean(params.id) });
  if (q.isLoading) return <div className='pf-loading-screen'><div className='pf-spinner' />Loading purchase order</div>;
  if (q.error) return <div className='max-w-[960px]'><ErrorNotice message={q.error.message} /></div>;
  const po = q.data;
  if (!po) return <div className='max-w-[960px]'><ErrorNotice message='Purchase order not found.' /></div>;
  return <div className='max-w-[1220px]'>
    <PageHeader eyebrow='Purchase orders / Detail' title={po.number} description={`${po.vendor.displayName} · ${formatCurrency(po.totalCents)} · created ${formatDate(po.createdAt)}`} action={<Link href='/orders' className='pf-btn'>Back to orders</Link>} />
    <div className='grid gap-5 xl:grid-cols-[1.25fr_.75fr]'>
      <section className='pf-panel overflow-hidden'><div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5'><div><div className='pf-label'>Order status</div><div className='mt-2 flex items-center gap-2'><StatusBadge value={po.status} /><span className='text-[10px] text-slate-500'>{po.vendor.displayName}</span></div></div><ShoppingCartIcon size={18} className='text-slate-400' /></div><Table><thead><tr><Th>Description</Th><Th>Ordered</Th><Th>Received</Th><Th>Unit price</Th><Th>Line total</Th></tr></thead><tbody>{po.items.map((item: any) => <tr key={item.id}><Td className='font-semibold'>{item.description}<div className='mt-1 text-[9px] font-normal text-slate-400'>{item.unit}</div></Td><Td>{Number(item.quantityOrdered)}</Td><Td>{Number(item.quantityReceived)}</Td><Td>{formatCurrency(item.unitPriceCents)}</Td><Td className='font-semibold'>{formatCurrency(Math.round(Number(item.quantityOrdered) * Number(item.unitPriceCents)))}</Td></tr>)}</tbody></Table></section>
      <aside className='space-y-5'><section className='pf-panel p-5'><div className='pf-card-title'>Control timeline</div><div className='mt-4 space-y-3 text-[10px]'><div className='flex justify-between gap-3'><span className='text-slate-500'>Created</span><strong>{formatDateTime(po.createdAt)}</strong></div><div className='flex justify-between gap-3'><span className='text-slate-500'>Approved</span><strong>{po.approvedBy?.name ? `${po.approvedBy.name} · ${formatDateTime(po.approvedAt)}` : 'Pending'}</strong></div><div className='flex justify-between gap-3'><span className='text-slate-500'>Issued</span><strong>{formatDateTime(po.issuedAt)}</strong></div><div className='flex justify-between gap-3'><span className='text-slate-500'>Closed</span><strong>{formatDateTime(po.closedAt)}</strong></div></div></section><AttachmentPanel entityType='PurchaseOrder' entityId={po.id} canUpload={user?.role === 'PROCUREMENT' || user?.role === 'FINANCE' || user?.role === 'ADMIN'} /><section className='pf-panel-soft p-4'><div className='pf-label'>Commercial source</div><div className='mt-2 text-[10px] leading-5 text-slate-600'>This PO was created from the selected supplier quotation recorded in the sourcing workflow.</div>{po.sourceQuote?.rfq?.purchaseRequest?.id && user?.role !== 'FINANCE' ? <Link href={`/requests/${po.sourceQuote.rfq.purchaseRequest.id}`} className='pf-link mt-3 inline-flex items-center gap-1'>Open purchase request <ArrowUpRightIcon size={12} /></Link> : null}</section></aside>
    </div>
  </div>;
}
