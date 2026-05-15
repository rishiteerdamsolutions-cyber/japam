import { useLocation } from 'react-router-dom';

export function useIsLearnRoute(): boolean {
  const { pathname } = useLocation();
  return pathname.startsWith('/learn');
}
