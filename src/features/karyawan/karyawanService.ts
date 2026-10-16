import { apiFetch, apiFetchBlob, post, put } from '@/services/api';
import type { Employee } from './types';

export interface CreateEmployeeData {
  fullName: string;
  position: string;
  division: string;
  employmentStatus: 'PKWT' | 'PKWTT';
  salary?: number | null;
  applicantId?: number | null;
  contractStart?: string | null;
  contractEnd?: string | null;
}

export interface UpdateEmployeeData {
  nik: string;
  email: string;
  phone: string;
  position: string;
  division: string;
  employmentStatus: 'PKWT' | 'PKWTT';
  salary?: number | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  personalData: Record<string, string>;
}

export const listEmployees = (): Promise<{ items: Employee[] }> =>
  apiFetch('/employees');

export const getEmployee = (id: number): Promise<Employee> =>
  apiFetch(`/employees/${id}`);

export const createEmployee = (data: CreateEmployeeData): Promise<Employee> =>
  post('/employees', data);

export const updateEmployee = (id: number, data: UpdateEmployeeData): Promise<Employee> =>
  put(`/employees/${id}`, data);

export const generateOnboardingLink = (
  id: number,
  appBaseUrl: string,
): Promise<Employee & { onboardingUrl: string }> =>
  post(`/employees/${id}/generate-link`, { appBaseUrl });

export const validateEmployee = (id: number): Promise<Employee> =>
  post(`/employees/${id}/validate`);

export const openDocument = async (id: number, docType: string): Promise<void> => {
  const blob = await apiFetchBlob(`/employees/${id}/documents/${docType}`);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const getOnboardingPublic = (
  token: string,
): Promise<{
  fullName: string;
  position: string;
  division: string | null;
  status: string;
  personalData: Record<string, string> | null;
  documents: { docType: string }[];
}> => apiFetch(`/onboarding/${token}`);

export const submitOnboarding = (
  token: string,
  data: { nik: string; email: string; phone: string; personalData: Record<string, string> },
): Promise<unknown> => post(`/onboarding/${token}`, data);

export const uploadOnboardingDocument = async (
  token: string,
  docType: string,
  file: File,
): Promise<void> => {
  const formData = new FormData();
  formData.append('docType', docType);
  formData.append('file', file);

  const res = await fetch(`/api/onboarding/${token}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Gagal mengunggah berkas.');
  }
};
