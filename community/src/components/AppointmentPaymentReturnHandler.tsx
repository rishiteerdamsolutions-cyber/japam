import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { verifyAppointmentPayment } from '../lib/apavargaApi';

/** Handles return from Cashfree redirect when appointment_return=1&order_id=xxx in URL */
export function AppointmentPaymentReturnHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const handled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('order_id');
    const appointmentReturn = params.get('appointment_return');
    if (!orderId || !user?.uid || handled.current) return;
    if (appointmentReturn !== '1') return;
    handled.current = true;

    (async () => {
      try {
        await verifyAppointmentPayment(orderId);
        window.history.replaceState({}, '', location.pathname || '/');
        navigate('/appointments', { replace: true, state: { paymentSuccess: true } });
      } catch (e) {
        window.history.replaceState({}, '', location.pathname || '/');
        navigate('/appointments', { replace: true, state: { paymentError: e instanceof Error ? e.message : 'Verification failed' } });
      }
    })();
  }, [location.search, location.pathname, user?.uid, navigate]);

  return null;
}
