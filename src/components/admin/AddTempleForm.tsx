import { useState, useEffect } from 'react';
import INDIA_REGIONS from '../../data/indiaRegions.json';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const STATES = [...INDIA_REGIONS.states, ...INDIA_REGIONS.union_territories];

interface AddTempleFormProps {
  adminToken: string | null;
  onSuccess: () => void;
  onLogout?: () => void;
}

export function AddTempleForm({ adminToken, onSuccess, onLogout }: AddTempleFormProps) {
  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [cityName, setCityName] = useState('');
  const [area, setArea] = useState('');
  const [templeName, setTempleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ priestUsername: string; priestPassword: string } | null>(null);

  const state = STATES.find((s) => s.name === stateName) || null;
  const districts = state?.districts ?? [];

  useEffect(() => {
    setDistrictName('');
    setCityName('');
  }, [stateName]);

  useEffect(() => {
    setCityName('');
  }, [districtName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) {
      setMessage('Admin session expired');
      return;
    }
    if (!area.trim() || !templeName.trim()) {
      setMessage('Fill Area and Temple name');
      return;
    }
    if (!stateName || !districtName || !cityName.trim()) {
      setMessage('Select State, District and enter City/Town/Village');
      return;
    }

    setSaving(true);
    setMessage(null);
    setCreatedCredentials(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/create-temple` : '/api/admin/create-temple';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          state: stateName,
          district: districtName,
          cityTownVillage: cityName.trim(),
          area: area.trim(),
          templeName: templeName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Failed to create temple');
        if (res.status === 401 && onLogout) onLogout();
        return;
      }
      setCreatedCredentials({
        priestUsername: data.priestUsername || '',
        priestPassword: data.priestPassword || '',
      });
      setArea('');
      setTempleName('');
      onSuccess();
    } catch (e) {
      setMessage('Failed (check API)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">State</label>
          <select
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          >
            <option value="">Select State</option>
            {STATES.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        {state && (
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">District</label>
            <select
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            >
              <option value="">Select District</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
        {districtName && (
          <div>
            <label className="text-amber-200/80 text-sm block mb-1">City / Town / Village</label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="City / Town / Village"
              className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
              required
            />
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
        <p className="text-amber-200/60 text-xs">Priest username and password are auto-generated and shown after creation.</p>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Add Temple'}
        </button>
        {message && <p className="text-red-400 text-sm">{message}</p>}
      </form>

      {createdCredentials && (
        <div className="mt-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/40">
          <p className="text-amber-400 font-semibold mb-2">Temple created. Give priest these credentials:</p>
          <div className="space-y-2">
            <div>
              <span className="text-amber-200/80 text-sm">Username: </span>
              <span className="text-white font-mono">{createdCredentials.priestUsername}</span>
            </div>
            <div>
              <span className="text-amber-200/80 text-sm">Password: </span>
              <span className="text-white font-mono">{createdCredentials.priestPassword}</span>
            </div>
          </div>
          <p className="text-amber-200/70 text-xs mt-2">Priest signs in with Google, then links this account in Settings → Priest login.</p>
        </div>
      )}
    </div>
  );
}
