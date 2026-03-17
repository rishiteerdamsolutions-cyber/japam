declare module '@cashfreepayments/cashfree-js' {
  export function load(opts: { mode: 'sandbox' | 'production' }): Promise<{
    checkout?: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown>;
  }>;
}
