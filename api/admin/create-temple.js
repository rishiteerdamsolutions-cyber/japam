import { getDb, verifyAdminToken, jsonResponse, hashPassword, validatePriestUsername, validatePriestPassword } from '../../_lib.js';

function getAdminToken(request, body) {
  const auth = request.headers.get('authorization');
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
    const { state, district, cityTownVillage, area, templeName, priestUsername, priestPassword } = body;
    if (!state || !district || !cityTownVillage || !area?.trim() || !templeName?.trim() || !priestUsername?.trim() || !priestPassword) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }
    if (!validatePriestUsername(priestUsername.trim())) {
      return jsonResponse({ error: 'Username must be pujari@templename (e.g. pujari@venkateswara)' }, 400);
    }
    if (!validatePriestPassword(priestPassword)) {
      return jsonResponse({ error: 'Password: 2 caps, 2 digits, 2 small, 2 symbols; 10-20 chars' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const templesRef = db.collection('temples');
    const existing = await templesRef.where('priestUsername', '==', priestUsername.trim()).limit(1).get();
    if (!existing.empty) {
      return jsonResponse({ error: 'Username already exists' }, 400);
    }

    const priestPasswordHash = hashPassword(priestPassword);
    const temple = {
      name: templeName.trim(),
      state,
      district,
      cityTownVillage,
      area: area.trim(),
      priestUsername: priestUsername.trim(),
      priestPasswordHash,
      createdAt: new Date().toISOString(),
    };
    const docRef = await templesRef.add(temple);
    return jsonResponse({ ok: true, templeId: docRef.id });
  } catch (e) {
    console.error('admin create-temple', e);
    return jsonResponse({ error: e.message || 'Failed to create temple' }, 500);
  }
}
