export interface Employee {
  id: number;
  applicantId: number | null;
  nik: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  position: string;
  division: string | null;
  employmentStatus: 'PKWT' | 'PKWTT';
  salary: number | null;
  contractStart: string | null;
  contractEnd: string | null;
  status: 'onboarding' | 'active' | 'inactive';
  personalData: Record<string, string> | null;
  validatedAt: string | null;
  validatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  hasOnboardingToken: boolean;
  onboardingLink: string | null;
  documents: { docType: string; uploadedAt: string }[];
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  ktp: 'KTP',
  npwp: 'NPWP',
  bpjs: 'BPJS',
  ijazah: 'Ijazah',
  foto: 'Pasfoto',
  lainnya: 'Lainnya',
};

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  PKWT: 'Kontrak (PKWT)',
  PKWTT: 'Tetap (PKWTT)',
};

export const PERSONAL_DATA_LABELS: Record<string, string> = {
  birth_date: 'Tanggal Lahir',
  birth_place: 'Tempat Lahir',
  address: 'Alamat',
  religion: 'Agama',
  marital_status: 'Status Pernikahan',
  npwp_number: 'Nomor NPWP',
  bpjs_number: 'Nomor BPJS',
  emergency_contact: 'Kontak Darurat',
};
