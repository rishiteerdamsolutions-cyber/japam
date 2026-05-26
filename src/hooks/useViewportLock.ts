import { useEffect } from 'react';

/** Prevent document scroll while a full-viewport shell page is mounted. */
export function useViewportLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevRootOverflow = root?.style.overflow ?? '';
    const prevRootHeight = root?.style.height ?? '';

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (root) {
      root.style.overflow = 'hidden';
      root.style.height = '100dvh';
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      if (root) {
        root.style.overflow = prevRootOverflow;
        root.style.height = prevRootHeight;
      }
    };
  }, [active]);
}
