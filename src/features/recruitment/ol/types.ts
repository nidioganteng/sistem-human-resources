export type OlStatus =
  | 'draft'
  | 'pending_ceo'
  | 'revision'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired';

export interface OfferingLetter {
  id: number;
  applicantId: number;
  draftedBy: number;
  approvedBy: number | null;
  position: string;
  salary: number;
  startDate: string | null;
  body: string;
  status: OlStatus;
  revisionComment: string | null;
  responseToken: string | null;
  sentAt: string | null;
  respondBefore: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasHrSignature: boolean;
  hasCeoSignature: boolean;
}

export const OL_STATUS_LABELS: Record<OlStatus, string> = {
  draft:       'Draft',
  pending_ceo: 'Menunggu CEO',
  revision:    'Perlu Revisi',
  approved:    'Disetujui',
  sent:        'Terkirim',
  accepted:    'Diterima',
  declined:    'Ditolak',
  expired:     'Kedaluwarsa',
};
