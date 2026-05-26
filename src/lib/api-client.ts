// Cliente HTTP que substitui o @supabase/supabase-js
// Todas as chamadas vão para o backend Express via /api/*

let apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? import.meta.env.BASE_URL ?? '';
if (apiBaseUrl.endsWith('/')) {
  apiBaseUrl = apiBaseUrl.slice(0, -1);
}
const BASE_URL = apiBaseUrl;

const STORAGE_KEY = 'ouvidoria-auth';

export interface StoredAuth {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp em segundos
}

export interface AppUser {
  id: string;
  email: string;
  user_metadata: { name?: string; cpf?: string };
}

export interface AppSession extends StoredAuth {
  user: AppUser;
}

// ── Token storage ──────────────────────────────────────────────────────────────

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function isTokenExpired(auth: StoredAuth): boolean {
  return Date.now() / 1000 >= auth.expires_at - 60; // 60s de margem
}

// ── Token refresh ──────────────────────────────────────────────────────────────

let refreshPromise: Promise<StoredAuth | null> | null = null;

async function refreshAccessToken(auth: StoredAuth): Promise<StoredAuth | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: auth.refresh_token }),
      });
      if (!res.ok) {
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('auth:signout'));
        return null;
      }
      const data = await res.json();
      const newAuth: StoredAuth = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      };
      setStoredAuth(newAuth);
      return newAuth;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function getValidToken(): Promise<string | null> {
  let auth = getStoredAuth();
  if (!auth) return null;
  if (isTokenExpired(auth)) {
    auth = await refreshAccessToken(auth);
  }
  return auth?.access_token ?? null;
}

// ── Fetch helpers ──────────────────────────────────────────────────────────────

type FetchOptions = RequestInit & { skipAuth?: boolean };

async function apiFetch(path: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOpts.headers as Record<string, string> | undefined),
  };
  if (!skipAuth) {
    const token = await getValidToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${BASE_URL}${path}`, { ...fetchOpts, headers });
}

async function apiJson<T>(path: string, options?: FetchOptions): Promise<T> {
  const res = await apiFetch(path, options);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'API error'), { status: res.status, data });
  return data as T;
}

export const apiGet  = <T>(path: string) => apiJson<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body?: unknown) =>
  apiJson<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPut  = <T>(path: string, body?: unknown) =>
  apiJson<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDel  = <T>(path: string) => apiJson<T>(path, { method: 'DELETE' });

// ── File upload ────────────────────────────────────────────────────────────────

export async function uploadFile(bucket: string, filePath: string, file: File): Promise<{ publicUrl: string }> {
  const token = await getValidToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', filePath);
  const res = await fetch(`${BASE_URL}/api/storage/upload/${bucket}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload error');
  return { publicUrl: data.publicUrl };
}

export function getPublicUrl(bucket: string, filePath: string): string {
  return `${BASE_URL}/api/storage/public/${bucket}/${filePath}`;
}
