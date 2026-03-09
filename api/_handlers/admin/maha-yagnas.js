import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, logAudit } from '../_lib.js';
import admin from 'firebase-admin';

const DEITY_NAMES = { rama: 'Rama', shiva: 'Shiva', ganesh: 'Ganesh', surya: 'Surya', shakthi: 'Shakthi', krishna: 'Krishna', shanmukha: 'Shanmukha', venkateswara: 'Venkateswara' };

function getToken(request, body) {
  const auth = request?.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || getAdminTokenFromRequest(request);
}

/** GET /api/admin/maha-yagnas - List all Maha Japa Yagnas with totals and participant count */
export async function GET(request) {
  try {
    const token = getToken(request, {});
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const snap = await db.collection('mahaJapaYagnas').get();
    const yagnas = [];
    for (const d of snap.docs) {
      const data = d.data();
      const usersSnap = await db.collection('mahaJapaYagnaUsers').where('yagnaId', '==', d.id).get();
      const participantCount = usersSnap.size;
      const currentJapas = typeof data.currentJapas === 'number' ? data.currentJapas : 0;
      const goalJapas = typeof data.goalJapas === 'number' ? data.goalJapas : 0;
      let templeName = 'Global';
      if (data.templeId) {
        const tSnap = await db.doc(`temples/${data.templeId}`).get();
        templeName = tSnap.exists ? (tSnap.data()?.name || 'Temple') : 'Temple';
      }
      yagnas.push({
        id: d.id,
        name: data.name || 'Maha Japa Yagna',
        description: data.description || '',
        deityId: data.deityId,
        deityName: DEITY_NAMES[data.deityId] || data.deityId,
        mantra: data.mantra || '',
        goalJapas,
        currentJapas,
        participantCount,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        status: data.status || 'active',
        templeId: data.templeId || null,
        templeName,
        creatorRole: data.creatorRole || 'ADMIN',
      });
    }
    yagnas.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    return jsonResponse({ yagnas });
  } catch (e) {
    console.error('admin maha-yagnas GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/admin/maha-yagnas - Create Maha Japa Yagna (admin: global or temple) */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getToken(request, body);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const { name, description, deityId, mantra, goalJapas, startDate, endDate, templeId } = body;
    if (!name?.trim()) return jsonResponse({ error: 'name required' }, 400);
    if (!deityId || !mantra?.trim()) return jsonResponse({ error: 'deityId and mantra required' }, 400);
    if (!goalJapas || !startDate || !endDate) return jsonResponse({ error: 'goalJapas, startDate, endDate required' }, 400);

    const goal = Math.round(Number(goalJapas));
    if (!Number.isFinite(goal) || goal < 1) return jsonResponse({ error: 'goalJapas must be a positive number' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const yagna = {
      name: String(name).trim(),
      description: typeof description === 'string' ? description.trim() : '',
      deityId,
      mantra: String(mantra).trim(),
      goalJapas: goal,
      currentJapas: 0,
      startDate: String(startDate),
      endDate: String(endDate),
      creatorRole: 'ADMIN',
      createdBy: 'admin',
      templeId: templeId && String(templeId).trim() ? String(templeId).trim() : null,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('mahaJapaYagnas').add(yagna);
    await logAudit('admin_create_maha_yagna', { yagnaId: docRef.id, name: yagna.name, deityId });
    return jsonResponse({ ok: true, yagnaId: docRef.id });
  } catch (e) {
    console.error('admin maha-yagnas POST', e);
    return jsonResponse({ error: e?.message || 'Failed to create yagna' }, 500);
  }
}
