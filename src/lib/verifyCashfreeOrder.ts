import { getApiBase } from './apiBase';

type VerifyKind = 'unlock' | 'donate';

async function readVerifyError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    const data = JSON.parse(text) as { error?: string };
    return typeof data?.error === 'string' && data.error ? data.error : text || 'Verification failed';
  } catch {
    return 'Verification failed';
  }
}

/**
 * After Cashfree JS checkout, some instruments (e.g. Google Pay / UPI) resolve without
 * `paymentDetails` even when payment succeeded. Always call the verify API; retry while
 * Cashfree still reports non-PAID (race with redirect / webhook).
 */
export async function verifyCashfreeOrderAfterCheckout(options: {
  orderId: string;
  getIdToken: () => Promise<string | null>;
  kind: VerifyKind;
  /** For donate verify only */
  displayName?: string;
  maxWaitMs?: number;
  intervalMs?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    orderId,
    getIdToken,
    kind,
    displayName,
    maxWaitMs = 45000,
    intervalMs = 1200,
  } = options;

  const base = getApiBase();
  const path = kind === 'unlock' ? '/api/verify-unlock' : '/api/verify-donate';
  const verifyUrl = base ? `${base}${path}` : path;

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const idToken = await getIdToken().catch(() => null);
    if (!idToken) {
      return { ok: false, error: 'Please sign in again' };
    }

    const body: Record<string, unknown> = { order_id: orderId };
    if (kind === 'donate') {
      body.displayName = displayName ?? '';
    }

    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return { ok: true };
    }

    const msg = await readVerifyError(res);
    const pending =
      res.status === 400 &&
      (msg.toLowerCase().includes('payment not completed') ||
        msg.toLowerCase().includes('not completed'));

    if (pending) {
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }

    return { ok: false, error: msg };
  }

  return {
    ok: false,
    error:
      'Payment is still confirming. If you were charged, wait a minute and reopen the app — your unlock should appear automatically.',
  };
}
