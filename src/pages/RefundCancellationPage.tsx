import { useNavigate } from 'react-router-dom';
import { AppFooter } from '../components/layout/AppFooter';

export function RefundCancellationPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-amber-400 hover:text-amber-300 transition-colors text-sm flex items-center gap-1"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold text-amber-400 mb-2">Refund and Cancellation Policy</h1>
        <p className="text-amber-200/60 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-amber-100/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">1. Digital Products</h2>
            <p className="text-sm">
              Japam is a digital mantra practice platform. All purchases (Pro unlock, Dakshina, donations) are for digital access only. There is no physical delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">2. Refund Policy</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Pro Unlock / Dakshina:</strong> All purchases are generally final. Refunds may be considered on a case-by-case basis if you contact us within 7 days of purchase with a valid reason (e.g., duplicate charge, technical failure preventing access).</li>
              <li><strong>Donations:</strong> Donations are voluntary and non-refundable.</li>
              <li>To request a refund, contact us at the details below. We will review your request and respond within 5–7 business days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">3. Cancellation</h2>
            <p className="text-sm">
              There are no recurring subscriptions for the Pro unlock — it is a one-time payment. You may cancel or disable your account at any time through the app settings or by contacting us. Account cancellation does not entitle you to a refund for past purchases.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">4. Disputes</h2>
            <p className="text-sm">
              Payment disputes should be raised first with us. If unresolved, you may contact your payment provider (e.g., Cashfree, your bank) according to their dispute procedures.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">5. Contact Us</h2>
            <p className="text-sm">
              For refund requests or questions about this policy:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-white/5 border border-amber-500/20 text-sm space-y-1">
              <p><strong className="text-amber-200">AI Developer India</strong></p>
              <p><strong className="text-amber-200">Phone:</strong> +91 9505009699</p>
              <p><strong className="text-amber-200">Email:</strong>{' '}
                <a href="mailto:aideveloperindia@gmail.com" className="text-amber-400 underline">aideveloperindia@gmail.com</a>
              </p>
              <p><strong className="text-amber-200">Address:</strong> 9-6-192, RD.NO.4, Ramnagar, Karimnagar, Telangana 505001</p>
              <p><strong className="text-amber-200">Website:</strong>{' '}
                <a href="https://japam.digital" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">japam.digital</a>
              </p>
            </div>
          </section>
        </div>

        <AppFooter />
      </div>
    </div>
  );
}
