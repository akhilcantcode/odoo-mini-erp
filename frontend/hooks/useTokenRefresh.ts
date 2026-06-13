'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * Decodes the `exp` claim from a JWT without a library.
 * Returns expiry time in seconds since epoch, or null if decode fails.
 */
function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * useTokenRefresh
 *
 * Proactively refreshes the access token 5 minutes before it expires.
 * This prevents the user from ever experiencing a mid-session 401.
 *
 * - Reads `exp` from the current JWT (no server round-trip needed)
 * - Schedules a setTimeout 5 min before expiry
 * - On success: silently updates the token in the store
 * - On failure: calls logout so the user gets a clean login screen
 * - Re-schedules itself each time the token changes (i.e., after each refresh)
 */
export function useTokenRefresh() {
  const token = useAuthStore((s) => s.token);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setToken = useAuthStore((s) => s.setToken);
  const logout = useAuthStore((s) => s.logout);

  // Use a ref so the timeout callback always has fresh access to the latest
  // store actions without needing to be in the dependency array.
  const actionsRef = useRef({ setToken, logout });
  actionsRef.current = { setToken, logout };

  useEffect(() => {
    if (!token || !refreshToken) return;

    const exp = decodeJwtExp(token);
    if (!exp) return;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = exp - nowSeconds;
    // Refresh 5 minutes (300 s) before the token expires, minimum 5 s from now
    const secondsUntilRefresh = Math.max(secondsUntilExpiry - 300, 5);
    const msUntilRefresh = secondsUntilRefresh * 1000;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) throw new Error('Refresh failed');

        const { accessToken } = await res.json();
        actionsRef.current.setToken(accessToken);
        // The store update triggers a re-render which re-runs this effect
        // with the new token, scheduling the next refresh automatically.
      } catch {
        actionsRef.current.logout();
      }
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [token, refreshToken]); // re-schedule whenever tokens change
}
