'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/badge';
import { Table, Th, Td } from '../../../components/table';
import { EmptyNotice, ErrorNotice } from '../../../components/notice';
import { BuildingIcon, SearchIcon, PlusIcon } from '../../../components/icons';

export default function VendorsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['vendors', search], queryFn: () => api.vendors(search) });
  const [legalName,setLegalName]=useState(''); const [displayName,setDisplayName]=useState(''); const [email,setEmail]=useState(''); const [contact,setContact]=useState('');
  const canManage = user?.role === 'PROCUREMENT' || user?.role === 'ADMIN';
  const m=useMutation({mutationFn:()=>api.createVendor({legalName,displayName:displayName||legalName,email,contact:contact?{name:contact,email}:undefined}),onSuccess:async()=>{setLegalName('');setDisplayName('');setEmail('');setContact('');await qc.invalidateQueries({queryKey:['vendors']})}});
  const vendors=q.data??[];
  return <div><PageHeader eyebrow="Master data / Supplier directory" title="Vendors" description={canManage ? 'Maintain the supplier directory used by sourcing, quotations, purchase orders and invoice verification.' : 'Review the supplier directory used by procurement, sourcing and invoice control. Finance access is read-only.'} />
    {canManage ? <section className="pf-panel mb-5 p-5"><div className="pf-section-head"><div><div className="pf-card-title">Add supplier</div><div className="pf-card-subtitle">Create the minimum vendor master record required for RFQs.</div></div><span className="pf-step-dot"><PlusIcon size={13}/></span></div><div className="mt-5 grid gap-3 md:grid-cols-2"><input className="pf-input" placeholder="Legal name" value={legalName} onChange={e=>setLegalName(e.target.value)}/><input className="pf-input" placeholder="Display name" value={displayName} onChange={e=>setDisplayName(e.target.value)}/><input className="pf-input" type="email" placeholder="Primary email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="pf-input" placeholder="Primary contact name" value={contact} onChange={e=>setContact(e.target.value)}/></div><button className="pf-btn pf-btn-primary mt-3" disabled={!legalName||m.isPending} onClick={()=>m.mutate()}><BuildingIcon size={14}/>{m.isPending?'Saving…':'Create vendor'}</button>{m.error?<div className="mt-3"><ErrorNotice message={m.error.message}/></div>:null}</section> : <div className="pf-notice pf-notice-info mb-5"><div><strong>Read-only supplier directory</strong><p>Supplier creation and lifecycle control belong to Procurement and Administration.</p></div></div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="pf-panel p-4"><div className="pf-label">Suppliers</div><div className="mt-2 text-[22px] font-[760] tracking-[-.04em]">{vendors.length}</div><div className="mt-1 text-[9.5px] text-slate-400">Visible in this workspace</div></div><div className="pf-panel p-4"><div className="pf-label">Active</div><div className="mt-2 text-[22px] font-[760] tracking-[-.04em]">{vendors.filter((v:any)=>v.isActive).length}</div><div className="mt-1 text-[9.5px] text-slate-400">Eligible for sourcing</div></div><div className="pf-panel p-4"><div className="pf-label">Directory mode</div><div className="mt-2 text-[12px] font-bold text-[#356f82]">Tenant scoped</div><div className="mt-1 text-[9.5px] text-slate-400">No cross-organization visibility</div></div></div>
    <section className="pf-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><div className="pf-card-title">Supplier directory</div><div className="pf-card-subtitle">Search by vendor name or email.</div></div><label className="relative w-full sm:w-[250px]"><SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pf-input pl-9" placeholder="Search vendors" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>{q.isLoading?<div className="p-6 text-[11px] text-slate-500">Loading vendors…</div>:q.error?<div className="p-4"><ErrorNotice message={q.error.message}/></div>:!vendors.length?<div className="p-4"><EmptyNotice>No vendors match the current search.</EmptyNotice></div>:<Table><thead><tr><Th>Vendor</Th><Th>Contact</Th><Th>Phone</Th><Th>Status</Th></tr></thead><tbody>{vendors.map((v:any)=><tr key={v.id}><Td><div className="font-semibold text-slate-800">{v.displayName}</div><div className="mt-1 text-[9.5px] text-slate-400">{v.legalName}</div></Td><Td>{v.email??'—'}{v.contacts?.[0]?.name?<div className="mt-1 text-[9.5px] text-slate-400">{v.contacts[0].name}</div>:null}</Td><Td>{v.phone??'—'}</Td><Td><StatusBadge value={v.isActive?'ACTIVE':'INACTIVE'}/></Td></tr>)}</tbody></Table>}</section>
  </div>;
}
