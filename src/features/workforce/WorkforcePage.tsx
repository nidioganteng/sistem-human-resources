import { useCallback, useEffect, useState } from 'react';
import { Bell, Download, FileSignature, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { apiFetch, apiFetchBlob, post } from '@/services/api';
import { Modal } from '@/shared/ui/Modal';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { downloadArchiveAndClear } from '@/features/recruitment/vacancy/vacancyService';
import type { Employee } from '@/features/karyawan/types';
import type { CandidateItem } from '@/features/recruitment/vacancy/types';

type Module = 'discipline' | 'career' | 'offboarding' | 'talent' | 'changes' | 'notifications' | 'profile' | 'archives';
type Row = { id: number; employee_id?: number; category?: string; kind?: string; title?: string; status?: string; created_at: string; expires_at?: string; read_at?: string; comment?: string; payload: Record<string, unknown>; checksum?: string; vacancy_id?: number };
const COPY: Record<Module, [string, string]> = {
  discipline: ['Kedisiplinan', 'Riwayat teguran lisan, tertulis, dan surat peringatan karyawan.'],
  career: ['Riwayat Karier', 'Catat promosi, demosi, dan surat keputusan pada profil karyawan.'],
  offboarding: ['Offboarding', 'Kelola pengunduran diri, masa pemberitahuan, dan serah terima aset.'],
  talent: ['Talent Pool', 'Simpan kandidat potensial dengan masa retensi dua tahun.'],
  changes: ['Persetujuan Data', 'CEO meninjau perubahan data sensitif sebelum diterapkan.'],
  notifications: ['Notifikasi', 'Informasi persetujuan, hasil seleksi, dan permintaan kandidat.'],
  profile: ['Tanda Tangan Profil', 'Unggah tanda tangan yang akan dipasang pada Offering Letter.'],
  archives: ['Arsip Lowongan', 'Unduh salinan lengkap sebelum membersihkan data pelamar dari sistem aktif.'],
};
const KIND: Record<string, Record<string, string>> = {
  discipline: { verbal: 'Teguran lisan', written: 'Teguran tertulis', SP1: 'SP 1', SP2: 'SP 2', SP3: 'SP 3' },
  career: { promotion: 'Promosi', demotion: 'Demosi', decree: 'Surat keputusan' },
  offboarding: { resignation: 'Pengunduran diri' },
};
const LABELS: Record<string, string> = { nik:'NIK',email:'Email',phone:'Nomor HP',position:'Jabatan',division:'Divisi',employmentStatus:'Status kerja',salary:'Gaji',contractStart:'Mulai kontrak',contractEnd:'Akhir kontrak',personalData:'Data pribadi',employeeName:'Nama karyawan',date:'Tanggal',notes:'Keterangan',lastDay:'Hari terakhir',fullName:'Nama lengkap',status:'Status',message:'Pesan',positionTitle:'Jabatan',ptkp_status:'Status PTKP',bank_name:'Nama bank',bank_account:'Nomor rekening',bank_account_name:'Pemilik rekening' };
const date = (value?: string) => value ? new Date(value.replace(' ', 'T')).toLocaleDateString('id-ID') : '-';
async function download(path: string, name: string) {
  const blob = await apiFetchBlob(path); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Details({ values }: { values: Record<string, unknown> }) {
  return <dl className="space-y-3">{Object.entries(values).filter(([key])=> !['filePath','cvPath','portfolioPath','signaturePath','photoPath','documents','form','assets','checksum'].includes(key)).map(([key,value])=><div key={key} className="border-b border-line pb-3 last:border-0"><dt className="text-xs text-caption">{LABELS[key] ?? key.replaceAll('_',' ')}</dt><dd className="mt-1 break-words text-sm text-body">{value && typeof value==='object' ? <Details values={value as Record<string,unknown>} /> : String(value ?? '-')}</dd></div>)}</dl>;
}
export default function WorkforcePage({ module }: { module: Module }) {
  const { user }=useAuth(); const [rows,setRows]=useState<Row[]>([]); const [employees,setEmployees]=useState<Employee[]>([]); const [candidates,setCandidates]=useState<CandidateItem[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const [show,setShow]=useState(false); const [selected,setSelected]=useState<Row|null>(null); const [comment,setComment]=useState(''); const [assets,setAssets]=useState<Record<string,boolean>>({});
  const [form,setForm]=useState<Record<string,string>>({}); const [file,setFile]=useState<File|null>(null);
  const load=useCallback(async()=>{
    setLoading(true); setError('');
    try {
      if(module==='profile') return;
      const path=module==='notifications'?'/notifications':`/workforce/${module}`;
      const r=await apiFetch<{items:Row[]}>(path); setRows(r.items);
      if (['discipline','career','offboarding','changes'].includes(module)) setEmployees((await apiFetch<{items:Employee[]}>('/employees')).items);
      if(module==='talent') setCandidates((await apiFetch<{items:CandidateItem[]}>('/candidates')).items);
    } catch(e){setError(e instanceof Error?e.message:'Gagal memuat data.');} finally{setLoading(false);}
  },[module]);
  useEffect(()=>{setSelected(null);setShow(false);setMessage('');void load();},[load]);
  const run=async(action:()=>Promise<unknown>,success:string)=>{setBusy(true);setError('');try{await action();setMessage(success);setShow(false);setSelected(null);await load();}catch(e){setError(e instanceof Error?e.message:'Tindakan gagal.');}finally{setBusy(false);}};
  const start=()=>{setError('');setForm({employeeId:String(employees[0]?.id??''),kind:Object.keys(KIND[module]??{})[0]??'',date:new Date().toISOString().slice(0,10),applicantId:String(candidates[0]?.id??'')});setFile(null);setShow(true);};
  const save=async(e:React.FormEvent)=>{e.preventDefault();await run(async()=>{
    if(module==='talent')return post('/talent-pool',{applicantId:Number(form.applicantId)});
    const body=new FormData();Object.entries(form).forEach(([k,v])=>body.append(k,v));if(file)body.append('file',file);
    return apiFetch(`/workforce/${module}`,{method:'POST',body});
  },'Data berhasil dicatat.');};
  const inspect=(r:Row)=>{setSelected(r);setComment('');setAssets((r.payload?.assets as Record<string,boolean>)??{});};
  const title=COPY[module];
  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="page-title">{title[0]}</h1>
        <p className="page-subtitle">{title[1]}</p>
      </div>
      {module!=='profile'&&(
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          <button type="button" className="btn-secondary" onClick={()=>void load()} disabled={loading}>
            <RefreshCw size={15}/>Muat ulang
          </button>
          {['discipline','career','offboarding','talent'].includes(module)&&(
            <button type="button" className="btn-primary" onClick={start}>
              <Plus size={16}/>Tambah
            </button>
          )}
        </div>
      )}
    </div>
    {error&&<Alert variant="error">{error}</Alert>}{message&&<Alert variant="success">{message}</Alert>}
    {module==='profile'?<form className="card max-w-xl space-y-5" onSubmit={e=>{e.preventDefault();void run(async()=>{if(!file)throw new Error('Pilih berkas tanda tangan.');if(file.size>500*1024)throw new Error('Maksimal 500 KB.');const body=new FormData();body.append('file',file);await apiFetch('/profile/signature',{method:'POST',body});},'Tanda tangan tersimpan. Dokumen yang sudah disetujui mempertahankan tanda tangan sebelumnya.');}}>
      <FileSignature size={28} className="text-accent"/><div><label className="field-label" htmlFor="profile-signature">Tanda tangan {user?.role==='super_admin'?'CEO':'HR'}</label><input id="profile-signature" type="file" accept="image/png,image/jpeg" required onChange={e=>setFile(e.target.files?.[0]??null)} className="field-input"/><p className="mt-2 text-xs text-caption">PNG atau JPEG, maksimal 500 KB. Gunakan gambar dengan tanda tangan yang jelas.</p></div><button disabled={busy} className="btn-primary">{busy?'Menyimpan...':'Simpan tanda tangan'}</button>
    </form>:loading?<div className="card text-sm text-caption">Memuat...</div>:!rows.length?<div className="card"><EmptyState icon={module==='notifications'?<Bell size={24}/>:undefined} title="Belum ada data" description="Data akan muncul setelah proses terkait dilakukan."/></div>:<div className="card overflow-hidden !p-0"><div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-subtle"><tr>{['Nama / Keterangan','Jenis / Status','Tanggal',''].map(x=><th key={x} className="th">{x}</th>)}</tr></thead><tbody className="divide-y divide-line">{rows.map(r=><tr key={r.id} className="hover:bg-subtle/60"><td className="td font-medium">{r.title??String(r.payload?.employeeName??r.payload?.fullName??employees.find(e=>e.id===Number(r.employee_id))?.fullName??(module==='archives'?`Lowongan #${r.vacancy_id}`:`Permintaan #${r.id}`))}</td><td className="td"><span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">{module==='notifications'?(r.read_at?'Dibaca':'Baru'):KIND[module]?.[r.kind??'']??r.status??'Tersimpan'}</span>{r.expires_at&&<p className="mt-2 text-xs text-caption">Retensi sampai {date(r.expires_at)}</p>}</td><td className="td text-xs">{date(r.created_at)}</td><td className="td text-right"><button className="btn-ghost !px-3 !py-1.5" onClick={()=>{inspect(r);if(module==='notifications'&&!r.read_at)void post(`/notifications/${r.id}/read`).then(()=>load());}}>Lihat</button></td></tr>)}</tbody></table></div></div>}
    <Modal open={show} onClose={()=>!busy&&setShow(false)} title={`Tambah ${title[0]}`}>
      <form onSubmit={save} className="space-y-4">{module==='talent'?<div><label className="field-label" htmlFor="candidate">Kandidat</label><select id="candidate" required className="field-input" value={form.applicantId??''} onChange={e=>setForm({...form,applicantId:e.target.value})}><option value="">Pilih kandidat</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.fullName} - {c.vacancyPosition}</option>)}</select><p className="mt-2 text-xs text-caption">Data dan berkas dipertahankan selama dua tahun, kemudian dibersihkan oleh proses retensi.</p></div>:<>
        <div><label className="field-label" htmlFor="employee">Karyawan</label><select id="employee" required className="field-input" value={form.employeeId??''} onChange={e=>setForm({...form,employeeId:e.target.value})}><option value="">Pilih karyawan</option>{employees.map(e=><option key={e.id} value={e.id}>{e.fullName} - {e.division}</option>)}</select></div>
        <div><label className="field-label" htmlFor="record-kind">Jenis</label><select id="record-kind" className="field-input" value={form.kind??''} onChange={e=>setForm({...form,kind:e.target.value})}>{Object.entries(KIND[module]??{}).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="field-label" htmlFor="record-date">Tanggal {module==='offboarding'?'pengunduran diri':''}</label><input id="record-date" type="date" required className="field-input" value={form.date??''} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        {module==='offboarding'&&<div><label className="field-label" htmlFor="last-day">Hari terakhir bekerja</label><input id="last-day" type="date" required className="field-input" value={form.lastDay??''} onChange={e=>setForm({...form,lastDay:e.target.value})}/><p className="mt-1 text-xs text-caption">Minimal satu bulan setelah tanggal pengunduran diri.</p></div>}
        {module==='career'&&<div><label className="field-label" htmlFor="new-position">Jabatan pada keputusan</label><input id="new-position" required className="field-input" value={form.position??''} onChange={e=>setForm({...form,position:e.target.value})}/><p className="mt-1 text-xs text-caption">Perubahan jabatan aktif diajukan melalui profil karyawan dan persetujuan CEO.</p></div>}
        <div><label className="field-label" htmlFor="notes">Keterangan</label><textarea id="notes" required className="field-input" rows={3} value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div><label className="field-label" htmlFor="record-file">Dokumen pendukung {form.kind?.startsWith('SP')?'(wajib)':'(opsional)'}</label><input id="record-file" type="file" accept="application/pdf" required={form.kind?.startsWith('SP')} onChange={e=>setFile(e.target.files?.[0]??null)} className="field-input"/><p className="mt-1 text-xs text-caption">PDF maksimal 2 MB.</p></div>
      </>}{error&&<Alert variant="error">{error}</Alert>}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={busy} onClick={()=>setShow(false)}>Batal</button><button className="btn-primary" disabled={busy}>{busy?'Menyimpan...':'Simpan'}</button></div></form>
    </Modal>
    <Modal open={!!selected} onClose={()=>!busy&&setSelected(null)} title={selected?.title??`Detail ${title[0]}`} size="lg">
      {selected&&<div className="space-y-5">
        {module==='changes'&&<><p className="text-sm text-caption">Usulan data baru. Bandingkan dengan data aktif pada profil karyawan sebelum memutuskan.</p><a href={`/karyawan/${selected.employee_id}`} target="_blank" rel="noreferrer" className="btn-secondary">Buka profil karyawan</a></>}
        <Details values={selected.payload??{}}/>
        {module==='talent'&&<div className="flex flex-wrap gap-2">{(['cv','portfolio','certificate'] as const).filter(type=>type==='cv'?selected.payload.cvPath:type==='portfolio'?selected.payload.portfolioPath:Array.isArray(selected.payload.documents)&&selected.payload.documents.length>0).map(type=><button key={type} className="btn-secondary" disabled={busy} onClick={()=>void run(()=>download(`/talent-pool/${selected.id}/file/${type}`,`${type}-kandidat.pdf`),'Dokumen kandidat diunduh.')}><Download size={15}/>{type==='cv'?'CV':type==='portfolio'?'Portofolio':'Sertifikat'}</button>)}</div>}
        {module==='archives'&&<div className="space-y-3"><button className="btn-secondary" disabled={busy} onClick={()=>void run(()=>download(`/vacancy-archives/${selected.id}/download`,`arsip-${selected.id}.zip`),'Arsip diunduh.')}><Download size={15}/>Unduh ZIP lengkap</button>{selected.status==='ready'&&user?.role==='hr'&&<><p className="text-sm text-caption">Pembersihan mengunduh dan memverifikasi arsip dahulu. Data karyawan, talent pool, riwayat MRF, dan backup server tetap disimpan.</p><button className="btn-danger" disabled={busy} onClick={()=>void run(()=>downloadArchiveAndClear(selected.id,selected.checksum??''),'Arsip diunduh dan data aktif dibersihkan.')}>Unduh dan bersihkan data aktif</button></>}</div>}
        {!!selected.payload?.filePath&&<button className="btn-secondary" onClick={()=>void run(()=>download(`/employee-records/${selected.id}/file`,'dokumen-karyawan.pdf'),'Berkas berhasil diunduh.')}><Download size={15}/>Unduh dokumen</button>}
        {module==='changes'&&selected.status==='pending'&&user?.role==='super_admin'&&<><label className="field-label" htmlFor="decision-note">Catatan keputusan (wajib untuk penolakan)</label><textarea id="decision-note" className="field-input" value={comment} onChange={e=>setComment(e.target.value)}/><div className="flex gap-2"><button disabled={busy} className="btn-danger-light" onClick={()=>void run(()=>post(`/employee-changes/${selected.id}/decide`,{action:'reject',comment}),'Permintaan ditolak.')}>Tolak</button><button disabled={busy} className="btn-primary" onClick={()=>void run(()=>post(`/employee-changes/${selected.id}/decide`,{action:'approve',comment}),'Perubahan disetujui dan diterapkan.')}>Setujui perubahan</button></div></>}
        {module==='offboarding'&&selected.status==='open'&&<><div className="space-y-3">{Object.keys(assets).map(key=><label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!assets[key]} onChange={e=>setAssets({...assets,[key]:e.target.checked})}/>{key} sudah diserahterimakan</label>)}</div><button disabled={busy||Object.values(assets).some(v=>!v)} className="btn-danger" onClick={()=>void run(()=>post(`/employee-records/${selected.id}/complete`,{assets}),'Offboarding selesai, karyawan dan barcode dinonaktifkan.')}>Selesaikan offboarding</button></>}
        {selected.comment&&<p className="text-sm text-caption">Catatan: {selected.comment}</p>}
        {error&&<Alert variant="error">{error}</Alert>}
      </div>}
    </Modal>
  </div>;
}
