/** Razorpay KEY_ID only (secret stays on server). */
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID ?? 'rzp_test_SIglcNEf6QAT2M';

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      currency: string;
      order_id: string;
      name: string;
      description?: string;
      handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
    }) => { open: () => void };
  }
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (document.getElementById('razorpay-script')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script failed to load'));
    document.head.appendChild(s);
  });
}
