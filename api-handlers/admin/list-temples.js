import { getDb, verifyAdminToken, jsonResponse } from '../_lib.js';

function getAdminToken(request) {
  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  const url = new URL(request.url);
  return url.searchParams.get('token') || null;
}

export async function GET(request) {
  try {
    const token = getAdminToken(request);
    if (!verifyAdminToken(token)) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }
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
    console.error('admin list-temples', e);
    return jsonResponse({ error: e.message || 'Failed to list temples' }, 500);
  }
}
