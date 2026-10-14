const BASE_URL: string = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'hr_auth_token';

export const getToken = (): string | null => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t: string): void => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = (): void => sessionStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Dipanggil saat server menjawab 401 (sesi habis) agar AuthContext bisa logout otomatis. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null): void => {
  onUnauthorized = fn;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(err.message ?? 'Terjadi kesalahan pada server.', res.status);
  }
  return (await res.json()) as T;
}

export const post = <T,>(path: string, body?: unknown): Promise<T> =>
  apiFetch<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const put = <T,>(path: string, body: unknown): Promise<T> =>
  apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
