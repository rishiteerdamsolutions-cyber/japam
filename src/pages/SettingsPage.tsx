import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from '../components/Settings';
import { normalizeSettingsReturn } from '../lib/settingsReturnPath';

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = normalizeSettingsReturn((location.state as { from?: string } | null)?.from);

  const handleBack = () => {
    if (from) {
      navigate(from);
      return;
    }
    navigate('/menu');
  };

  return <Settings onBack={handleBack} />;
}
