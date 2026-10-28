import { Download } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Alert } from '@/shared/ui/Alert';
import type { Applicant, ApplicantFormDetail } from './types';

interface FormPelamarModalProps {
  open: boolean;
  applicant: Applicant | null;
  detail: ApplicantFormDetail | null;
  loading: boolean;
  error: string;
  photoUrl: string | null;
  signatureUrl: string | null;
  onClose: () => void;
  onExportDocx: () => void;
  exportingDocx: boolean;
  userRole?: string;
  onShortlist?: () => void;
  shortlisting?: boolean;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-canvas px-4 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-white">{title}</p>
    </div>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-panel px-4 py-4">
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-caption">{children}</p>
  );
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-0.5 text-sm font-medium text-ink">{children}</p>
  );
}

const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function FormPelamarModal({
  open,
  applicant,
  detail,
  loading,
  error,
  photoUrl,
  signatureUrl,
  onClose,
  onExportDocx,
  exportingDocx,
  userRole,
  onShortlist,
  shortlisting = false,
}: FormPelamarModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Form Pelamar" size="lg">
      {applicant && (
        <div className="flex flex-col gap-0 -mx-6 -mt-5">
          {/* Header section */}
          <div className="flex items-start justify-between gap-4 border-b border-line bg-subtle px-6 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-ink leading-tight">{applicant.fullName}</p>
              <p className="mt-0.5 text-sm text-caption">{applicant.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Form Terisi
                </span>
                {detail && (
                  <span className="text-xs text-caption">
                    Disubmit:{' '}
                    {new Date(detail.submittedAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                className="btn-secondary flex items-center gap-1.5 !py-1.5 text-xs disabled:opacity-60"
                onClick={onExportDocx}
                disabled={exportingDocx || !detail}
              >
                <Download size={13} />
                {exportingDocx ? 'Mengekspor...' : 'Ekspor DOCX'}
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <span className="text-sm text-caption">Memuat data form...</span>
              </div>
            )}

            {error && (
              <div className="px-6 py-4">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            {detail && (
              <div className="divide-y divide-line">
                {/* 1. IDENTITAS DIRI */}
                <section>
                  <SectionHeader title="Identitas Diri" />
                  <SectionBody>
                    <div className="flex gap-4">
                      {/* Foto */}
                      <div className="shrink-0">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt="Foto pelamar"
                            className="h-[100px] w-[80px] rounded border border-line object-cover"
                          />
                        ) : (
                          <div className="flex h-[100px] w-[80px] items-center justify-center rounded border border-dashed border-line bg-subtle text-xs text-caption">
                            No photo
                          </div>
                        )}
                      </div>
                      {/* Data grid */}
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <FieldLabel>Nama Lengkap</FieldLabel>
                          <FieldValue>{applicant.fullName}</FieldValue>
                        </div>
                        <div>
                          <FieldLabel>Nama Panggilan</FieldLabel>
                          <FieldValue>{detail.formData.identitas.nama_panggilan || '-'}</FieldValue>
                        </div>
                        <div>
                          <FieldLabel>Tempat, Tgl Lahir</FieldLabel>
                          <FieldValue>
                            {detail.formData.identitas.tempat_lahir || '-'},{' '}
                            {detail.formData.identitas.tanggal_lahir || '-'}
                          </FieldValue>
                        </div>
                        <div>
                          <FieldLabel>No. Telp / HP</FieldLabel>
                          <FieldValue>{applicant.phone}</FieldValue>
                        </div>
                        <div className="col-span-2">
                          <FieldLabel>Alamat Tinggal</FieldLabel>
                          <FieldValue>{detail.formData.identitas.alamat_tinggal || '-'}</FieldValue>
                        </div>
                        <div>
                          <FieldLabel>No. Identitas (KTP)</FieldLabel>
                          <FieldValue>{detail.formData.identitas.no_identitas || '-'}</FieldValue>
                        </div>
                        <div>
                          <FieldLabel>Agama</FieldLabel>
                          <FieldValue>{detail.formData.identitas.agama || '-'}</FieldValue>
                        </div>
                        <div>
                          <FieldLabel>Status Perkawinan</FieldLabel>
                          <FieldValue>{detail.formData.identitas.status_perkawinan || '-'}</FieldValue>
                        </div>
                        <div>
                          <FieldLabel>Kewarganegaraan</FieldLabel>
                          <FieldValue>{detail.formData.identitas.kewarganegaraan || '-'}</FieldValue>
                        </div>
                      </div>
                    </div>
                  </SectionBody>
                </section>

                {/* 2. RIWAYAT PENDIDIKAN FORMAL */}
                <section>
                  <SectionHeader title="Riwayat Pendidikan Formal" />
                  <SectionBody>
                    {detail.formData.pendidikan_formal.length === 0 ? (
                      <p className="text-sm text-caption">-</p>
                    ) : (
                      <div className="overflow-x-auto rounded border border-line">
                        <table className="min-w-full text-left text-sm">
                          <thead className="border-b border-line bg-subtle">
                            <tr>
                              {['Tingkat', 'Sekolah/Universitas', 'Jurusan', 'Tahun Lulus', 'IPK/Nilai'].map((h) => (
                                <th key={h} className="th">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {detail.formData.pendidikan_formal.map((p, i) => (
                              <tr key={i}>
                                <td className="td">{p.tingkat || '-'}</td>
                                <td className="td">{p.nama_sekolah || '-'}</td>
                                <td className="td">{p.jurusan || '-'}</td>
                                <td className="td">{p.tahun_lulus || '-'}</td>
                                <td className="td">{p.nilai || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionBody>
                </section>

                {/* 3. RIWAYAT PENDIDIKAN NON FORMAL */}
                <section>
                  <SectionHeader title="Riwayat Pendidikan Non Formal" />
                  <SectionBody>
                    {detail.formData.pendidikan_non_formal.length === 0 ? (
                      <p className="text-sm text-caption">-</p>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5">
                        {detail.formData.pendidikan_non_formal.map((item, i) => (
                          <li key={i} className="text-sm text-body">{item}</li>
                        ))}
                      </ul>
                    )}
                  </SectionBody>
                </section>

                {/* 4. PENGALAMAN KERJA */}
                <section>
                  <SectionHeader title="Pengalaman Kerja" />
                  <SectionBody>
                    {detail.formData.pengalaman_kerja.length === 0 ? (
                      <p className="text-sm text-caption">-</p>
                    ) : (
                      <div className="overflow-x-auto rounded border border-line">
                        <table className="min-w-full text-left text-sm">
                          <thead className="border-b border-line bg-subtle">
                            <tr>
                              {['Perusahaan', 'Periode', 'Jabatan', 'Gaji Terakhir'].map((h) => (
                                <th key={h} className="th">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {detail.formData.pengalaman_kerja.map((k, i) => (
                              <tr key={i}>
                                <td className="td">{k.nama_perusahaan || '-'}</td>
                                <td className="td whitespace-nowrap">
                                  {k.periode_dari || '-'} - {k.periode_hingga || '-'}
                                </td>
                                <td className="td">{k.jabatan || '-'}</td>
                                <td className="td">{k.gaji_terakhir || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionBody>
                </section>

                {/* 5. PENGUASAAN BAHASA */}
                <section>
                  <SectionHeader title="Penguasaan Bahasa" />
                  <SectionBody>
                    {detail.formData.penguasaan_bahasa.length === 0 ? (
                      <p className="text-sm text-caption">-</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detail.formData.penguasaan_bahasa.map((b, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-subtle px-3 py-1 text-xs font-medium text-body"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </SectionBody>
                </section>

                {/* 6. SOFT SKILL */}
                <section>
                  <SectionHeader title="Soft Skill" />
                  <SectionBody>
                    {detail.formData.soft_skill.length === 0 ? (
                      <p className="text-sm text-caption">-</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detail.formData.soft_skill.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </SectionBody>
                </section>

                {/* 7. PENGALAMAN ORGANISASI */}
                <section>
                  <SectionHeader title="Pengalaman Organisasi" />
                  <SectionBody>
                    {detail.formData.pengalaman_organisasi.length === 0 ? (
                      <p className="text-sm text-caption">-</p>
                    ) : (
                      <div className="overflow-x-auto rounded border border-line">
                        <table className="min-w-full text-left text-sm">
                          <thead className="border-b border-line bg-subtle">
                            <tr>
                              {['Organisasi', 'Periode', 'Jabatan', 'Tugas'].map((h) => (
                                <th key={h} className="th">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {detail.formData.pengalaman_organisasi.map((o, i) => (
                              <tr key={i}>
                                <td className="td">{o.nama_organisasi || '-'}</td>
                                <td className="td">{o.periode || '-'}</td>
                                <td className="td">{o.jabatan || '-'}</td>
                                <td className="td">{o.tugas || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionBody>
                </section>

                {/* 8. INFORMASI LAINNYA */}
                <section>
                  <SectionHeader title="Informasi Lainnya" />
                  <SectionBody>
                    <div className="space-y-4">
                      <div>
                        <FieldLabel>Sumber Informasi Lowongan</FieldLabel>
                        <p className="mt-1 text-sm text-body">
                          {detail.formData.info_lainnya.sumber_info || '-'}
                        </p>
                      </div>
                      <div>
                        <FieldLabel>Pengetahuan tentang Gaharu Sempana Group</FieldLabel>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-body">
                          {detail.formData.info_lainnya.tentang_gsg || '-'}
                        </p>
                      </div>
                      <div>
                        <FieldLabel>Alasan Bergabung</FieldLabel>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-body">
                          {detail.formData.info_lainnya.alasan_bergabung || '-'}
                        </p>
                      </div>
                      <div>
                        <FieldLabel>Misi dan Kontribusi ke Perusahaan</FieldLabel>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-body">
                          {detail.formData.info_lainnya.misi_kontribusi || '-'}
                        </p>
                      </div>
                    </div>
                  </SectionBody>
                </section>

                {/* 9. EKSPEKTASI GAJI */}
                <section>
                  <SectionHeader title="Ekspektasi Gaji" />
                  <SectionBody>
                    <p className="text-2xl font-bold text-ink">
                      {rupiahFmt.format(detail.expectedSalary)}
                    </p>
                  </SectionBody>
                </section>

                {/* 10. TANDA TANGAN */}
                <section>
                  <SectionHeader title="Tanda Tangan" />
                  <SectionBody>
                    {detail.formData.kota_tanda_tangan && (
                      <p className="mb-3 text-sm text-caption">
                        Dibuat di {detail.formData.kota_tanda_tangan},{' '}
                        {new Date(detail.submittedAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Tanda tangan"
                        className="max-h-28 rounded border border-line bg-[#f8fafc] p-2"
                      />
                    ) : (
                      <p className="text-sm text-caption">Tanda tangan tidak tersedia.</p>
                    )}
                  </SectionBody>
                </section>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <div>
              {userRole === 'super_admin' && applicant?.status === 'form_submitted' && onShortlist && (
                <button
                  className="btn-primary !py-1.5 text-xs disabled:opacity-60"
                  onClick={onShortlist}
                  disabled={shortlisting}
                >
                  {shortlisting ? 'Memproses...' : 'Shortlist Kandidat Ini'}
                </button>
              )}
            </div>
            <button className="btn-secondary" onClick={onClose}>Tutup</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
