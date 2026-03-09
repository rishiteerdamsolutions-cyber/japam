import { useState, useEffect } from 'react';
import INDIA_REGIONS from '../../data/indiaRegions.json';
import { DEITIES } from '../../data/deities';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const STATES = [...INDIA_REGIONS.states, ...INDIA_REGIONS.union_territories];

interface AdminCreateMarathonFormProps {
  adminToken: string | null;
  onSuccess: () => void;
  onUnauthorized?: () => void;
}

export function AdminCreateMarathonForm({ adminToken, onSuccess, onUnauthorized }: AdminCreateMarathonFormProps) {
  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [cityName, setCityName] = useState('');
  const [area, setArea] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [deityId, setDeityId] = useState('');
  const [targetJapas, setTargetJapas] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    if (!communityName.trim()) {
      setMessage('Enter Community/Society name');
      return;
    }
    if (!stateName || !districtName || !cityName.trim() || !area.trim()) {
      setMessage('Select State, District and enter City/Town/Village, Area');
      return;
    }
    if (!deityId || !targetJapas || !startDate) {
      setMessage('Select Deity, enter Target japas, and Start date');
      return;
    }
    const target = Math.round(Number(targetJapas));
    if (!Number.isFinite(target) || target < 1) {
      setMessage('Target japas must be a positive number');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/create-marathon` : '/api/admin/create-marathon';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          communityName: communityName.trim(),
          state: stateName,
          district: districtName,
          cityTownVillage: cityName.trim(),
          area: area.trim(),
          deityId,
          targetJapas: target,
          startDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (!res.ok) {
        setMessage(data.error || 'Failed to create marathon');
        return;
      }
      setCommunityName('');
      setDeityId('');
      setTargetJapas('');
      setStartDate(new Date().toISOString().slice(0, 10));
      onSuccess();
    } catch {
      setMessage('Failed (check API)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-amber-300 font-medium">Create community marathon</h3>
      <p className="text-amber-200/70 text-xs">Same as priest-created marathons, but use Community/Society name instead of temple.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">Community / Society name</label>
          <input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder="e.g. Sri Rama Society"
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          />
        </div>
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
          <label className="text-amber-200/80 text-sm block mb-1">Area</label>
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
          <label className="text-amber-200/80 text-sm block mb-1">Deity</label>
          <select
            value={deityId}
            onChange={(e) => setDeityId(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          >
            <option value="">Select deity</option>
            {DEITIES.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">Target japas</label>
          <input
            type="number"
            min={1}
            value={targetJapas}
            onChange={(e) => setTargetJapas(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          />
        </div>
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create marathon'}
        </button>
        {message && <p className="text-red-400 text-sm">{message}</p>}
      </form>
    </div>
  );
}
