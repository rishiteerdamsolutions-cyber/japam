import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { firestore, isFirebaseConfigured } from '../lib/firebase';
import { useGameStore } from '../store/gameStore';
import { findMatches } from '../engine/matcher';

function stripUndefinedFields(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function shouldDeferAnniversaryHydrate(): boolean {
  const gs = useGameStore.getState();
  return gs.matchAnimationTimeoutId != null || gs.anniversaryMovePending;
}

function boardStableForSync(): boolean {
  const gs = useGameStore.getState();
  if (gs.matchAnimationTimeoutId != null) return false;
  if (gs.pendingMatchBatch != null) return false;
  if (gs.matchHighlightPositions != null) return false;
  if (gs.anniversaryMovePending) return false;
  // If host pushes a board mid-cascade, guests can get stuck with an uncleared line-match.
  // Only sync once the board is in a settled, no-matches state.
  try {
    return findMatches(gs.board).length === 0;
  } catch {
    return false;
  }
}

/** Prefer Firestore host/guest roles so URL mistakes cannot make both players "husband". */
function resolveAnniversaryMyRole(
  d: Record<string, unknown>,
  uid: string,
  urlFallback: 'husband' | 'wife',
): 'husband' | 'wife' {
  const hostUid = typeof d.hostUid === 'string' ? d.hostUid : '';
  const guestUid = typeof d.guestUid === 'string' ? d.guestUid : '';
  if (uid && hostUid && uid === hostUid) {
    return d.hostRole === 'wife' ? 'wife' : 'husband';
  }
  if (uid && guestUid && uid === guestUid) {
    return d.guestRole === 'wife' ? 'wife' : 'husband';
  }
  return urlFallback;
}

/** Every snapshot: keep turn, japa counts, version, pause, and role aligned with server (fixes “both see partner’s turn”). */
function reconcileAnniversaryAuthoritativeFields(
  d: Record<string, unknown>,
  sessionId: string,
  uid: string,
  urlFallbackRole: 'husband' | 'wife',
): void {
  const gs = useGameStore.getState();
  if (gs.occasionKind !== 'anniversary' || gs.anniversarySessionId !== sessionId) return;

  const hostUid = typeof d.hostUid === 'string' ? d.hostUid : '';
  const myRole = resolveAnniversaryMyRole(d, uid, urlFallbackRole);
  const isHostResolved = Boolean(uid && hostUid && uid === hostUid);
  const turn = d.turn === 'wife' ? 'wife' : 'husband';
  const jh = typeof d.japasHusband === 'number' ? d.japasHusband : 0;
  const jw = typeof d.japasWife === 'number' ? d.japasWife : 0;
  const v = typeof d.version === 'number' ? d.version : 0;

  useGameStore.setState({
    anniversaryMyRole: myRole,
    anniversaryIsHost: isHostResolved,
    anniversaryTurn: turn,
    anniversaryJapasHusband: jh,
    anniversaryJapasWife: jw,
    anniversaryFirestoreVersion: v,
    anniversarySessionPaused: d.sessionPaused === true,
  });
}

function buildHydratePayload(
  d: Record<string, unknown>,
  sessionId: string,
  uid: string,
  urlFallbackRole: 'husband' | 'wife',
): Record<string, unknown> {
  const remoteVersion = typeof d.version === 'number' ? d.version : 0;
  const hostUid = typeof d.hostUid === 'string' ? d.hostUid : '';
  const myRole = resolveAnniversaryMyRole(d, uid, urlFallbackRole);
  const isHostResolved = Boolean(uid && hostUid && uid === hostUid);
  return {
    boardJson: d.boardJson,
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
    anniversaryIsHost: isHostResolved,
    sessionPaused: d.sessionPaused === true,
  };
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
  const lastAppliedBoardJson = useRef<string>('');
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedHydrateRef = useRef<Record<string, unknown> | null>(null);
  const flushFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryFlushQueuedHydrate = () => {
    const q = queuedHydrateRef.current;
    if (!q) return;
    if (shouldDeferAnniversaryHydrate()) return;
    queuedHydrateRef.current = null;
    if (flushFallbackTimerRef.current) {
      clearTimeout(flushFallbackTimerRef.current);
      flushFallbackTimerRef.current = null;
    }
    const bj = typeof q.boardJson === 'string' ? q.boardJson : '';
    if (bj.length > 2) {
      lastRemoteBoardJson.current = bj;
      lastAppliedBoardJson.current = bj;
    }
    useGameStore.getState().hydrateAnniversaryFromFirestore(q);
  };

  useEffect(() => {
    if (!enabled || !sessionId || !uid || !isFirebaseConfigured || !firestore) {
      return;
    }
    const unsub = useGameStore.subscribe(() => {
      tryFlushQueuedHydrate();
    });
    return () => unsub();
  }, [enabled, sessionId, uid]);

  useEffect(() => {
    if (!enabled || !sessionId || !uid || !isFirebaseConfigured || !firestore) {
      return;
    }
    setSyncReady(isHost);
    lastAppliedBoardJson.current = '';
    const ref = doc(firestore, 'anniversarySessions', sessionId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data() as Record<string, unknown>;
        const guestUid = typeof d.guestUid === 'string' ? d.guestUid : null;
        setPartnerJoined(!!guestUid);
        const bj = typeof d.boardJson === 'string' ? d.boardJson : '';

        const remoteVersion = typeof d.version === 'number' ? d.version : 0;
        if (remoteVersion >= 1) setSyncReady(true);

        reconcileAnniversaryAuthoritativeFields(d, sessionId, uid, myRole);

        if (bj.length > 2) {
          lastRemoteBoardJson.current = bj;
        }

        const payload = buildHydratePayload(d, sessionId, uid, myRole);

        if (bj.length <= 2 && d.sessionPaused !== true) {
          return;
        }

        if (bj.length <= 2) {
          return;
        }

        const boardChangedOnServer = bj !== lastAppliedBoardJson.current;
        if (!boardChangedOnServer) {
          return;
        }

        if (shouldDeferAnniversaryHydrate()) {
          queuedHydrateRef.current = payload;
          if (!flushFallbackTimerRef.current) {
            flushFallbackTimerRef.current = window.setTimeout(() => {
              flushFallbackTimerRef.current = null;
              const gs = useGameStore.getState();
              if (gs.matchAnimationTimeoutId != null) {
                clearTimeout(gs.matchAnimationTimeoutId);
                useGameStore.setState({
                  matchAnimationTimeoutId: null,
                  matchHighlightPositions: null,
                  pendingMatchBatch: null,
                });
              }
              if (useGameStore.getState().anniversaryMovePending) {
                useGameStore.setState({ anniversaryMovePending: false });
              }
              tryFlushQueuedHydrate();
            }, 3200);
          }
          return;
        }

        queuedHydrateRef.current = null;
        if (flushFallbackTimerRef.current) {
          clearTimeout(flushFallbackTimerRef.current);
          flushFallbackTimerRef.current = null;
        }
        lastAppliedBoardJson.current = bj;
        useGameStore.getState().hydrateAnniversaryFromFirestore(payload);
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
    return () => {
      unsub();
      queuedHydrateRef.current = null;
      lastAppliedBoardJson.current = '';
      if (flushFallbackTimerRef.current) {
        clearTimeout(flushFallbackTimerRef.current);
        flushFallbackTimerRef.current = null;
      }
    };
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
        if (gs.anniversarySessionPaused) return;
        if (queuedHydrateRef.current) return;
        if (!boardStableForSync()) return;
        if (!gs.anniversaryIsHost && gs.anniversaryFirestoreVersion < 1) return;
        const payload = gs.serializeAnniversaryFirestorePayload();
        if (!payload) return;
        if (payload.boardJson === lastRemoteBoardJson.current) return;
        let versionMismatchAfterPush = false;
        try {
          const db = firestore;
          if (!db) return;
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) return;
            const cur = snap.data() as Record<string, unknown>;
            const v = typeof cur.version === 'number' ? cur.version : 0;
            const localV = useGameStore.getState().anniversaryFirestoreVersion;
            if (v !== localV) {
              versionMismatchAfterPush = true;
              return;
            }
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
          return;
        }
        if (versionMismatchAfterPush) {
          setError('Syncing with partner… your last change may apply after a moment.');
          window.setTimeout(() => setError(null), 5000);
        }
      }, 280);
    };

    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.occasionKind !== 'anniversary') return;
      if (state.status !== 'playing') return;
      if (state.anniversarySessionPaused) return;
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
