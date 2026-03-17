import { useEffect, useState } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { NeoButton } from '../components/NeoButton';
import { fetchAppointments, requestAppointment, confirmAppointment, confirmArrival, fetchTemples, createAppointmentPaymentOrder, fetchAppointmentFeePaise } from '../lib/apavargaApi';
import { openCashfreeCheckout } from '../lib/cashfree';
import { usePriestStore } from '../store/priestStore';

interface Appointment {
  id: string;
  seekerUid?: string;
  seekerDisplayName?: string;
  templeId: string;
  templeName?: string;
  requestedAt: string;
  status: string;
  acceptedAt?: string;
  confirmedAt?: string;
  seekerArrivalConfirmed?: boolean;
  createdAt: string;
}

export function AppointmentsPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const preselectedTempleId = searchParams.get('templeId');
  const isPriest = !!usePriestStore((s) => s.token);
  const paymentSuccess = (location.state as { paymentSuccess?: boolean })?.paymentSuccess;
  const paymentError = (location.state as { paymentError?: string })?.paymentError;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [temples, setTemples] = useState<{ id: string; name: string; priestUsername?: string; appointmentAvailability?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(!!preselectedTempleId);
  const [selectedTempleId, setSelectedTempleId] = useState(preselectedTempleId || '');
  const [requestedAt, setRequestedAt] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [appointmentFeeRupees, setAppointmentFeeRupees] = useState<number>(108);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAppointments(), fetchTemples(), fetchAppointmentFeePaise()])
      .then(([a, t, feePaise]) => {
        if (!cancelled) {
          setAppointments(a);
          setTemples(t);
          setAppointmentFeeRupees(Math.round(feePaise / 100));
          if (preselectedTempleId) setSelectedTempleId(preselectedTempleId);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [preselectedTempleId]);

  const handleRequest = async () => {
    if (!selectedTempleId || !requestedAt || requesting) return;
    setRequesting(true);
    try {
      await requestAppointment(selectedTempleId, requestedAt);
      setShowRequest(false);
      setSelectedTempleId('');
      setRequestedAt('');
      const a = await fetchAppointments();
      setAppointments(a);
    } catch {
      // ignore
    } finally {
      setRequesting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setConfirming(id);
    try {
      await confirmAppointment(id);
      const a = await fetchAppointments();
      setAppointments(a);
    } catch {
      // ignore
    } finally {
      setConfirming(null);
    }
  };

  const handleArrivalConfirm = async (id: string) => {
    setConfirming(id);
    try {
      await confirmArrival(id);
      const a = await fetchAppointments();
      setAppointments(a);
    } catch {
      // ignore
    } finally {
      setConfirming(null);
    }
  };

  const handlePay = async (id: string) => {
    setPayError(null);
    setPaying(id);
    try {
      const { paymentSessionId } = await createAppointmentPaymentOrder(id);
      await openCashfreeCheckout(paymentSessionId, { redirectTarget: '_self' });
      const a = await fetchAppointments();
      setAppointments(a);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pb-24 flex items-center justify-center">
        <p className="text-white/60 font-mono text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <h1 className="font-heading font-semibold text-xl text-white">Appointments</h1>
        <p className="text-white/60 text-xs font-mono mt-1">{isPriest ? 'Manage requests' : 'Book darshan with priests'}</p>
        {isPriest && (
          <Link to="/profile" className="block mt-2 text-[var(--primary)] text-xs font-mono hover:underline">
            Set your availability (time & days) →
          </Link>
        )}
      </header>

      <div className="p-4 space-y-4">
        {(payError || paymentError) && (
          <div className="rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm px-3 py-2 flex items-center justify-between gap-2">
            <span>{payError || paymentError}</span>
            <button type="button" onClick={() => { setPayError(null); window.history.replaceState({}, '', location.pathname); }} className="underline">Dismiss</button>
          </div>
        )}
        {paymentSuccess && (
          <div className="rounded-lg bg-green-500/20 border border-green-500/40 text-green-200 text-sm px-3 py-2">
            Booking confirmed! The priest has been notified.
          </div>
        )}
        {!isPriest && (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 mb-4">
            <h3 className="font-heading font-medium text-white mb-3">Temples available</h3>
            <p className="text-white/60 text-xs font-mono mb-3">Book darshan with verified priests</p>
            {temples.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {temples.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-black/40 border border-white/10">
                    <div>
                      <p className="text-white font-mono text-sm">{t.name}</p>
                      {t.priestUsername && (
                        <p className="text-[var(--primary)]/80 text-[10px] font-mono mt-0.5">
                          Priest: {t.priestUsername}
                        </p>
                      )}
                      {t.appointmentAvailability && (
                        <p className="text-white/50 text-[10px] font-mono mt-0.5">
                          Available: {t.appointmentAvailability}
                        </p>
                      )}
                    </div>
                    <NeoButton variant="primaryGold" onClick={() => { setSelectedTempleId(t.id); setShowRequest(true); }}>
                      Book
                    </NeoButton>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-xs font-mono py-4">No temples available for appointments yet. Add temples via Admin → Temples and ensure priests have set up their accounts.</p>
            )}
          </div>
        )}

        {!isPriest && (
          <NeoButton variant="primaryGold" fullWidth onClick={() => setShowRequest(true)}>
            Book appointment
          </NeoButton>
        )}

        {showRequest && !isPriest && (
          <div className="rounded-2xl bg-[#151515] border border-white/10 p-4 space-y-4">
            <h3 className="font-heading font-medium text-white">Request appointment</h3>
            <select
              value={selectedTempleId}
              onChange={(e) => setSelectedTempleId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 font-mono text-sm"
            >
              <option value="">{temples.length > 0 ? 'Select temple' : 'No temples available'}</option>
              {temples.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.priestUsername ? ` — ${t.priestUsername}` : ''}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={requestedAt}
              onChange={(e) => setRequestedAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black text-white border border-white/20 font-mono text-sm"
            />
            <div className="flex gap-2">
              <NeoButton variant="primaryGold" onClick={handleRequest} disabled={!selectedTempleId || !requestedAt || requesting}>
                {requesting ? 'Sending…' : 'Send request'}
              </NeoButton>
              <NeoButton variant="ghost" onClick={() => setShowRequest(false)}>Cancel</NeoButton>
            </div>
          </div>
        )}

        <h2 className="font-heading font-medium text-white mt-6">{isPriest ? 'Incoming' : 'Your appointments'}</h2>
        <div className="space-y-2">
          {appointments.map((a) => (
            <div key={a.id} className="p-4 rounded-2xl bg-[#151515] border border-white/10">
              <p className="text-white font-mono text-sm">
                {isPriest ? (a.seekerDisplayName || 'Seeker') : (a.templeName || a.templeId || 'Temple')}
              </p>
              <p className="text-white/60 text-xs font-mono mt-1">
                {a.requestedAt ? new Date(a.requestedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} • {a.status}
              </p>
              {isPriest && a.status === 'requested' && (
                <NeoButton variant="primaryGold" className="mt-2" onClick={() => handleConfirm(a.id)} disabled={confirming === a.id}>
                  {confirming === a.id ? 'Accepting…' : 'Accept'}
                </NeoButton>
              )}
              {isPriest && a.status === 'accepted' && (
                <p className="text-amber-300/90 text-xs font-mono mt-2">Waiting for seeker to pay ₹{appointmentFeeRupees}</p>
              )}
              {isPriest && a.status === 'confirmed' && (
                <p className="text-green-400/90 text-xs font-mono mt-2">Booking confirmed</p>
              )}
              {!isPriest && a.status === 'accepted' && (
                <div className="mt-2 space-y-2">
                  <p className="text-amber-200/90 text-xs font-mono">Appointment accepted at the set time. Pay ₹{appointmentFeeRupees} to confirm.</p>
                  <NeoButton variant="primaryGold" onClick={() => handlePay(a.id)} disabled={paying === a.id}>
                    {paying === a.id ? 'Opening payment…' : `Pay ₹${appointmentFeeRupees}`}
                  </NeoButton>
                </div>
              )}
              {!isPriest && a.status === 'confirmed' && !a.seekerArrivalConfirmed && (
                <div className="mt-2 space-y-2">
                  <p className="text-green-400/90 text-xs font-mono">Booking confirmed</p>
                  <NeoButton variant="primaryGold" onClick={() => handleArrivalConfirm(a.id)} disabled={confirming === a.id}>
                    {confirming === a.id ? 'Confirming…' : "I'm coming"}
                  </NeoButton>
                </div>
              )}
              {!isPriest && a.status === 'confirmed' && a.seekerArrivalConfirmed && (
                <p className="text-green-400/90 text-xs font-mono mt-2">Booking confirmed • You confirmed arrival</p>
              )}
            </div>
          ))}
        </div>
        {appointments.length === 0 && <p className="text-white/50 text-xs font-mono">No appointments yet.</p>}
      </div>
    </div>
  );
}
