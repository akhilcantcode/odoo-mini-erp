import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// ─── Refresh Token Queue ───────────────────────────────────────────────────
// Prevents multiple concurrent refresh calls when several requests get 401 at
// the same time. All callers queue up and share the single refresh result.
let isRefreshing = false;
let refreshQueue: ((newToken: string | null) => void)[] = [];

function drainQueue(newToken: string | null) {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

async function attemptTokenRefresh(): Promise<string | null> {
  const { refreshToken, setToken, logout } = useAuthStore.getState();

  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) throw new Error('Refresh failed');

    const { accessToken } = await res.json();
    setToken(accessToken); // silently update store + localStorage
    return accessToken;
  } catch {
    logout(); // refresh token is invalid/expired — force re-login
    return null;
  }
}

// ─── Main API Fetcher ──────────────────────────────────────────────────────
export async function fetchApi<T = unknown>(
  path: string,
  options?: RequestInit,
  _isRetry = false
): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge any custom headers safely
  if (options?.headers) {
    const customHeaders = options.headers;
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => { headers[key] = value; });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => { headers[key] = value; });
    } else {
      Object.assign(headers, customHeaders);
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // ─── 401 Handler: attempt silent token refresh then retry ─────────────────
  if (response.status === 401 && !_isRetry) {
    if (isRefreshing) {
      // Another request is already refreshing — wait for it
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push(async (newToken) => {
          if (newToken) {
            resolve(fetchApi<T>(path, options, true));
          } else {
            reject(new Error('Session expired. Please log in again.'));
          }
        });
      });
    }

    isRefreshing = true;
    const newToken = await attemptTokenRefresh();
    isRefreshing = false;
    drainQueue(newToken);

    if (newToken) {
      return fetchApi<T>(path, options, true); // retry once with fresh token
    }

    throw new Error('Session expired. Please log in again.');
  }

  // ─── Generic error handling ────────────────────────────────────────────────
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message || 'API request failed');
  }

  return response.json() as Promise<T>;
}

