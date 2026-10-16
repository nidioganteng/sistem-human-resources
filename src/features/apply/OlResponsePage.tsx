import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Phone, Building2 } from 'lucide-react';
import { getOlPublic, respondOl } from '@/features/recruitment/ol/olService';
import { OL_STATUS_LABELS } from '@/features/recruitment/ol/types';
import type { OfferingLetter } from '@/features/recruitment/ol/types';
import { ApiError } from '@/services/api';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

type PageState = 'loading' | 'error' | 'responded' | 'active';
type ResponseResult = 'accept' | 'decline' | 'contact' | null;

function OlCard({ ol, children }: { ol: OfferingLetter; children?: React.ReactNode }) {
  return (
    <div className="apply-card mx-auto w-full max-w-2xl overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
        <div className="flex items-center gap-3">
          <Building2 size={24} className="text-white/80 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Offering Letter</p>
            <p className="text-lg font-bold text-white">Gaharu Sempana Group</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="apply-label">Posisi</p>
            <p className="font-semibold text-slate-900">{ol.position}</p>
          </div>
          <div>
            <p className="apply-label">Gaji</p>
            <p className="font-semibold text-slate-900">{formatRupiah(ol.salary)}</p>
          </div>
          {ol.startDate && (
            <div>
              <p className="apply-label">Tanggal Mulai</p>
              <p className="font-semibold text-slate-900">{formatDate(ol.startDate)}</p>
            </div>
          )}
          {ol.respondBefore && (
            <div>
              <p className="apply-label">Batas Respons</p>
              <p className="font-semibold text-amber-700">{formatDate(ol.respondBefore)}</p>
            </div>
          )}
        </div>

        <div>
          <p className="apply-label">Isi Surat</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{ol.body}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {ol.hasHrSignature && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              <CheckCircle2 size={13} /> Ditandatangani oleh HR
            </span>
          )}
          {ol.hasCeoSignature && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              <CheckCircle2 size={13} /> Disetujui oleh CEO
            </span>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

export default function OlResponsePage() {
  const { token } = useParams<{ token: string }>();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [ol, setOl] = useState<OfferingLetter | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [responseResult, setResponseResult] = useState<ResponseResult>(null);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'decline' | 'contact' | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('Tautan tidak valid.');
      setPageState('error');
      return;
    }
    getOlPublic(token)
      .then((data) => {
        setOl(data);
        if (data.status === 'accepted' || data.status === 'declined' || data.status === 'expired') {
          setPageState('responded');
        } else if (data.status === 'sent') {
          setPageState('active');
        } else {
          setErrorMsg('Offering Letter ini tidak tersedia.');
          setPageState('error');
        }
      })
      .catch((e) => {
        setErrorMsg(e instanceof ApiError ? e.message : 'Tautan tidak ditemukan atau sudah kedaluwarsa.');
        setPageState('error');
      });
  }, [token]);

  const handleRespond = async (action: 'accept' | 'decline' | 'contact') => {
    if (!token) return;
    setBusy(true);
    setActionError('');
    setConfirmAction(null);
    try {
      await respondOl(token, action);
      setResponseResult(action);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Gagal mengirim respons. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const BG = ({ children }: { children: React.ReactNode }) => (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)' }}
    >
      {children}
    </div>
  );

  if (pageState === 'loading') {
    return (
      <BG>
        <p className="text-slate-500">Memuat...</p>
      </BG>
    );
  }

  if (pageState === 'error') {
    return (
      <BG>
        <div className="apply-card mx-auto w-full max-w-md px-8 py-10 text-center space-y-3">
          <XCircle size={40} className="mx-auto text-red-400" />
          <h1 className="text-lg font-bold text-slate-800">Tautan Tidak Valid</h1>
          <p className="text-sm text-slate-500">{errorMsg}</p>
        </div>
      </BG>
    );
  }

  if (pageState === 'responded' && ol) {
    const statusLabel = OL_STATUS_LABELS[ol.status] ?? ol.status;
    const isAccepted = ol.status === 'accepted';
    const isExpired = ol.status === 'expired';
    return (
      <BG>
        <OlCard ol={ol}>
          <div className={`rounded-xl border px-4 py-3 text-center ${
            isAccepted
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : isExpired
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            <p className="font-semibold">Status: {statusLabel}</p>
            {ol.respondedAt && (
              <p className="mt-0.5 text-xs opacity-70">
                Direspons pada {new Date(ol.respondedAt).toLocaleDateString('id-ID', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </OlCard>
      </BG>
    );
  }

  if (ol && responseResult) {
    const messages: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
      accept:  { icon: <CheckCircle2 size={40} className="text-emerald-500" />, title: 'Terima kasih!', desc: 'Lamaran Anda diterima. Tim HR kami akan menghubungi Anda segera.' },
      decline: { icon: <XCircle size={40} className="text-red-400" />, title: 'Tawaran Ditolak', desc: 'Anda telah menolak tawaran ini. Terima kasih atas waktu Anda.' },
      contact: { icon: <Phone size={40} className="text-brand-500" />, title: 'Permintaan Diterima', desc: 'Kami akan menghubungi Anda segera untuk mendiskusikan penawaran ini.' },
    };
    const msg = messages[responseResult];
    return (
      <BG>
        <div className="apply-card mx-auto w-full max-w-md px-8 py-10 text-center space-y-3">
          <div className="mx-auto w-fit">{msg.icon}</div>
          <h1 className="text-lg font-bold text-slate-800">{msg.title}</h1>
          <p className="text-sm text-slate-500">{msg.desc}</p>
        </div>
      </BG>
    );
  }

  if (pageState === 'active' && ol) {
    return (
      <BG>
        <div className="w-full max-w-2xl space-y-5">
          <OlCard ol={ol} />

          {actionError && (
            <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {confirmAction === null ? (
            <div className="mx-auto max-w-2xl grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                className="apply-btn !bg-emerald-600 hover:!bg-emerald-700"
                disabled={busy}
                onClick={() => setConfirmAction('accept')}
              >
                <CheckCircle2 size={18} /> Setuju
              </button>
              <button
                className="apply-btn !bg-red-600 hover:!bg-red-700"
                disabled={busy}
                onClick={() => setConfirmAction('decline')}
              >
                <XCircle size={18} /> Tolak
              </button>
              <button
                className="apply-btn !bg-slate-700 hover:!bg-slate-800"
                disabled={busy}
                onClick={() => setConfirmAction('contact')}
              >
                <Phone size={18} /> Hubungi HR
              </button>
            </div>
          ) : (
            <div className="apply-card mx-auto max-w-2xl px-6 py-5 space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                {confirmAction === 'accept' && 'Konfirmasi: Anda akan menyetujui tawaran ini.'}
                {confirmAction === 'decline' && 'Konfirmasi: Anda akan menolak tawaran ini.'}
                {confirmAction === 'contact' && 'Konfirmasi: Anda ingin dihubungi oleh HR.'}
              </p>
              <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3">
                <button
                  className="apply-btn flex-1 !bg-slate-200 !text-slate-700 hover:!bg-slate-300"
                  disabled={busy}
                  onClick={() => setConfirmAction(null)}
                >
                  Kembali
                </button>
                <button
                  className={`apply-btn flex-1 ${
                    confirmAction === 'accept'
                      ? '!bg-emerald-600 hover:!bg-emerald-700'
                      : confirmAction === 'decline'
                        ? '!bg-red-600 hover:!bg-red-700'
                        : '!bg-slate-700 hover:!bg-slate-800'
                  }`}
                  disabled={busy}
                  onClick={() => void handleRespond(confirmAction)}
                >
                  {busy ? 'Memproses...' : 'Ya, Konfirmasi'}
                </button>
              </div>
            </div>
          )}
        </div>
      </BG>
    );
  }

  return null;
}
