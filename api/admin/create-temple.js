import { getDb, verifyAdminToken, jsonResponse, hashPassword, generatePriestUsername, generatePriestPassword } from '../../_lib.js';

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
    const { state, district, cityTownVillage, area, templeName } = body;
    if (!state || !district || !cityTownVillage || !area?.trim() || !templeName?.trim()) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const name = templeName.trim();
    let priestUsername = generatePriestUsername(name);
    let priestPassword = generatePriestPassword();
    const templesRef = db.collection('temples');
    let attempts = 0;
    while (attempts < 5) {
      const existing = await templesRef.where('priestUsername', '==', priestUsername).limit(1).get();
      if (existing.empty) break;
      priestUsername = generatePriestUsername(name + '-' + attempts);
      attempts++;
    }

    const priestPasswordHash = hashPassword(priestPassword);
    const temple = {
      name,
      state,
      district,
      cityTownVillage,
      area: area.trim(),
      priestUsername,
      priestPasswordHash,
      createdAt: new Date().toISOString(),
    };
    const docRef = await templesRef.add(temple);
    return jsonResponse({ ok: true, templeId: docRef.id, priestUsername, priestPassword });
  } catch (e) {
    console.error('admin create-temple', e);
    return jsonResponse({ error: e.message || 'Failed to create temple' }, 500);
  }
}
