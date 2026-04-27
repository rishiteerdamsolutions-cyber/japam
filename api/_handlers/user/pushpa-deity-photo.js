/**
 * POST   /api/user/pushpa-deity-photo — multipart field `photo` (Pro / Premium active users only).
 * DELETE /api/user/pushpa-deity-photo — remove uploaded custom deity image.
 *
 * Requires Firebase Storage (default bucket). UI may stay “coming soon” until storage is configured.
 */
import admin from 'firebase-admin';
import { getDb, verifyFirebaseUser, jsonResponse, jsonInternalServerError, isUserUnlocked } from '../_lib.js';
import { touchUserLogin } from '../_analytics.js';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function gsPathForUid(uid) {
  return `users/${uid}/pushpa_custom_deity.jpg`;
}

async function bucketOrNull() {
  try {
    return admin.storage().bucket();
  } catch {
    return null;
  }
}

async function signedReadUrl(bucket, path) {
  const [url] = await bucket.file(path).getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
  return url;
}

/** @param {{ method: string }} request */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const unlocked = await isUserUnlocked(db, uid);
    if (!unlocked) return jsonResponse({ error: 'Pro membership required to upload a custom deity photo.' }, 403);

    await touchUserLogin(db, uid);

    const ct = request.headers?.get?.('content-type') || '';
    if (!ct.toLowerCase().includes('multipart/form-data')) {
      return jsonResponse({ error: 'Expected multipart/form-data with field "photo"' }, 400);
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse({ error: 'Could not parse form data' }, 400);
    }

    const photo = formData.get('photo');
    if (!photo || typeof photo.arrayBuffer !== 'function') {
      return jsonResponse({ error: 'Missing file field "photo"' }, 400);
    }

    const mime = typeof photo.type === 'string' ? photo.type.toLowerCase() : '';
    if (!ALLOWED_TYPES.has(mime)) return jsonResponse({ error: 'Use JPEG, PNG, or WebP.' }, 400);

    const buf = Buffer.from(await photo.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) return jsonResponse({ error: 'Image too large (max 2 MB).' }, 413);

    const bucket = await bucketOrNull();
    if (!bucket) return jsonResponse({ error: 'Storage not configured on server.' }, 503);

    const dest = gsPathForUid(uid);
    await bucket.file(dest).save(buf, {
      metadata: {
        contentType: mime,
        cacheControl: 'public, max-age=604800',
      },
      resumable: false,
    });

    await db.doc(`users/${uid}/data/profile`).set(
      {
        pushpaCustomDeityPhotoGsPath: dest,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    let photoUrl = null;
    try {
      photoUrl = await signedReadUrl(bucket, dest);
    } catch (e) {
      console.warn('pushpa-deity-photo: signed URL failed', e?.message || e);
    }

    return jsonResponse({ ok: true, pushpaCustomDeityPhotoUrl: photoUrl, pushpaCustomDeityPhotoGsPath: dest }, 200);
  } catch (e) {
    console.error('pushpa-deity-photo POST', e);
    return jsonInternalServerError(e, 'api/_handlers/user/pushpa-deity-photo.js');
  }
}

export async function DELETE(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    await touchUserLogin(db, uid);

    const bucket = await bucketOrNull();
    const snap = await db.doc(`users/${uid}/data/profile`).get();
    const gsPath =
      typeof snap.data()?.pushpaCustomDeityPhotoGsPath === 'string'
        ? snap.data().pushpaCustomDeityPhotoGsPath
        : gsPathForUid(uid);

    if (bucket) {
      try {
        await bucket.file(gsPath).delete({ ignoreNotFound: true });
      } catch (e) {
        console.warn('pushpa-deity-photo DELETE gcs', e?.message || e);
      }
    }

    await db.doc(`users/${uid}/data/profile`).set(
      {
        pushpaCustomDeityPhotoGsPath: admin.firestore.FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('pushpa-deity-photo DELETE', e);
    return jsonInternalServerError(e, 'api/_handlers/user/pushpa-deity-photo.js');
  }
}
