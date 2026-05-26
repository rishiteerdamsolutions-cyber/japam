import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from '../components/Settings';
import { readReturnTo } from '../lib/navigationReturn';

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const handleBack = () => {
    navigate(readReturnTo(location.state, '/menu'));
  };

  return <Settings onBack={handleBack} />;
}
