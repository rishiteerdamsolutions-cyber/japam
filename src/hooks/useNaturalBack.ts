import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readReturnTo } from '../lib/navigationReturn';

/** Navigate to the logical parent page (location.state.returnTo), not browser history. */
export function useNaturalBack(fallback = '/menu') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    navigate(readReturnTo(location.state, fallback));
  }, [navigate, location.state, fallback]);
}
