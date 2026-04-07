/**
 * DELETE /api/user/account — GDPR Right to Erasure
 *
 * Permanently deletes:
 *   1. Firebase Auth user account
 *   2. All Firestore documents owned by the user
 *   3. Public user summary
 *   4. Marathon participations
 *   5. Donor record (kept anonymised if donor)
 *   6. Apavarga community data
 *
 * Requires: Firebase ID token (Bearer header)
 * Returns:  { ok: true, deletedCollections: [...] }
 *
 * Partial failures are logged but do not abort the delete — the most
 * important step (Auth user deletion) is attempted last so orphaned
 * Firestore data is cleaned before the account is gone.
 */

import { getDb, verifyFirebaseUser, jsonResponse } from '../_lib.js';
import admin from 'firebase-admin';
import logger from '../_log.js';

const BATCH_LIMIT = 450; // Firestore batch max is 500; leave headroom

async function deleteBatch(db, query) {
  const snap = await query.get();
  if (snap.empty) return 0;
  let batch = db.batch();
  let ops = 0;
  let total = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    ops++;
    total++;
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return total;
}

export async function DELETE(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const deleted = {};
    const errors = [];

    async function tryDelete(label, fn) {
      try {
        deleted[label] = await fn();
      } catch (e) {
        errors.push({ collection: label, error: e.message });
        logger.error(`[GDPR delete] ${label} failed`, { uid, error: e.message });
      }
    }

    // User subcollections
    await tryDelete('users/data', async () => {
      const subSnap = await db.collection(`users/${uid}/data`).get();
      if (subSnap.empty) return 0;
      let batch = db.batch();
      let ops = 0;
      for (const doc of subSnap.docs) {
        batch.delete(doc.ref);
        ops++;
      }
      if (ops > 0) await batch.commit();
      await db.doc(`users/${uid}`).delete().catch(() => {});
      return ops;
    });

    // Public user summary
    await tryDelete('publicUsers', async () => {
      await db.doc(`publicUsers/${uid}`).delete();
      return 1;
    });

    // Unlocked users record
    await tryDelete('unlockedUsers', async () => {
      await db.doc(`unlockedUsers/${uid}`).delete();
      return 1;
    });

    // Donors: anonymise instead of delete (financial audit trail)
    await tryDelete('donors (anonymised)', async () => {
      const snap = await db.doc(`donors/${uid}`).get();
      if (!snap.exists) return 0;
      await snap.ref.set(
        { uid: '[deleted]', displayName: 'Anonymous', deletedAt: new Date().toISOString() },
        { merge: true },
      );
      return 1;
    });

    // Marathon participations
    await tryDelete('marathonParticipations', async () => {
      return deleteBatch(db, db.collection('marathonParticipations').where('userId', '==', uid));
    });

    // Apavarga: chats (user is a member of)
    await tryDelete('apavargaChats', async () => {
      // Mark user as deleted in chat membership rather than deleting entire chat room
      const snap = await db.collection('apavargaChats').where('members', 'array-contains', uid).get();
      if (snap.empty) return 0;
      let batch = db.batch();
      let ops = 0;
      for (const doc of snap.docs) {
        batch.update(doc.ref, { [`membersData.${uid}`]: admin.firestore.FieldValue.delete() });
        ops++;
      }
      if (ops > 0) await batch.commit();
      return ops;
    });

    // Apavarga messages authored by user
    await tryDelete('apavargaMessages', async () => {
      return deleteBatch(db, db.collection('apavargaMessages').where('senderUid', '==', uid));
    });

    // Apavarga statuses
    await tryDelete('apavargaStatus', async () => {
      return deleteBatch(db, db.collection('apavargaStatus').where('uid', '==', uid));
    });

    // Apavarga blocks involving this user
    await tryDelete('apavargaBlocks', async () => {
      const [asBlocker, asBlocked] = await Promise.all([
        db.collection('apavargaBlocks').where('blockerUid', '==', uid).get(),
        db.collection('apavargaBlocks').where('blockedUid', '==', uid).get(),
      ]);
      const allDocs = [...asBlocker.docs, ...asBlocked.docs];
      if (allDocs.length === 0) return 0;
      let batch = db.batch();
      for (const doc of allDocs) batch.delete(doc.ref);
      await batch.commit();
      return allDocs.length;
    });

    // Apavarga appointments
    await tryDelete('apavargaAppointments', async () => {
      return deleteBatch(
        db,
        db.collection('apavargaAppointments').where('seekerUid', '==', uid),
      );
    });

    // Finally delete Firebase Auth user (do this last)
    let authDeleted = false;
    try {
      await admin.auth().deleteUser(uid);
      authDeleted = true;
    } catch (e) {
      errors.push({ collection: 'firebase_auth', error: e.message });
      logger.error('[GDPR delete] Auth user delete failed', { uid, error: e.message });
    }

    logger.audit('user_account_deleted', {
      uid,
      deletedCollections: Object.keys(deleted),
      authDeleted,
      partialErrors: errors.length,
    });

    return jsonResponse({
      ok: true,
      authDeleted,
      deletedCollections: deleted,
      ...(errors.length > 0 ? { partialErrors: errors } : {}),
    });
  } catch (e) {
    logger.error('user/delete-account', { error: e?.message });
    return jsonResponse({ error: e?.message || 'Failed to delete account' }, 500);
  }
}
