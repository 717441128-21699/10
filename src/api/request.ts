import type { ApiResponse } from '@shared/types';
import { useAuthStore } from '@/store/authStore';

const baseURL = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, unknown>;
}

const buildUrl = (url: string, params?: Record<string, unknown>): string => {
  let fullUrl = url.startsWith('http') ? url : baseURL + url;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  return fullUrl;
};

const handle401 = (): void => {
  const { logout } = useAuthStore.getState();
  logout();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

const request = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const { params, headers, ...restOptions } = options;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('auth_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const finalHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  const finalUrl = buildUrl(url, params);

  try {
    const response = await fetch(finalUrl, {
      ...restOptions,
      headers: finalHeaders,
    });

    if (response.status === 401) {
      handle401();
      throw new Error('Unauthorized');
    }

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data.data;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      throw error;
    }
    throw error;
  }
};

export const get = <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  return request<T>(url, { method: 'GET', params });
};

export const post = <T>(url: string, body?: unknown): Promise<T> => {
  return request<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
};

export const put = <T>(url: string, body?: unknown): Promise<T> => {
  return request<T>(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
};

export const del = <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  return request<T>(url, { method: 'DELETE', params });
};
