import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, jsonInternalServerError } from '../_lib.js';

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

async function listTemplesCore(request) {
  const token = getAdminTokenFromRequest(request);
  if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const snap = await db.collection('temples').orderBy('createdAt', 'desc').limit(500).get();
  return jsonResponse({ temples: snap.docs.map(mapTemple) });
}

export async function GET(request) {
  try {
    return await listTemplesCore(request);
  } catch (e) {
    console.error('admin list-temples GET', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/list-temples.js');
  }
}

export async function POST(request) {
  try {
    await request.json().catch(() => ({}));
    return await listTemplesCore(request);
  } catch (e) {
    console.error('admin list-temples POST', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/list-temples.js');
  }
}
