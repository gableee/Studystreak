import { supabase } from './supabaseClient';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  retryOnUnauthorized?: boolean;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const DEFAULT_BASE_URL = 'http://localhost:8080';

function resolveApiBaseUrl(): string {
  const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  if (rawBaseUrl && rawBaseUrl !== '') {
    return rawBaseUrl.replace(/\/$/, '');
  }

  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_API_BASE_URL is not defined. Set it to your backend URL in the deployment environment.'
    );
  }

  console.warn(
    '[apiClient] Falling back to local API at http://localhost:8080 because VITE_API_BASE_URL is not set.'
  );

  return DEFAULT_BASE_URL;
}

const apiBaseUrl = resolveApiBaseUrl();

async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Failed to fetch Supabase session:', error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}

async function refreshAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('Failed to refresh Supabase session:', error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}

async function doFetch(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers ?? {});
  if (!options.body || !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let token = await getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const requestInit: RequestInit = {
    method,
    headers,
    signal: options.signal,
  };

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      requestInit.body = options.body;
      headers.delete('Content-Type');
    } else {
      requestInit.body = JSON.stringify(options.body);
    }
  }

  let response = await fetch(url, requestInit);

  const shouldRetry = response.status === 401 && (options.retryOnUnauthorized ?? true);
  if (shouldRetry) {
    token = await refreshAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      response = await fetch(url, requestInit);
    }
  }

  return response;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: string }).error ?? response.statusText)
      : response.statusText;
    throw new ApiError(response.status, message || 'API request failed', payload);
  }

  return payload as T;
}

async function request<T>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T> {
  const response = await doFetch(method, path, options);
  return parseResponse<T>(response);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
  baseUrl: apiBaseUrl,
};
