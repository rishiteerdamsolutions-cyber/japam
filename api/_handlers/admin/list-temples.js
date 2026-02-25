import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';

function getToken(request, body) {
  return body?.token || getAdminTokenFromRequest(request);
}

async function listTemplesResponse(request, body) {
  const token = getToken(request, body);
  if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const snap = await db.collection('temples').orderBy('createdAt', 'desc').get();
  const temples = snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    state: d.data().state,
    district: d.data().district,
    cityTownVillage: d.data().cityTownVillage,
    area: d.data().area,
    priestUsername: d.data().priestUsername,
  }));
  return jsonResponse({ temples });
}

export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const snap = await db.collection('temples').orderBy('createdAt', 'desc').get();
    const temples = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      state: d.data().state,
      district: d.data().district,
      cityTownVillage: d.data().cityTownVillage,
      area: d.data().area,
      priestUsername: d.data().priestUsername,
    }));
    return jsonResponse({ temples });
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
