'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../components/page-header';
import { EmptyNotice, ErrorNotice } from '../../../components/notice';
import { BuildingIcon, ShieldIcon, PlusIcon, CheckIcon, UserIcon } from '../../../components/icons';
import { StatusBadge } from '../../../components/badge';
import { Table, Th, Td } from '../../../components/table';

const roles=['EMPLOYEE','MANAGER','PROCUREMENT','FINANCE','ADMIN'];
type Draft = { role:string; departmentId:string; managerId:string };

export default function SettingsPage(){
  const { user } = useAuth();
  const qc=useQueryClient();
  const me=useQuery({queryKey:['me'],queryFn:api.me});
  const org=useQuery({queryKey:['organization'],queryFn:api.organization});
  const users=useQuery({queryKey:['users'],queryFn:api.users,enabled:me.data?.role==='ADMIN'});
  const [orgName,setOrgName]=useState('');
  const [departmentName,setDepartmentName]=useState(''); const [departmentCode,setDepartmentCode]=useState('');
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [role,setRole]=useState('EMPLOYEE'); const [departmentId,setDepartmentId]=useState(''); const [managerId,setManagerId]=useState('');
  const [drafts,setDrafts]=useState<Record<string,Draft>>({});
  const rename=useMutation({mutationFn:()=>api.renameOrganization(orgName.trim()),onSuccess:()=>{setOrgName('');qc.invalidateQueries({queryKey:['organization']})}});
  const createDepartment=useMutation({mutationFn:()=>api.createDepartment({name:departmentName.trim(),code:departmentCode.trim().toUpperCase()}),onSuccess:async()=>{setDepartmentName('');setDepartmentCode('');await qc.invalidateQueries({queryKey:['organization']})}});
  const createUser=useMutation({mutationFn:()=>api.createUser({name:name.trim(),email:email.trim(),password,role,departmentId:departmentId||undefined,managerId:managerId||undefined}),onSuccess:async()=>{setName('');setEmail('');setPassword('');setRole('EMPLOYEE');setDepartmentId('');setManagerId('');await qc.invalidateQueries({queryKey:['users']})}});
  const updateUser=useMutation({mutationFn:({id,draft}:{id:string;draft:Draft})=>api.updateUser(id,{role:draft.role,departmentId:draft.departmentId||null,managerId:draft.role==='EMPLOYEE'?(draft.managerId||null):null}),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['users']})}});
  const toggleUser=useMutation({mutationFn:({id,isActive}:{id:string;isActive:boolean})=>api.updateUser(id,{isActive}),onSuccess:()=>qc.invalidateQueries({queryKey:['users']})});
  const departments=org.data?.departments??[];
  const managerOptions=useMemo(()=>users.data?.filter((u:any)=>u.isActive&&(u.role==='MANAGER'||u.role==='ADMIN'))??[],[users.data]);
  const admin=me.data?.role==='ADMIN';

  function getDraft(u:any): Draft {
    return drafts[u.id] ?? { role:u.role, departmentId:u.departmentId??'', managerId:u.managerId??'' };
  }
  function setDraft(id:string, patch:Partial<Draft>) { setDrafts(current => ({...current,[id]:{...getDraft(users.data?.find((u:any)=>u.id===id)??{}),...patch}})); }

  if(me.isLoading) return <div className="pf-loading-screen"><div className="pf-spinner"/>Loading administration</div>;
  if(me.error) return <ErrorNotice message={me.error.message}/>;

  return <div className="max-w-[1350px]">
    <PageHeader eyebrow="Governance / Administration" title="Organization administration" description="Configure the operating model behind ProcureFlow. User access, reporting lines and departments are administrative controls; day-to-day procurement work belongs to the operational roles." />
    <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
      <section className="pf-panel p-5 md:p-6"><div className="pf-section-head"><div><div className="pf-card-title">Organization profile</div><div className="pf-card-subtitle">Tenant identity used by authentication and organization-scoped data.</div></div><span className="pf-kpi-icon"><BuildingIcon size={15}/></span></div>
        {me.data ? <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><div className="pf-label">Organization</div><div className="mt-1 text-[15px] font-bold">{me.data.organization.name}</div><div className="mt-1 text-[10px] text-slate-400">slug: {me.data.organization.slug}</div></div><div><div className="pf-label">Your role</div><div className="mt-1"><StatusBadge value={me.data.role}/></div></div><div><div className="pf-label">Department</div><div className="mt-1 text-[11px] font-semibold">{me.data.department?.name??'—'}</div></div><div><div className="pf-label">Workspace state</div><div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#28715b]"><CheckIcon size={13}/>Active</div></div></div>:null}
        {admin ? <form className="mt-6 flex flex-col gap-2 sm:flex-row" onSubmit={(e:FormEvent)=>{e.preventDefault();if(orgName.trim())rename.mutate()}}><input className="pf-input" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="New organization name"/><button className="pf-btn pf-btn-primary" disabled={!orgName.trim()||rename.isPending}>{rename.isPending?'Saving…':'Rename organization'}</button></form> : null}
        {rename.error?<div className="mt-3"><ErrorNotice message={rename.error.message}/></div>:null}
      </section>
      <section className="pf-panel p-5 md:p-6"><div className="pf-section-head"><div><div className="pf-card-title">Role model</div><div className="pf-card-subtitle">Operational permissions are enforced by the API and mirrored in the workspace.</div></div><span className="pf-kpi-icon"><ShieldIcon size={15}/></span></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{roles.map(r=><div key={r} className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-3"><div className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-500">Role</div><div className="mt-1 text-[10.5px] font-bold text-slate-800">{r}</div></div>)}</div></section>
    </div>

    {admin ? <>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="pf-panel p-5"><div className="pf-section-head"><div><div className="pf-card-title">Create department</div><div className="pf-card-subtitle">Departments scope users, requests and optional budget ownership.</div></div><span className="pf-step-dot"><PlusIcon size={13}/></span></div><form className="mt-5 grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={e=>{e.preventDefault();createDepartment.mutate()}}><input required className="pf-input" value={departmentName} onChange={e=>setDepartmentName(e.target.value)} placeholder="Engineering"/><input required className="pf-input" maxLength={12} value={departmentCode} onChange={e=>setDepartmentCode(e.target.value)} placeholder="ENG"/><button className="pf-btn pf-btn-primary" disabled={!departmentName.trim()||!departmentCode.trim()||createDepartment.isPending}>{createDepartment.isPending?'Creating…':'Create'}</button></form>{createDepartment.error?<div className="mt-3"><ErrorNotice message={createDepartment.error.message}/></div>:null}<div className="mt-5 grid gap-2 sm:grid-cols-2">{departments.map((d:any)=><div key={d.id} className="pf-panel-soft px-3 py-3"><div className="text-[11px] font-semibold">{d.name}</div><div className="mt-1 text-[9px] text-slate-400">{d.code}</div></div>)}</div></section>
        <section className="pf-panel p-5"><div className="pf-section-head"><div><div className="pf-card-title">Create user</div><div className="pf-card-subtitle">Provision an identity with the correct role and workflow ownership from the beginning.</div></div><span className="pf-step-dot"><UserIcon size={13}/></span></div><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();createUser.mutate()}}><input required className="pf-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/><input required type="email" className="pf-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="person@company.com"/><input required minLength={12} type="password" className="pf-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Temporary password (12+ chars)"/><select className="pf-input" value={role} onChange={e=>{const next=e.target.value;setRole(next);if(next!=='EMPLOYEE')setManagerId('');}}>{roles.map(r=><option key={r}>{r}</option>)}</select><select required={role==='EMPLOYEE'||role==='MANAGER'} className="pf-input" value={departmentId} onChange={e=>setDepartmentId(e.target.value)}><option value="">No department</option>{departments.map((d:any)=><option key={d.id} value={d.id}>{d.name} · {d.code}</option>)}</select><select required={role==='EMPLOYEE'} className="pf-input" value={managerId} onChange={e=>setManagerId(e.target.value)} disabled={role!=='EMPLOYEE'}><option value="">No manager</option>{managerOptions.map((u:any)=><option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}</select><button className="pf-btn pf-btn-primary sm:col-span-2" disabled={!name.trim()||!email.trim()||password.length<12||((role==='EMPLOYEE'||role==='MANAGER')&&!departmentId)||(role==='EMPLOYEE'&&!managerId)||createUser.isPending}>{createUser.isPending?'Creating user…':'Create user'}</button></form>{createUser.error?<div className="mt-3"><ErrorNotice message={createUser.error.message}/></div>:null}</section>
      </div>

      <section className="pf-panel mt-5 overflow-hidden"><div className="border-b border-slate-100 p-4"><div className="pf-card-title">Users, roles & reporting lines</div><div className="pf-card-subtitle">Changes here affect workflow ownership. Employees need a manager; managers with active reports cannot be demoted or deactivated.</div></div>{users.isLoading?<div className="p-6 text-[11px] text-slate-500">Loading users…</div>:users.error?<div className="p-4"><ErrorNotice message={users.error.message}/></div>:!users.data?.length?<div className="p-4"><EmptyNotice>No users have been created yet.</EmptyNotice></div>:<div className="overflow-x-auto"><Table><thead><tr><Th>Name</Th><Th>Role</Th><Th>Department</Th><Th>Manager</Th><Th>Status</Th><Th>Changes</Th></tr></thead><tbody>{users.data.map((u:any)=>{const draft=getDraft(u);const locked=u.id===me.data?.id;const managers=managerOptions.filter((m:any)=>m.id!==u.id);return <tr key={u.id}><Td><div className="font-semibold text-slate-800">{u.name}</div><div className="mt-1 text-[9px] text-slate-400">{u.email}</div></Td><Td><select disabled={locked} className="pf-select-inline" value={draft.role} onChange={e=>setDraft(u.id,{role:e.target.value,managerId:e.target.value==='EMPLOYEE'?draft.managerId:''})}>{roles.map(r=><option key={r}>{r}</option>)}</select></Td><Td><select disabled={locked} className="pf-select-inline" value={draft.departmentId} onChange={e=>setDraft(u.id,{departmentId:e.target.value})}><option value="">No department</option>{departments.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></Td><Td><select disabled={locked||draft.role!=='EMPLOYEE'} className="pf-select-inline min-w-[150px]" value={draft.role==='EMPLOYEE'?draft.managerId:''} onChange={e=>setDraft(u.id,{managerId:e.target.value})}><option value="">No manager</option>{managers.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></Td><Td><StatusBadge value={u.isActive?'ACTIVE':'INACTIVE'}/></Td><Td><div className="flex flex-wrap gap-2"><button className="pf-btn" disabled={locked||updateUser.isPending} onClick={()=>updateUser.mutate({id:u.id,draft})}>Save</button><button className="pf-btn" disabled={locked||toggleUser.isPending} onClick={()=>toggleUser.mutate({id:u.id,isActive:!u.isActive})}>{u.isActive?'Deactivate':'Activate'}</button></div></Td></tr>})}</tbody></Table></div>}{updateUser.error?<div className="border-t border-slate-100 p-4"><ErrorNotice message={updateUser.error.message}/></div>:null}{toggleUser.error?<div className="border-t border-slate-100 p-4"><ErrorNotice message={toggleUser.error.message}/></div>:null}</section>
    </> : null}
  </div>;
}
