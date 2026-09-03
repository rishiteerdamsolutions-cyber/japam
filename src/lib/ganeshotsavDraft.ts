import type { SatsangJoinResult } from './satsangApi';

export type GaneshotsavDraftStep = 'gate' | 'mala' | 'pdf' | 'share';

export type GaneshotsavDraft = {
  v: 1;
  uid: string | null;
  step: GaneshotsavDraftStep;
  code: string;
  session: SatsangJoinResult | null;
  count: number;
  name: string;
  gotram: string;
  mobileNumber: string;
  handwritingDataUrl: string | null;
  updatedAt: number;
};

const DRAFT_KEY = 'japam_ganeshotsav_draft';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readGaneshotsavDraft(): GaneshotsavDraft | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GaneshotsavDraft;
    if (parsed?.v !== 1) return null;
    if (!parsed.step || typeof parsed.count !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGaneshotsavDraft(draft: GaneshotsavDraft) {
  const store = storage();
  if (!store) return;
  const payload = { ...draft, updatedAt: Date.now() };
  try {
    store.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    try {
      store.setItem(DRAFT_KEY, JSON.stringify({ ...payload, handwritingDataUrl: null }));
    } catch {
      /* Quota or private mode */
    }
  }
}

export function clearGaneshotsavDraft() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function draftMatchesUid(draft: GaneshotsavDraft, uid: string | null | undefined): boolean {
  if (!draft.uid) return true;
  if (!uid) return true;
  return draft.uid === uid;
}
