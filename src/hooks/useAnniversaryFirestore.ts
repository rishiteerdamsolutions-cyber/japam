import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { firestore, isFirebaseConfigured } from '../lib/firebase';
import { useGameStore } from '../store/gameStore';

function stripUndefinedFields(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Real-time sync for wedding anniversary couple play (Firestore document `anniversarySessions/{sessionId}`). */
export function useAnniversaryFirestore(
  enabled: boolean,
  sessionId: string | null,
  uid: string | null,
  isHost: boolean,
  myRole: 'husband' | 'wife',
): { partnerJoined: boolean; error: string | null; syncReady: boolean } {
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncReady, setSyncReady] = useState(isHost);
  const lastRemoteBoardJson = useRef<string>('');
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId || !uid || !isFirebaseConfigured || !firestore) {
      return;
    }
    setSyncReady(isHost);
    const ref = doc(firestore, 'anniversarySessions', sessionId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data() as Record<string, unknown>;
        const guestUid = typeof d.guestUid === 'string' ? d.guestUid : null;
        setPartnerJoined(!!guestUid);
        const bj = typeof d.boardJson === 'string' ? d.boardJson : '';
        if (bj.length > 2) lastRemoteBoardJson.current = bj;

        const remoteVersion = typeof d.version === 'number' ? d.version : 0;
        const localVersion = useGameStore.getState().anniversaryFirestoreVersion;
        if (remoteVersion >= 1) setSyncReady(true);
        if (bj.length > 2 && remoteVersion > localVersion) {
          useGameStore.getState().hydrateAnniversaryFromFirestore({
            boardJson: bj,
            gameMode: d.gameMode,
            levelIndex: d.levelIndex,
            moves: d.moves,
            score: d.score,
            japasThisLevel: d.japasThisLevel,
            japasByDeity: d.japasByDeity,
            generalBoardDeities: d.generalBoardDeities,
            maxGemTypes: d.maxGemTypes,
            turn: d.turn,
            japasHusband: d.japasHusband,
            japasWife: d.japasWife,
            version: remoteVersion,
            anniversarySessionId: sessionId,
            anniversaryMyRole: myRole,
            anniversaryIsHost: isHost,
          });
        }
      },
      (err) => {
        console.error('anniversary snapshot', err);
        const code = (err as { code?: string }).code;
        const msg = err.message || 'Sync error';
        if (code === 'permission-denied' || /permission/i.test(msg)) {
          setError(
            'Partner sync: open the invite link and sign in first, then try again. If this persists, the host may need to redeploy Firestore rules.',
          );
        } else {
          setError(msg);
        }
      },
    );
    return () => unsub();
  }, [enabled, sessionId, uid, isHost, myRole]);

  useEffect(() => {
    if (!enabled || !sessionId || !uid || !isFirebaseConfigured || !firestore) {
      return;
    }
    const ref = doc(firestore, 'anniversarySessions', sessionId);
    const schedulePush = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        const gs = useGameStore.getState();
        if (gs.occasionKind !== 'anniversary' || gs.status !== 'playing') return;
        // Partner must not push a locally seeded board before the first Firestore snapshot (version ≥ 1).
        if (!gs.anniversaryIsHost && gs.anniversaryFirestoreVersion < 1) return;
        const payload = gs.serializeAnniversaryFirestorePayload();
        if (!payload) return;
        if (payload.boardJson === lastRemoteBoardJson.current) return;
        try {
          const db = firestore;
          if (!db) return;
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) return;
            const cur = snap.data() as Record<string, unknown>;
            const v = typeof cur.version === 'number' ? cur.version : 0;
            const localV = useGameStore.getState().anniversaryFirestoreVersion;
            if (v !== localV) return;
            const nextV = v + 1;
            const { version: _omit, updatedAt: _u, ...rest } = payload as Record<string, unknown>;
            const updatePayload = stripUndefinedFields({
              ...rest,
              version: nextV,
              updatedAt: serverTimestamp(),
            }) as Record<string, unknown>;
            transaction.update(ref, updatePayload);
            useGameStore.setState({ anniversaryFirestoreVersion: nextV });
            lastRemoteBoardJson.current = String(payload.boardJson);
          });
        } catch (e) {
          console.error('anniversary push', e);
          const err = e as { code?: string; message?: string };
          if (err.code === 'permission-denied' || /permission|insufficient/i.test(String(err.message))) {
            setError(
              'Could not save the shared board (permission denied). Ask your partner to open the invite link once, then try again.',
            );
          }
        }
      }, 280);
    };

    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.occasionKind !== 'anniversary') return;
      if (state.status !== 'playing') return;
      const boardChanged = state.board !== prev.board;
      const turnChanged = state.anniversaryTurn !== prev.anniversaryTurn;
      const jh = state.anniversaryJapasHusband !== prev.anniversaryJapasHusband;
      const jw = state.anniversaryJapasWife !== prev.anniversaryJapasWife;
      if (boardChanged || turnChanged || jh || jw) schedulePush();
    });
    return () => {
      unsub();
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [enabled, sessionId, uid]);

  return { partnerJoined, error, syncReady };
}
