import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { pathnameToUsageKey, trackProductUsage } from '../lib/productUsage';

/** Auto-track SPA page views for admin product-usage rankings. */
export function ProductUsageTracker() {
  const location = useLocation();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = pathnameToUsageKey(location.pathname);
    if (!key || key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    trackProductUsage(key);
  }, [location.pathname]);

  return null;
}
