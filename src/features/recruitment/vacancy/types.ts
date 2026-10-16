export type VacancyStatus = 'open' | 'closed' | 'archived';

export type ApplicantStatus =
  | 'new'
  | 'screen_rejected'
  | 'form_pending'
  | 'form_submitted'
  | 'shortlisted'
  | 'not_selected'
  | 'selection'
  | 'offer_pending'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'hired';

export interface Vacancy {
  id: number;
  mrfId: number;
  mrfCode: string | null;
  position: string;
  division: string;
  publicToken: string;
  status: VacancyStatus;
  openedAt: string;
  closedAt: string | null;
  pendingCount: number;
  totalCount: number;
}

export interface Applicant {
  id: number;
  vacancyId: number;
  fullName: string;
  email: string;
  phone: string;
  status: ApplicantStatus;
  hasCv: boolean;
  hasPortfolio: boolean;
  message: string | null;
  createdAt: string;
}

export interface FormPelamarData {
  identitas: {
    nama_panggilan: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    alamat_tinggal: string;
    no_identitas: string;
    agama: string;
    status_perkawinan: string;
    kewarganegaraan: string;
  };
  pendidikan_formal: Array<{
    tingkat: string;
    nama_sekolah: string;
    jurusan: string;
    tahun_lulus: string;
    nilai: string;
  }>;
  pendidikan_non_formal: string[];
  pengalaman_kerja: Array<{
    nama_perusahaan: string;
    periode_dari: string;
    periode_hingga: string;
    jabatan: string;
    gaji_terakhir: string;
  }>;
  penguasaan_bahasa: string[];
  soft_skill: string[];
  pengalaman_organisasi: Array<{
    nama_organisasi: string;
    periode: string;
    jabatan: string;
    tugas: string;
  }>;
  info_lainnya: {
    sumber_info: string;
    tentang_gsg: string;
    alasan_bergabung: string;
    misi_kontribusi: string;
  };
  kota_tanda_tangan: string;
}

export interface ApplicantFormDetail {
  formData: FormPelamarData;
  expectedSalary: number;
  photoPath: string | null;
  signaturePath: string | null;
  submittedAt: string;
}

export const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  new: 'Baru',
  screen_rejected: 'Ditolak Screening',
  form_pending: 'Menunggu Form',
  form_submitted: 'Form Terisi',
  shortlisted: 'Shortlist',
  not_selected: 'Tidak Dipilih',
  selection: 'Seleksi',
  offer_pending: 'Penawaran Dikirim',
  offered: 'Ditawarkan',
  accepted: 'Diterima',
  declined: 'Menolak Tawaran',
  expired: 'Kedaluwarsa',
  hired: 'Bergabung',
};
