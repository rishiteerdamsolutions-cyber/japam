import { useNavigate } from 'react-router-dom';
import { JapaDashboard } from '../components/dashboard/JapaDashboard';

export function JapaPage() {
  const navigate = useNavigate();
  return <JapaDashboard onBack={() => navigate(-1)} />;
}
