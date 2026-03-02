import { useNavigate } from 'react-router-dom';

const A_LOGO_SRC = '/images/A-logo.png';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-amber-400 hover:text-amber-300 transition-colors text-sm flex items-center gap-1"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold text-amber-400 mb-2">Terms &amp; Conditions</h1>
        <p className="text-amber-200/60 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-amber-100/80 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using <strong className="text-white">Japam</strong> (available at <strong className="text-white">japam.digital</strong>), you agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, please do not use the Service.
            </p>
            <p className="mt-2">
              Japam is developed and operated by <strong className="text-white">AI Developer India</strong> (Aditya Nandagiri). These terms govern your use of the app, website, and all related services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">2. Description of Service</h2>
            <p className="text-sm">
              Japam is a spiritual japa (mantra chanting) game where users match gems on a puzzle board to complete japas for Hindu deities including Rama, Shiva, Ganesh, Surya, Shakthi, Krishna, Shanmukha, and Venkateswara. The Service includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>A gem-matching puzzle game tied to japa chanting</li>
              <li>Personal japa count tracking across deities</li>
              <li>Community Japa Marathons tied to real temples</li>
              <li>Leaderboards for marathon participants</li>
              <li>Daily reminder notifications for japa practice</li>
              <li>A Progressive Web App (PWA) installable on your device</li>
              <li>Apavarga — a forthcoming spiritual social network (coming soon)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>You may use the Service as a guest (limited access) or by signing in with your Google account.</li>
              <li>You are responsible for maintaining the security of your Google account.</li>
              <li>You must not use another person's account without permission.</li>
              <li>You must provide accurate information and keep it up to date.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">4. Pro Membership & Payments</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Certain features (all deity levels, joining Japa Marathons) require a one-time Pro unlock payment.</li>
              <li>Payments are processed through third-party payment providers. We do not store your payment card details.</li>
              <li>All purchases are final. Refunds may be considered on a case-by-case basis — contact us within 7 days of purchase.</li>
              <li>Pro access is tied to your account and is non-transferable.</li>
              <li>We reserve the right to change pricing at any time. Existing Pro members will not be charged again for features already unlocked.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">5. Japa Marathons</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Japa Marathons are community events tied to real temples. Joining a marathon is voluntary.</li>
              <li>Your display name and japa count will be visible to other marathon participants on the leaderboard.</li>
              <li>Marathon japa counts are calculated from japas completed within the game. Manual entry is not supported.</li>
              <li>We reserve the right to remove participants who abuse the system or use unfair means to inflate counts.</li>
              <li>Temples listed in the app are real places of worship. We are not officially affiliated with any temple unless explicitly stated.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">6. User Conduct</h2>
            <p className="text-sm">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
              <li>Attempt to hack, reverse-engineer, or tamper with the Service.</li>
              <li>Use automated tools, bots, or scripts to manipulate japa counts or leaderboards.</li>
              <li>Harass, abuse, or harm other users.</li>
              <li>Post or transmit offensive, defamatory, or inappropriate content.</li>
              <li>Impersonate any person or entity.</li>
              <li>Interfere with the proper functioning of the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">7. Intellectual Property</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>All content, design, graphics, logos (including the A-logo), game mechanics, and code are the intellectual property of <strong className="text-white">AI Developer India (Aditya Nandagiri)</strong>.</li>
              <li>The Japam name, logo, and branding are protected. You may not use them without written permission.</li>
              <li>Deity names and mantras are part of the public domain of Hindu tradition and are used with reverence.</li>
              <li>You may not copy, reproduce, distribute, or create derivative works from our content without prior written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">8. Spiritual Content Disclaimer</h2>
            <p className="text-sm">
              Japam is a gamified tool designed to encourage regular japa practice. It is not a replacement for formal religious instruction, guidance from a qualified guru, or traditional spiritual practice. The japa counts recorded in the app are for personal motivation and community engagement only — they do not constitute any religious certification or spiritual authority.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">9. Notifications</h2>
            <p className="text-sm">
              Daily reminder notifications are opt-in and generated locally on your device. By enabling notifications, you consent to receiving these reminders. You can disable them at any time through the app settings or your device settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">10. Disclaimers & Limitation of Liability</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>The Service is provided "as is" without warranties of any kind, express or implied.</li>
              <li>We do not guarantee uninterrupted, error-free, or secure access to the Service.</li>
              <li>We are not liable for any loss of data, including japa counts, due to technical failures.</li>
              <li>To the maximum extent permitted by law, our total liability to you for any claim arising from use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</li>
              <li>We are not responsible for third-party services (Google, Vercel, payment processors) used in delivering the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">11. Termination</h2>
            <p className="text-sm">
              We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, if you violate these Terms or for any other reason at our discretion. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">12. Changes to Terms</h2>
            <p className="text-sm">
              We may update these Terms at any time. We will notify you by updating the "Last updated" date. Continued use of the Service after changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">13. Governing Law</h2>
            <p className="text-sm">
              These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana, India.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">14. Contact Us</h2>
            <p className="text-sm">
              For any questions, concerns, or requests regarding these Terms, please contact us:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-white/5 border border-amber-500/20 text-sm space-y-1">
              <p><strong className="text-amber-200">Developer:</strong> Aditya Nandagiri — AI Developer India</p>
              <p><strong className="text-amber-200">Website:</strong>{' '}
                <a href="https://aideveloperindia.store" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">aideveloperindia.store</a>
              </p>
              <p><strong className="text-amber-200">WhatsApp:</strong> +91 9505009699</p>
              <p><strong className="text-amber-200">App:</strong> japam.digital</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col items-center gap-3 text-white/40 text-xs">
          <div className="flex items-center gap-2">
            <span>Built by</span>
            <a href="https://aideveloperindia.store" target="_blank" rel="noopener noreferrer">
              <img src={A_LOGO_SRC} alt="AI Developer India" className="h-5 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
            </a>
            <span>AI Developer India</span>
          </div>
          <p>© {new Date().getFullYear()} Japam. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="underline hover:text-white/70">Privacy Policy</a>
            <span>|</span>
            <a href="/terms" className="underline hover:text-white/70">Terms &amp; Conditions</a>
          </div>
        </div>
      </div>
    </div>
  );
}
