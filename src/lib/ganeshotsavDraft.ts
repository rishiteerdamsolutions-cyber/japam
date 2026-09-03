import type { SatsangJoinResult } from './satsangApi';

export type GaneshotsavDraftStep = 'gate' | 'mala' | 'pdf' | 'share';

export type GaneshotsavDraft = {
  /** v2: drafts are always bound to a signed-in uid; unsigned drafts are ignored. */
  v: 2;
  uid: string;
  step: GaneshotsavDraftStep;
  code: string;
  session: SatsangJoinResult | null;
  count: number;
  name: string;
  gotram: string;
  mobileNumber: string;
  handwritingDataUrl: string | null;
  /** Server save at 108 succeeded (completeSatsang). */
  completed108Saved?: boolean;
  pdfDownloaded?: boolean;
  shareImageDownloaded?: boolean;
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
    const parsed = JSON.parse(raw) as Partial<GaneshotsavDraft> & { v?: number; uid?: string | null };
    // Drop v1 drafts — they were restored while signed out and leaked across Gmail accounts.
    if (parsed?.v !== 2) {
      store.removeItem(DRAFT_KEY);
      return null;
    }
    if (!parsed.uid || typeof parsed.uid !== 'string') {
      store.removeItem(DRAFT_KEY);
      return null;
    }
    if (!parsed.step || typeof parsed.count !== 'number') {
      store.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed as GaneshotsavDraft;
  } catch {
    return null;
  }
}

export function writeGaneshotsavDraft(draft: GaneshotsavDraft) {
  const store = storage();
  if (!store) return;
  if (!draft.uid) return;
  const payload = { ...draft, v: 2 as const, updatedAt: Date.now() };
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

/** True when a saved draft still belongs to today's sitting (IST ymd / trial_ymd). */
export function draftMatchesSitting(
  draft: GaneshotsavDraft,
  session: Pick<SatsangJoinResult, 'eventId' | 'sittingYmd' | 'isTrial'> | null | undefined,
): boolean {
  if (!draft.session || !session) return false;
  if (draft.session.eventId !== session.eventId) return false;
  if (draft.session.sittingYmd !== session.sittingYmd) return false;
  if (draft.session.isTrial !== session.isTrial) return false;
  return true;
}

/** Draft belongs only to the currently signed-in Firebase uid. Never match while signed out. */
export function draftMatchesUid(draft: GaneshotsavDraft, uid: string | null | undefined): boolean {
  if (!uid) return false;
  return draft.uid === uid;
}

/** True while a devotee is mid-flow — defer PWA update prompts until PDF + share image are done. */
export function hasActiveGaneshotsavDraft(): boolean {
  const draft = readGaneshotsavDraft();
  if (!draft?.session) return false;
  if (draft.pdfDownloaded && draft.shareImageDownloaded) return false;
  return true;
}
