import { apiFetch, post, put } from '@/services/api';
import type { OfferingLetter } from './types';

export const listOls = (): Promise<{ items: OfferingLetter[] }> =>
  apiFetch('/offering-letters');

export const getOl = (id: number): Promise<OfferingLetter> =>
  apiFetch(`/offering-letters/${id}`);

export const createOl = (data: {
  applicantId: number;
  position: string;
  salary: number;
  startDate?: string;
  body: string;
}): Promise<OfferingLetter> =>
  post('/offering-letters', data);

export const updateOl = (
  id: number,
  data: { position: string; salary: number; startDate?: string; body: string },
): Promise<OfferingLetter> =>
  put(`/offering-letters/${id}`, data);

export const submitOl = (id: number): Promise<OfferingLetter> =>
  post(`/offering-letters/${id}/submit`);

export const approveOl = (id: number): Promise<OfferingLetter> =>
  post(`/offering-letters/${id}/approve`);

export const reviseOl = (id: number, comment: string): Promise<OfferingLetter> =>
  post(`/offering-letters/${id}/revise`, { comment });

export const sendOl = (id: number, appBaseUrl: string): Promise<OfferingLetter> =>
  post(`/offering-letters/${id}/send`, { appBaseUrl });

export const getOlPublic = (token: string): Promise<OfferingLetter> =>
  apiFetch(`/ol/${token}`);

export const respondOl = (token: string, action: 'accept' | 'decline' | 'contact'): Promise<void> =>
  post(`/ol/${token}/respond`, { action });
