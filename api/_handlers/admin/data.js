/**
 * POST /api/admin/data - Single admin endpoint: token + type in body (or token in header as fallback).
 * Body: { token, type: "temples" | "marathons" | "users" }
 * Token can also come from Authorization: Bearer <token> or X-Admin-Token (if body is missing).
 */
import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';

const DEITY_NAMES = { rama: 'Rama', shiva: 'Shiva', ganesh: 'Ganesh', surya: 'Surya', shakthi: 'Shakthi', krishna: 'Krishna', shanmukha: 'Shanmukha', venkateswara: 'Venkateswara' };

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body?.token && typeof body.token === 'string') ? body.token : getAdminTokenFromRequest(request);
    if (!token) return jsonResponse({ error: 'Missing token' }, 401);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    let type = body?.type;
    if (!type) {
      try {
        const url = new URL(request.url);
        type = url.searchParams.get('type') || null;
      } catch {}
    }

    if (type === 'temples') {
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

    if (type === 'marathons') {
      const marathonsSnap = await db.collection('marathons').get();
      const marathons = [];
      for (const d of marathonsSnap.docs) {
        const data = d.data();
        const templeSnap = await db.doc(`temples/${data.templeId}`).get();
        const temple = templeSnap.exists ? templeSnap.data() : null;
        const participationsSnap = await db.collection('marathonParticipations').where('marathonId', '==', d.id).get();
        const participants = participationsSnap.docs.map((p) => {
          const pData = p.data();
          return { userId: pData.userId, displayName: pData.userId?.slice(0, 12) || '—', japasCount: pData.japasCount ?? 0 };
        });
        participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
        marathons.push({
          id: d.id,
          templeId: data.templeId,
          templeName: temple?.name || '—',
          priestUsername: temple?.priestUsername || '—',
          deityId: data.deityId,
          deityName: DEITY_NAMES[data.deityId] || data.deityId,
          targetJapas: data.targetJapas,
          startDate: data.startDate,
          joinedCount: data.joinedCount ?? 0,
          topParticipants: participants.slice(0, 10),
        });
      }
      marathons.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      return jsonResponse({ marathons });
    }

    if (type === 'users') {
      const [unlockedSnap, blockedSnap] = await Promise.all([
        db.collection('unlockedUsers').get(),
        db.collection('blockedUsers').get(),
      ]);
      const blockedSet = new Set(blockedSnap.docs.map((d) => d.id));
      const users = unlockedSnap.docs
        .map((d) => {
          const data = d.data();
          const uid = data.uid || d.id;
          return {
            uid,
            email: data.email || null,
            unlockedAt: data.unlockedAt || null,
            isBlocked: blockedSet.has(uid),
          };
        })
        .sort((a, b) => (b.unlockedAt || '').localeCompare(a.unlockedAt || ''));
      return jsonResponse({ users, total: users.length });
    }

    return jsonResponse({ error: 'Invalid type. Use temples, marathons, or users.' }, 400);
  } catch (e) {
    console.error('admin data', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
