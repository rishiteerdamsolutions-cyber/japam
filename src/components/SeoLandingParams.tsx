import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applySeoSearchParams, hasSeoTryGuest } from '../lib/seoAttribution';
import { useIsLearnRoute } from '../learn/useLearnRoute';

/** Applies ?lang=, ?deity= from SEO CTAs; optional ?try=1 guest redirect on landing. */
export function SeoLandingParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLearn = useIsLearnRoute();

  useEffect(() => {
    if (isLearn) return;
    applySeoSearchParams(location.search);
  }, [location.search, isLearn]);

  useEffect(() => {
    if (isLearn) return;
    if (location.pathname !== '/') return;
    if (!hasSeoTryGuest(location.search)) return;
    navigate('/game?guest=1', { replace: true });
  }, [location.pathname, location.search, navigate, isLearn]);

  return null;
}
