declare module '@cashfreepayments/cashfree-js' {
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<{
    checkout: (opts: {
      paymentSessionId: string;
      redirectTarget?: '_self' | '_blank' | '_modal' | '_top';
    }) => Promise<{
      error?: unknown;
      paymentDetails?: { paymentMessage?: string };
      /** True when Cashfree sends the user to return_url; client may not get paymentDetails. */
      redirect?: boolean;
    }>;
  } | null>;
}
