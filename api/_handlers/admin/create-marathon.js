/**
 * POST /api/admin/create-marathon - Create a community marathon (admin only).
 * Body: { communityName, state, district, cityTownVillage, area, deityId, targetJapas, startDate }
 * Same fields as priest-created marathons but uses community/society name instead of temple.
 */
import { getDb, verifyAdminToken, jsonResponse, logAudit } from '../_lib.js';

function getAdminToken(request, body) {
  const auth = request.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || null;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getAdminToken(request, body);
    if (!verifyAdminToken(token)) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }
    const {
      communityName,
      state,
      district,
      cityTownVillage,
      area,
      deityId,
      targetJapas,
      startDate,
    } = body;

    if (!communityName?.trim()) {
      return jsonResponse({ error: 'communityName required' }, 400);
    }
    if (!state?.trim() || !district?.trim() || !cityTownVillage?.trim() || !area?.trim()) {
      return jsonResponse({ error: 'state, district, cityTownVillage, area required' }, 400);
    }
    if (!deityId || !targetJapas || !startDate) {
      return jsonResponse({ error: 'deityId, targetJapas, startDate required' }, 400);
    }

    const target = Math.round(Number(targetJapas));
    if (!Number.isFinite(target) || target < 1) {
      return jsonResponse({ error: 'targetJapas must be a positive number' }, 400);
    }

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const marathon = {
      isCommunity: true,
      communityName: String(communityName).trim(),
      state: String(state).trim(),
      district: String(district).trim(),
      cityTownVillage: String(cityTownVillage).trim(),
      area: String(area).trim(),
      deityId,
      targetJapas: target,
      startDate: String(startDate),
      joinedCount: 0,
      japasToday: 0,
      totalJapas: 0,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('marathons').add(marathon);
    await logAudit('admin_create_marathon', { marathonId: docRef.id, communityName: marathon.communityName, deityId });
    return jsonResponse({ ok: true, marathonId: docRef.id });
  } catch (e) {
    console.error('admin create-marathon', e);
    return jsonResponse({ error: e?.message || 'Failed to create marathon' }, 500);
  }
}
