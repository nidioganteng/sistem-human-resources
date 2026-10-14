export type MrfStatus = 'draft' | 'pending_manager' | 'pending_ceo' | 'revision' | 'approved' | 'cancelled';
export type EmploymentStatus = 'PKWT' | 'PKWTT';
export type SelectionTrack = 'fast' | 'normal';

export interface MrfHistoryEntry {
  actorName: string;
  roleLabel: string;
  action: 'submit' | 'approve' | 'revise' | 'cancel';
  actionLabel: string;
  comment: string | null;
  toLabel: string;
  createdAt: string;
}

export interface MrfInput {
  position: string;
  responsibilities: string;
  education: string;
  skills: string;
  experience: string;
  headcount: number;
  employmentStatus: EmploymentStatus;
  selectionTrack: SelectionTrack;
}

export interface Mrf extends MrfInput {
  id: number;
  code: string;
  status: MrfStatus;
  statusLabel: string;
  division: string;
  divisionType: 'teknis' | 'non_teknis';
  requester: { id: number; name: string; role: string; roleLabel: string };
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDecide: boolean;
  needsMyAction: boolean;
  history?: MrfHistoryEntry[];
}
