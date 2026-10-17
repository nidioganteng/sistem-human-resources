import { apiFetch, apiFetchBlob, post } from '@/services/api';
import type { Applicant, ApplicantFormDetail, CandidateItem, SelectionRecord, Vacancy } from './types';
import type { Employee } from '@/features/karyawan/types';

export const listVacancies = (): Promise<{ items: Vacancy[] }> =>
  apiFetch('/vacancies');

export const getVacancy = (id: number): Promise<Vacancy> =>
  apiFetch(`/vacancies/${id}`);

export const openVacancy = (mrfId: number): Promise<Vacancy> =>
  post('/vacancies', { mrfId });

export const closeVacancy = (id: number): Promise<Vacancy> =>
  post(`/vacancies/${id}/close`);

export const reopenVacancy = (id: number): Promise<Vacancy> =>
  post(`/vacancies/${id}/reopen`);

export const archiveVacancy = (id: number): Promise<Vacancy> =>
  post(`/vacancies/${id}/archive`);

export const downloadAndDeleteVacancy = async (id: number, filename: string): Promise<void> => {
  const blob = await apiFetchBlob(`/vacancies/${id}/archive-download`);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const listApplicants = (vacancyId: number): Promise<{ items: Applicant[] }> =>
  apiFetch(`/vacancies/${vacancyId}/applicants`);

export const getApplicant = (id: number): Promise<Applicant> =>
  apiFetch(`/applicants/${id}`);

export const openApplicantFile = async (id: number, type: 'cv' | 'portfolio'): Promise<void> => {
  const blob = await apiFetchBlob(`/applicants/${id}/file/${type}`);
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const approveApplicant = (id: number, appBaseUrl: string): Promise<{ success: boolean }> =>
  post(`/applicants/${id}/approve`, { appBaseUrl });

export const rejectApplicant = (id: number): Promise<{ success: boolean }> =>
  post(`/applicants/${id}/reject`);

export const getApplicantFormData = (id: number): Promise<ApplicantFormDetail> =>
  apiFetch(`/applicants/${id}/form-data`);

export const shortlistApplicant = (id: number): Promise<Applicant> =>
  post(`/applicants/${id}/shortlist`);

export const callToSelection = (id: number): Promise<Applicant> =>
  post(`/applicants/${id}/call-selection`);

export const recordSelectionResult = (
  id: number,
  stage: string,
  result: string,
  notes?: string,
): Promise<Applicant> =>
  post(`/applicants/${id}/record-selection`, { stage, result, notes: notes ?? null });

export const getSelectionRecords = (id: number): Promise<{ items: SelectionRecord[] }> =>
  apiFetch(`/applicants/${id}/selections`);

export const listCandidates = (): Promise<{ items: CandidateItem[] }> =>
  apiFetch('/candidates');

export const hireApplicant = (id: number): Promise<Employee> =>
  post(`/applicants/${id}/hire`);
