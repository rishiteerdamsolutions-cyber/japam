import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { useGameStore } from '../store/gameStore';
import { buildAnniversaryResumeBoardFromSessionDoc } from './anniversaryBoardResume';

function stripUndefinedFields(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export async function pauseAnniversarySession(
  db: Firestore,
  sessionId: string,
  uid: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ref = doc(db, 'anniversarySessions', sessionId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('NOT_FOUND');
      const cur = snap.data() as Record<string, unknown>;
      const v = typeof cur.version === 'number' ? cur.version : 0;
      const gs = useGameStore.getState();
      if (gs.occasionKind !== 'anniversary' || gs.anniversarySessionId !== sessionId) {
        throw new Error('STATE');
      }
      const localV = gs.anniversaryFirestoreVersion;
      if (v !== localV) throw new Error('VERSION_MISMATCH');
      const payload = gs.serializeAnniversaryFirestorePayload();
      if (!payload) throw new Error('NO_BOARD');
      const { version: _omit, ...rest } = payload as Record<string, unknown>;
      const nextV = v + 1;
      transaction.update(
        ref,
        stripUndefinedFields({
          ...rest,
          sessionPaused: true,
          pausedByUid: uid,
          version: nextV,
          updatedAt: serverTimestamp(),
        }) as Record<string, unknown>,
      );
      useGameStore.setState({
        anniversaryFirestoreVersion: nextV,
        anniversarySessionPaused: true,
      });
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'VERSION_MISMATCH') {
      return { ok: false, error: 'Could not pause — syncing with partner. Try again in a moment.' };
    }
    if (msg === 'NO_BOARD' || msg === 'STATE') {
      return { ok: false, error: 'Could not pause this session.' };
    }
    console.error('pauseAnniversarySession', e);
    return { ok: false, error: 'Pause failed. Check connection and try again.' };
  }
}

export async function resumeAnniversarySession(
  db: Firestore,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ref = doc(db, 'anniversarySessions', sessionId);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('NOT_FOUND');
      const cur = snap.data() as Record<string, unknown>;
      if (cur.sessionPaused !== true) throw new Error('NOT_PAUSED');
      const v = typeof cur.version === 'number' ? cur.version : 0;
      const board = buildAnniversaryResumeBoardFromSessionDoc(cur);
      const boardJson = JSON.stringify(board);
      const nextV = v + 1;
      transaction.update(
        ref,
        stripUndefinedFields({
          boardJson,
          sessionPaused: false,
          pausedByUid: null,
          version: nextV,
          updatedAt: serverTimestamp(),
        }) as Record<string, unknown>,
      );
      useGameStore.setState({ anniversaryFirestoreVersion: nextV, anniversarySessionPaused: false });
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'NOT_PAUSED') {
      return { ok: false, error: 'Session is not paused.' };
    }
    console.error('resumeAnniversarySession', e);
    return { ok: false, error: 'Resume failed. Check connection and try again.' };
  }
}
