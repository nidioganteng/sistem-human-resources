export interface FormPelamarInfo {
  applicantName: string;
  applicantPhone: string;
  vacancyPosition: string;
  vacancyDivision: string;
  expiresAt: string;
}

export async function getFormPelamarInfo(token: string): Promise<FormPelamarInfo> {
  const res = await fetch(`/api/form-pelamar/${token}`);
  const data = (await res.json()) as FormPelamarInfo & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Gagal memuat informasi form.');
  }
  return data;
}

export async function submitFormPelamar(token: string, fd: FormData): Promise<void> {
  const res = await fetch(`/api/form-pelamar/${token}`, { method: 'POST', body: fd });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Terjadi kesalahan pada server.');
  }
}
