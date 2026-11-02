import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';

export function JobQrCode({ url }: { url: string }) {
  const [data,setData]=useState(''); const [error,setError]=useState('');
  useEffect(()=>{let active=true;setError('');QRCode.toDataURL(url,{width:256,margin:2,errorCorrectionLevel:'M'}).then(x=>{if(active)setData(x);}).catch(()=>{if(active)setError('QR code belum dapat dibuat.');});return()=>{active=false;};},[url]);
  return <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-panel p-4">
    {data&&<img src={data} alt="QR code tautan pendaftaran lowongan" width={112} height={112} className="rounded-xl"/>}
    <div><p className="text-sm font-semibold text-ink">QR pendaftaran lowongan</p><p className="mt-1 max-w-sm text-xs text-caption">Pasang pada poster agar pelamar dapat membuka formulir langsung.</p>{error&&<p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}{data&&<a href={data} download="qr-lowongan.png" className="btn-secondary mt-3 !py-2 !text-xs"><Download size={14}/>Unduh QR</a>}</div>
  </div>;
}
