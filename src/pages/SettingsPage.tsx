import { useNavigate } from 'react-router-dom';
import { Settings } from '../components/Settings';

export function SettingsPage() {
  const navigate = useNavigate();
  return <Settings onBack={() => navigate('/', { replace: true })} />;
}
