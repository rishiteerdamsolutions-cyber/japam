import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';

function getToken(request, body) {
  return body?.token || getAdminTokenFromRequest(request);
}

function mapTemple(d) {
  const data = d.data();
  return {
    id: d.id,
    name: data.name,
    state: data.state,
    district: data.district,
    cityTownVillage: data.cityTownVillage,
    area: data.area,
    priestUsername: data.priestUsername,
  };
}

async function listTemplesResponse(request, body) {
  const token = getToken(request, body);
  if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const snap = await db.collection('temples').orderBy('createdAt', 'desc').limit(500).get();
  return jsonResponse({ temples: snap.docs.map(mapTemple) });
}

export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const snap = await db.collection('temples').orderBy('createdAt', 'desc').limit(500).get();
    return jsonResponse({ temples: snap.docs.map(mapTemple) });
  } catch (e) {
    console.error('admin list-temples GET', e);
    return jsonResponse({ error: e.message || 'Failed to list temples' }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    return await listTemplesResponse(request, body);
  } catch (e) {
    console.error('admin list-temples POST', e);
    return jsonResponse({ error: e?.message || 'Failed to list temples' }, 500);
  }
}
