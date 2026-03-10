import { useNavigate } from 'react-router-dom';
import { AppFooter } from '../components/layout/AppFooter';

export function ContactPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-cover bg-center text-white" style={{ backgroundImage: 'url(/images/contactpagebg.png)' }}>
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-amber-400 hover:text-amber-300 transition-colors text-sm flex items-center gap-1"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold text-amber-400 mb-2">Public Contact Details</h1>
        <p className="text-amber-200/60 text-sm mb-8">
          Contact us for support, feedback, or any queries regarding <strong className="text-white">Japam</strong>.
        </p>

        <div className="space-y-6 text-amber-100/80">
          <section className="p-5 rounded-xl bg-white/5 border border-amber-500/20">
            <h2 className="text-lg font-semibold text-amber-300 mb-4">AI Developer India</h2>
            <div className="space-y-3 text-sm">
              <p>
                <strong className="text-amber-200">Phone:</strong>{' '}
                <a href="tel:+919505009699" className="text-amber-400 underline">+91 9505009699</a>
              </p>
              <p>
                <strong className="text-amber-200">WhatsApp:</strong>{' '}
                <a href="https://wa.me/919505009699" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">+91 9505009699</a>
              </p>
              <p>
                <strong className="text-amber-200">Email:</strong>{' '}
                <a href="mailto:aideveloperindia@gmail.com" className="text-amber-400 underline">aideveloperindia@gmail.com</a>
              </p>
              <p>
                <strong className="text-amber-200">Address:</strong><br />
                9-6-192, RD.NO.4, Ramnagar, Karimnagar, Telangana 505001
              </p>
              <p>
                <strong className="text-amber-200">Website:</strong>{' '}
                <a href="https://japam.digital" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">japam.digital</a>
              </p>
              <p>
                <strong className="text-amber-200">Developer:</strong> Aditya Nandagiri
              </p>
            </div>
          </section>

          <p className="text-sm text-amber-200/70">
            For support, refund requests, or policy questions, please use the contact details above. We aim to respond within 2–3 business days.
          </p>
        </div>

        <AppFooter />
      </div>
    </div>
  );
}
