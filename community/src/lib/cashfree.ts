/** Cashfree Checkout - loads SDK and opens checkout. */

let cashfreePromise: Promise<unknown> | null = null;

export async function loadCashfree(mode: 'sandbox' | 'production' = 'production') {
  if (cashfreePromise) return cashfreePromise;
  cashfreePromise = (async () => {
    try {
      const { load } = await import('@cashfreepayments/cashfree-js');
      return await load({ mode });
    } catch (e) {
      console.error('Cashfree load failed:', e);
      return null;
    }
  })();
  return cashfreePromise;
}

export async function openCashfreeCheckout(paymentSessionId: string, options?: { redirectTarget?: '_self' | '_blank' | '_modal' | '_top' }) {
  const cf = await loadCashfree('production') as { checkout?: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown> } | null;
  if (!cf?.checkout) throw new Error('Cashfree failed to load');
  return cf.checkout({
    paymentSessionId,
    redirectTarget: options?.redirectTarget ?? '_self',
  });
}
