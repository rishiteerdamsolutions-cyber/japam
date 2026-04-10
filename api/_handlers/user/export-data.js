/**
 * GET /api/user/export — GDPR Right of Access / Data Portability
 *
 * Collects all data belonging to the authenticated user across all
 * Firestore collections and returns it as a downloadable JSON file.
 *
 * Requires: Firebase ID token (Bearer header)
 * Returns:  application/json download with Content-Disposition: attachment
 */

import { getDb, verifyFirebaseUser, jsonResponse, jsonInternalServerError } from '../_lib.js';
import admin from 'firebase-admin';
import logger from '../_log.js';

export async function GET(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: uid,
      data: {},
    };

    // Helper: fetch a collection or subcollection
    async function fetchCollection(label, queryOrRef) {
      try {
        const snap = await queryOrRef.get();
        if (snap.empty) return;
        exportData.data[label] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) {
        exportData.data[`${label}_error`] = 'Temporarily unavailable';
      }
    }

    async function fetchDoc(label, ref) {
      try {
        const snap = await ref.get();
        if (snap.exists) exportData.data[label] = { id: snap.id, ...snap.data() };
      } catch (e) {
        exportData.data[`${label}_error`] = 'Temporarily unavailable';
      }
    }

    // Firebase Auth profile
    try {
      const user = await admin.auth().getUser(uid);
      exportData.data.authProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      };
    } catch (e) {
      exportData.data.authProfile_error = 'Temporarily unavailable';
    }

    // Firestore data
    await fetchCollection('userDataSubcollection', db.collection(`users/${uid}/data`));
    await fetchDoc('publicProfile', db.doc(`publicUsers/${uid}`));
    await fetchDoc('unlockedStatus', db.doc(`unlockedUsers/${uid}`));
    await fetchDoc('donorRecord', db.doc(`donors/${uid}`));
    await fetchCollection(
      'marathonParticipations',
      db.collection('marathonParticipations').where('userId', '==', uid),
    );
    await fetchCollection(
      'apavargaMessages',
      db.collection('apavargaMessages').where('senderUid', '==', uid).limit(500),
    );
    await fetchCollection(
      'apavargaStatuses',
      db.collection('apavargaStatus').where('uid', '==', uid).limit(200),
    );
    await fetchCollection(
      'apavargaAppointments',
      db.collection('apavargaAppointments').where('seekerUid', '==', uid).limit(100),
    );

    logger.audit('user_data_exported', { uid });

    const json = JSON.stringify(exportData, null, 2);
    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="japam-data-export-${uid.slice(0, 8)}-${Date.now()}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    logger.error('user/export-data', { error: e?.message });
    return jsonInternalServerError(e, 'api/_handlers/user/export-data.js');
  }
}
