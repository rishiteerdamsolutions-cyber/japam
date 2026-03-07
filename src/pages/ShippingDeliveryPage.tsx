import { useNavigate } from 'react-router-dom';
import { AppFooter } from '../components/layout/AppFooter';

export function ShippingDeliveryPage() {
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

        <h1 className="text-3xl font-bold text-amber-400 mb-2">Shipping and Delivery Policy</h1>
        <p className="text-amber-200/60 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-amber-100/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">1. Digital Service Only</h2>
            <p className="text-sm">
              <strong className="text-white">Japam</strong> is a digital mantra practice platform. We do not sell or deliver any physical goods. All products and services are digital and delivered electronically.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">2. Instant Delivery</h2>
            <p className="text-sm">
              Upon successful payment (Pro unlock, Dakshina, or donation), your access is activated immediately. There is no shipping delay. You can use the unlocked features as soon as the payment is confirmed (usually within seconds).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">3. Access Method</h2>
            <p className="text-sm">
              Access is tied to your account (Google sign-in). Once payment is verified, the Pro status is applied to your account. You may need to refresh the app or sign out and sign back in if access does not appear immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">4. No Physical Address Required</h2>
            <p className="text-sm">
              Since we deliver only digital services, no shipping address is required for purchases. Billing or contact details may be collected by our payment provider (Cashfree) for transaction purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">5. Contact Us</h2>
            <p className="text-sm">
              If you experience any delay in access or have questions:
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
