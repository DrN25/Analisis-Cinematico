const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const TOKEN_KEY = 'cinematico_auth_token';

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { ...(extra || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseError(res: Response): Promise<ApiError> {
  let msg = `Error HTTP ${res.status}`;
  let code: string | undefined;
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') {
      msg = data.detail;
    } else if (data?.detail && typeof data.detail === 'object') {
      msg = data.detail.message || msg;
      code = data.detail.code;
    }
  } catch {
    // ignore non-json
  }
  if (res.status === 401) {
    setToken(null);
    onUnauthorized?.();
  }
  return new ApiError(res.status, msg, code);
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const headers = authHeaders(
    isForm
      ? (init.headers as Record<string, string> | undefined)
      : { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  );
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as T;
}

export async function apiBlob(
  path: string,
  init: RequestInit = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const isForm = init.body instanceof FormData;
  const headers = authHeaders(
    isForm
      ? (init.headers as Record<string, string> | undefined)
      : { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  );
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    throw await parseError(res);
  }
  const cd = res.headers.get('content-disposition');
  let filename: string | null = null;
  if (cd) {
    const match = cd.match(/filename="?([^"]+)"?/i);
    if (match) filename = match[1];
  }
  return { blob: await res.blob(), filename };
}

export function triggerDownload(blob: Blob, fallbackName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
