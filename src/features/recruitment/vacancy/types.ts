export type VacancyStatus = 'open' | 'closed';

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
