import { getDb, verifyPriestForApi, jsonResponse } from '../_lib.js';
import admin from 'firebase-admin';

const DEITY_NAMES = { rama: 'Rama', shiva: 'Shiva', ganesh: 'Ganesh', surya: 'Surya', shakthi: 'Shakthi', krishna: 'Krishna', shanmukha: 'Shanmukha', venkateswara: 'Venkateswara' };

function getPriestToken(request, body) {
  const auth = request?.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || null;
}

/** GET /api/priest/maha-yagnas - List Maha Japa Yagnas for priest's temple */
export async function GET(request) {
  try {
    const token = getPriestToken(request, {});
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const priest = await verifyPriestForApi(token, db);
    if (!priest) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const snap = await db.collection('mahaJapaYagnas').where('templeId', '==', priest.templeId).get();
    const yagnas = [];
    for (const d of snap.docs) {
      const data = d.data();
      const usersSnap = await db.collection('mahaJapaYagnaUsers').where('yagnaId', '==', d.id).get();
      yagnas.push({
        id: d.id,
        name: data.name || 'Maha Japa Yagna',
        deityId: data.deityId,
        deityName: DEITY_NAMES[data.deityId] || data.deityId,
        mantra: data.mantra || '',
        goalJapas: data.goalJapas ?? 0,
        currentJapas: data.currentJapas ?? 0,
        participantCount: usersSnap.size,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        status: data.status || 'active',
      });
    }
    yagnas.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    return jsonResponse({ yagnas });
  } catch (e) {
    console.error('priest maha-yagnas GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/priest/maha-yagnas - Create Temple Maha Japa Yagna (templeId from priest token) */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getPriestToken(request, body);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const priest = await verifyPriestForApi(token, db);
    if (!priest) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const { name, description, deityId, mantra, goalJapas, startDate, endDate } = body;
    if (!name?.trim()) return jsonResponse({ error: 'name required' }, 400);
    if (!deityId || !mantra?.trim()) return jsonResponse({ error: 'deityId and mantra required' }, 400);
    if (!goalJapas || !startDate || !endDate) return jsonResponse({ error: 'goalJapas, startDate, endDate required' }, 400);

    const goal = Math.round(Number(goalJapas));
    if (!Number.isFinite(goal) || goal < 1) return jsonResponse({ error: 'goalJapas must be a positive number' }, 400);

    const yagna = {
      name: String(name).trim(),
      description: typeof description === 'string' ? description.trim() : '',
      deityId,
      mantra: String(mantra).trim(),
      goalJapas: goal,
      currentJapas: 0,
      startDate: String(startDate),
      endDate: String(endDate),
      creatorRole: 'PRIEST',
      createdBy: priest.templeId,
      templeId: priest.templeId,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('mahaJapaYagnas').add(yagna);
    return jsonResponse({ ok: true, yagnaId: docRef.id });
  } catch (e) {
    console.error('priest maha-yagnas POST', e);
    return jsonResponse({ error: e?.message || 'Failed to create yagna' }, 500);
  }
}
