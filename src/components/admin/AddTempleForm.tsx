import { useState, useEffect } from 'react';
import { REGIONS, getState, getDistrict } from '../../data/regions';
import { validatePriestUsername, validatePriestPassword } from '../../lib/priestValidation';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface AddTempleFormProps {
  adminToken: string | null;
  onSuccess: () => void;
  onLogout?: () => void;
}

export function AddTempleForm({ adminToken, onSuccess, onLogout }: AddTempleFormProps) {
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [cityId, setCityId] = useState('');
  const [area, setArea] = useState('');
  const [templeName, setTempleName] = useState('');
  const [priestUsername, setPriestUsername] = useState('');
  const [priestPassword, setPriestPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const state = stateId ? getState(stateId) : null;
  const district = state && districtId ? getDistrict(stateId, districtId) : null;
  const cities = district?.cities ?? [];

  useEffect(() => {
    setDistrictId('');
    setCityId('');
  }, [stateId]);

  useEffect(() => {
    setCityId('');
  }, [districtId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) {
      setMessage('Admin session expired');
      return;
    }
    if (!area.trim() || !templeName.trim() || !priestUsername.trim() || !priestPassword) {
      setMessage('Fill all fields');
      return;
    }
    if (!validatePriestUsername(priestUsername.trim())) {
      setMessage('Username must be pujari@templename (e.g. pujari@venkateswara)');
      return;
    }
    if (!validatePriestPassword(priestPassword)) {
      setMessage('Password: 2 caps, 2 digits, 2 small, 2 symbols; 10-20 chars');
      return;
    }
    if (!stateId || !districtId || !cityId) {
      setMessage('Select State, District and City');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/create-temple` : '/api/admin/create-temple';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          state: stateId,
          district: districtId,
          cityTownVillage: cityId,
          area: area.trim(),
          templeName: templeName.trim(),
          priestUsername: priestUsername.trim(),
          priestPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Failed to create temple');
        if (res.status === 401 && onLogout) onLogout();
        return;
      }
      setMessage('Temple created. Give priest: ' + priestUsername.trim() + ' / (password)');
      setArea('');
      setTempleName('');
      setPriestUsername('');
      setPriestPassword('');
      onSuccess();
    } catch (e) {
      setMessage('Failed (check API)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-amber-200/80 text-sm block mb-1">State</label>
        <select
          value={stateId}
          onChange={(e) => setStateId(e.target.value)}
          className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          required
        >
          <option value="">Select State</option>
          {REGIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      {state && (
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">District</label>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          >
            <option value="">Select District</option>
            {state.districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}
      {district && (
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">City / Town / Village</label>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          >
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-amber-200/80 text-sm block mb-1">Area name</label>
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="e.g. Main Road"
          className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          required
        />
      </div>
      <div>
        <label className="text-amber-200/80 text-sm block mb-1">Temple name</label>
        <input
          type="text"
          value={templeName}
          onChange={(e) => setTempleName(e.target.value)}
          placeholder="e.g. Sri Venkateswara Temple"
          className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          required
        />
      </div>
      <div>
        <label className="text-amber-200/80 text-sm block mb-1">Priest username (pujari@templename)</label>
        <input
          type="text"
          value={priestUsername}
          onChange={(e) => setPriestUsername(e.target.value)}
          placeholder="pujari@venkateswara"
          className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          required
        />
      </div>
      <div>
        <label className="text-amber-200/80 text-sm block mb-1">Priest password (2 caps, 2 digits, 2 small, 2 symbols; 10-20 chars)</label>
        <input
          type="password"
          value={priestPassword}
          onChange={(e) => setPriestPassword(e.target.value)}
          placeholder="P@101@VENKATeswara@!"
          className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
      >
        {saving ? 'Creating…' : 'Add Temple'}
      </button>
      {message && <p className="text-amber-200 text-sm">{message}</p>}
    </form>
  );
}
