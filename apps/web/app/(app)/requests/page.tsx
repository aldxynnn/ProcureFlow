'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/badge';
import { Table, Th, Td } from '../../../components/table';
import { EmptyNotice, ErrorNotice } from '../../../components/notice';
import { ArrowUpRightIcon, CheckIcon, FileTextIcon, XIcon } from '../../../components/icons';
import { formatCurrency, formatDate } from '../../../lib/format';

export default function RequestsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['requests'], queryFn: () => api.requests() });
  const requests = q.data ?? [];
  const pending = requests.filter((r: any) => r.status === 'PENDING_APPROVAL');
  const approved = requests.filter((r: any) => r.status === 'APPROVED').length;
  const isManager = user?.role === 'MANAGER';
  const canCreate = user?.role === 'EMPLOYEE';
  const isProcurement = user?.role === 'PROCUREMENT';

  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const decide = useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: 'APPROVED' | 'REJECTED'; comment?: string }) => api.decideRequest(id, { decision, comment }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['requests'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['request'] }),
      ]);
    },
  });

  const title = isManager ? 'Approval queue' : isProcurement ? 'Approved demand' : 'Purchase requests';
  const description = isManager
    ? 'Review requests submitted by your direct reports. Approval is a controlled business decision, not an administration task.'
    : isProcurement
      ? 'Review approved internal demand that is ready to enter sourcing. Requests are read-only in the procurement workspace.'
      : 'Create and track demand from draft through manager approval and sourcing.';

  return <div>
    <PageHeader
      eyebrow={isManager ? 'Manager / Approvals' : isProcurement ? 'Procurement / Demand intake' : 'Workspace / Demand'}
      title={title}
      description={description}
      action={<div className="flex flex-wrap gap-2">

        {canCreate ? <Link href="/requests/new" className="pf-btn pf-btn-primary"><FileTextIcon size={14}/>New request</Link> : null}
        {isProcurement ? <Link href="/rfqs" className="pf-btn pf-btn-primary"><ArrowUpRightIcon size={14}/>Open sourcing</Link> : null}
      </div>}
    />

    {isManager ? <section className="pf-panel mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div><div className="pf-card-title">Requests awaiting your decision</div><div className="pf-card-subtitle">Only requests belonging to your direct reports are actionable here.</div></div>
        <span className="pf-badge pf-badge-warning"><span className="pf-badge-dot"/>{pending.length} pending</span>
      </div>
      {!pending.length ? <div className="p-5"><EmptyNotice>No direct-report requests are waiting for approval.</EmptyNotice></div> : <div className="divide-y divide-slate-100">{pending.map((r: any) => <div key={r.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0"><Link href={`/requests/${r.id}`} className="text-[12px] font-bold text-slate-900 hover:text-[#0d4f67]">{r.title}</Link><div className="mt-1 text-[10px] text-slate-500">{r.requester.name} · {r.department.name} · {formatCurrency(r.items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.estimatedUnitPriceCents), 0))}</div></div>
        <div className="flex flex-wrap gap-2"><Link href={`/requests/${r.id}`} className="pf-btn">Review</Link><button className="pf-btn pf-btn-primary" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, decision: 'APPROVED' })}><CheckIcon size={13}/>Approve</button><button className="pf-btn pf-btn-danger" disabled={decide.isPending} onClick={() => { setRejectId(r.id); setRejectReason(''); }}><XIcon size={13}/>Reject</button></div>
      </div>)}</div>}
    </section> : null}

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      {isProcurement ? <>
        <div className="pf-panel p-4"><div className="pf-label">Approved demand</div><div className="mt-2 text-[21px] font-[760] tracking-[-.04em]">{requests.length}</div><div className="mt-1 text-[9.5px] text-slate-400">Requests eligible for sourcing</div></div>
        <div className="pf-panel p-4"><div className="pf-label">Already linked to RFQ</div><div className="mt-2 text-[21px] font-[760] tracking-[-.04em]">{requests.filter((r:any)=>(r.rfqs?.length??0)>0).length}</div><div className="mt-1 text-[9.5px] text-slate-400">Demand with sourcing linkage</div></div>
        <div className="pf-panel p-4"><div className="pf-label">Ready to source</div><div className="mt-2 text-[21px] font-[760] tracking-[-.04em]">{requests.filter((r:any)=>(r.rfqs?.length??0)===0).length}</div><div className="mt-1 text-[9.5px] text-slate-400">Approved requests without an RFQ</div></div>
      </> : <>
        <div className="pf-panel p-4"><div className="pf-label">Visible requests</div><div className="mt-2 text-[21px] font-[760] tracking-[-.04em]">{requests.length}</div><div className="mt-1 text-[9.5px] text-slate-400">Current role scope</div></div>
        <div className="pf-panel p-4"><div className="pf-label">Pending approval</div><div className="mt-2 text-[21px] font-[760] tracking-[-.04em]">{pending.length}</div><div className="mt-1 text-[9.5px] text-slate-400">Waiting on a manager decision</div></div>
        <div className="pf-panel p-4"><div className="pf-label">Approved</div><div className="mt-2 text-[21px] font-[760] tracking-[-.04em]">{approved}</div><div className="mt-1 text-[9.5px] text-slate-400">Eligible for sourcing</div></div>
      </>}
    </div>

    <section className="pf-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><div className="pf-card-title">Request register</div><div className="pf-card-subtitle">Sorted by most recently created.</div></div><div className="pf-badge pf-badge-neutral"><span className="pf-badge-dot"/>Live data</div></div>
      {q.isLoading ? <div className="p-6 text-[11px] text-slate-500">Loading requests…</div> : q.error ? <div className="p-4"><ErrorNotice message={q.error.message}/></div> : !requests.length ? <div className="p-4"><EmptyNotice>{isProcurement ? 'No approved requests are ready for sourcing.' : 'No purchase requests yet.'}</EmptyNotice></div> : <Table><thead><tr><Th>Request</Th><Th>Requester</Th><Th>Department</Th><Th>Value</Th><Th>Status</Th><Th>Created</Th><Th>Action</Th></tr></thead><tbody>{requests.map((r: any) => {
        const value = r.items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.estimatedUnitPriceCents), 0);
        const actionable = isManager && r.status === 'PENDING_APPROVAL' && r.requesterId !== user?.id;
        return <tr key={r.id}>
          <Td><Link className="font-semibold text-slate-800 hover:text-[#0d4f67]" href={`/requests/${r.id}`}>{r.title}</Link><div className="mt-1 text-[9px] text-slate-400">{r.id}</div></Td>
          <Td>{r.requester.name}</Td><Td>{r.department.name}</Td><Td className="whitespace-nowrap font-semibold">{formatCurrency(value)}</Td><Td><StatusBadge value={r.status}/></Td><Td className="whitespace-nowrap text-slate-500">{formatDate(r.createdAt)}</Td>
          <Td>{actionable ? <Link href={`/requests/${r.id}`} className="pf-btn">Review</Link> : <Link href={`/requests/${r.id}`} className="pf-icon-btn" aria-label="Open request"><ArrowUpRightIcon size={14}/></Link>}</Td>
        </tr>;
      })}</tbody></Table>}
    </section>
    {decide.error ? <div className="mt-4"><ErrorNotice message={decide.error.message}/></div> : null}
    {rejectId ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-[520px] rounded-[16px] bg-white p-6 shadow-2xl"><div className="text-[15px] font-bold text-slate-900">Reject purchase request</div><p className="mt-2 text-[11px] leading-5 text-slate-500">A rejection reason is required and will be retained in the approval history and audit trail.</p><textarea className="pf-input mt-4 min-h-[120px] resize-y" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Explain the reason for rejection…" /><div className="mt-4 flex justify-end gap-2"><button className="pf-btn" onClick={()=>{setRejectId('');setRejectReason('');}}>Cancel</button><button className="pf-btn pf-btn-danger" disabled={!rejectReason.trim()||decide.isPending} onClick={()=>decide.mutate({id:rejectId,decision:'REJECTED',comment:rejectReason.trim()},{onSuccess:()=>{setRejectId('');setRejectReason('');}})}>{decide.isPending?'Rejecting…':'Reject request'}</button></div></div></div> : null}
  </div>;
}
