declare module '@cashfreepayments/cashfree-js' {
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<{
    checkout: (opts: {
      paymentSessionId: string;
      redirectTarget?: '_self' | '_blank' | '_modal' | '_top';
    }) => Promise<{
      error?: unknown;
      paymentDetails?: { paymentMessage?: string };
      redirect?: boolean;
    }>;
  } | null>;
}
