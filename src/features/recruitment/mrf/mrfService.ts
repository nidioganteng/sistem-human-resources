import { apiFetch, post, put } from '@/services/api';
import type { Mrf, MrfInput, MrfStatus } from './types';

export const listMrfs = (status?: MrfStatus | ''): Promise<{ items: Mrf[] }> =>
  apiFetch(`/mrfs${status ? `?status=${encodeURIComponent(status)}` : ''}`);

export const getMrf = (id: number): Promise<Mrf> => apiFetch(`/mrfs/${id}`);

export const createMrf = (input: MrfInput, submit: boolean): Promise<Mrf> =>
  post('/mrfs', { ...input, submit });

export const updateMrf = (id: number, input: MrfInput, submit: boolean): Promise<Mrf> =>
  put(`/mrfs/${id}`, { ...input, submit });

export const submitMrf = (id: number): Promise<Mrf> => post(`/mrfs/${id}/submit`);
export const approveMrf = (id: number, comment?: string): Promise<Mrf> => post(`/mrfs/${id}/approve`, { comment });
export const reviseMrf = (id: number, comment: string): Promise<Mrf> => post(`/mrfs/${id}/revise`, { comment });
export const cancelMrf = (id: number): Promise<Mrf> => post(`/mrfs/${id}/cancel`);
