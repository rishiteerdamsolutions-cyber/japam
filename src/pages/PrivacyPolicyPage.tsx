import { useNavigate } from 'react-router-dom';
import { AppFooter } from '../components/layout/AppFooter';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-cover bg-center text-white" style={{ backgroundImage: 'url(/images/privacypagebg.png)' }}>
      <div className="absolute inset-0 bg-black/70" aria-hidden />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-amber-400 hover:text-amber-300 transition-colors text-sm flex items-center gap-1"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold text-amber-400 mb-2">Privacy Policy</h1>
        <p className="text-amber-200/60 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-amber-100/80 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">1. Introduction</h2>
            <p>
              Welcome to <strong className="text-white">Japam</strong> ("we", "our", or "us"), a digital mantra practice platform developed and operated by <strong className="text-white">AI Developer India</strong> (Aditya Nandagiri). We are committed to protecting your personal information and your right to privacy.
            </p>
            <p className="mt-2">
              This Privacy Policy describes how we collect, use, and share information when you use our website and application at <strong className="text-white">japam.digital</strong> (the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">2. Information We Collect</h2>
            <h3 className="font-medium text-amber-200 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Google Account Information:</strong> When you sign in with Google, we receive your name, email address, and profile picture from Google.</li>
              <li><strong>Display Name:</strong> Your name as set in your Google account, used to display in leaderboards and the active users strip.</li>
            </ul>

            <h3 className="font-medium text-amber-200 mb-2 mt-4">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Japa Counts:</strong> Your japa (chanting) progress per deity, stored to track your spiritual journey.</li>
              <li><strong>Practice Progress:</strong> Paused session states (moves count, japa count) to allow resume functionality.</li>
              <li><strong>Last Active Timestamp:</strong> The time you last used the app, used to show active users in real time.</li>
              <li><strong>Marathon Participation:</strong> Which community japa marathons you have joined and your contribution count.</li>
              <li><strong>Payment Status:</strong> Whether you have unlocked the Pro version (we do not store card details — payments are processed by third-party providers).</li>
              <li><strong>Device/Browser Data:</strong> Basic usage analytics via Vercel Speed Insights (page views, performance metrics). No personally identifiable information is included.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>To provide and maintain the Service, including saving your practice progress and japa counts.</li>
              <li>To display your name and japa count on community leaderboards (marathons) — only if you have joined a marathon.</li>
              <li>To show your name in the real-time active users strip visible to other players.</li>
              <li>To send daily reminder notifications at the time you set (only if you grant notification permission).</li>
              <li>To verify your account and prevent abuse.</li>
              <li>To improve the Service using aggregated, anonymised analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">4. Information Sharing</h2>
            <p className="text-sm">We do <strong className="text-white">not</strong> sell, trade, or rent your personal information to third parties. We share information only in these limited circumstances:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li><strong>Google Firebase / Firestore:</strong> We use Google Firebase for authentication and database storage. Your data is stored on Google's secure servers.</li>
              <li><strong>Vercel:</strong> Our application is hosted on Vercel. Vercel may collect server logs and performance data.</li>
              <li><strong>Community Leaderboards:</strong> If you join a Japa Marathon, your display name and japa count are visible to other participants in that marathon.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">5. Data Storage & Security</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Your data is stored in Google Firebase Firestore, which is encrypted at rest and in transit.</li>
              <li>We use Firebase Authentication with Google Sign-In — we never store your Google password.</li>
              <li>We implement reasonable security measures to protect your information, but no method of transmission over the Internet is 100% secure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">6. Notifications</h2>
            <p className="text-sm">
              If you enable daily reminders, we use your browser's Notification API and Service Worker to send local notifications at your chosen time. These notifications are generated on your device — we do not send push notifications through any external server. You can disable notifications at any time through your browser or device settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">7. Children's Privacy</h2>
            <p className="text-sm">
              Japam is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">8. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Access:</strong> You can view your japa counts and profile within the app.</li>
              <li><strong>Deletion:</strong> You may request deletion of your account and all associated data by contacting us.</li>
              <li><strong>Opt-out:</strong> You can disable notifications, sign out, or stop using the Service at any time.</li>
              <li><strong>Data Portability:</strong> Contact us to request a copy of your data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">9. Cookies & Local Storage</h2>
            <p className="text-sm">
              We use browser local storage to store app settings (sound preferences, reminder times) and temporary session state. We do not use advertising cookies or third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">10. Third-Party Links</h2>
            <p className="text-sm">
              Our app may contain links to external sites (e.g. WhatsApp for feedback). We are not responsible for the privacy practices of those sites and encourage you to read their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">11. Changes to This Policy</h2>
            <p className="text-sm">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-amber-300 mb-3">12. Contact Us</h2>
            <p className="text-sm">
              If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:
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

        <AppFooter />
      </div>
    </div>
  );
}
