import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const REF_STORAGE_KEY = 'japam_ref_code';

/** Captures ?ref=CODE from URL and stores in sessionStorage for referral attribution when user becomes pro. */
export function RefCapture() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref && typeof ref === 'string' && ref.trim().length >= 4) {
      try {
        sessionStorage.setItem(REF_STORAGE_KEY, ref.trim().toUpperCase());
      } catch {}
    }
  }, [location.search]);

  return null;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getStoredRefCode(): string | null {
  try {
    return sessionStorage.getItem(REF_STORAGE_KEY);
  } catch {
    return null;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function clearStoredRefCode(): void {
  try {
    sessionStorage.removeItem(REF_STORAGE_KEY);
  } catch {}
}
