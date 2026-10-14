import { apiFetch, post } from '@/services/api';
import type { Applicant, Vacancy } from './types';

export const listVacancies = (): Promise<{ items: Vacancy[] }> =>
  apiFetch('/vacancies');

export const getVacancy = (id: number): Promise<Vacancy> =>
  apiFetch(`/vacancies/${id}`);

export const openVacancy = (mrfId: number): Promise<Vacancy> =>
  post('/vacancies', { mrfId });

export const closeVacancy = (id: number): Promise<Vacancy> =>
  post(`/vacancies/${id}/close`);

export const listApplicants = (vacancyId: number): Promise<{ items: Applicant[] }> =>
  apiFetch(`/vacancies/${vacancyId}/applicants`);

export const approveApplicant = (id: number, appBaseUrl: string): Promise<{ success: boolean }> =>
  post(`/applicants/${id}/approve`, { appBaseUrl });

export const rejectApplicant = (id: number): Promise<{ success: boolean }> =>
  post(`/applicants/${id}/reject`);
