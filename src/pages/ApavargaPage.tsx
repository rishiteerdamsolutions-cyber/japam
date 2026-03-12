import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppHeader } from '../components/layout/AppHeader';
import { AppFooter } from '../components/layout/AppFooter';

const features = [
  {
    icon: '🙏',
    title: 'Connect with Priests & Pandits',
    desc: 'Directly message a Poojari or Pandit on the app. Ask questions, seek blessings, and get guidance from verified priests — anytime.',
  },
  {
    icon: '🕉️',
    title: 'Spiritual Social Network',
    desc: 'A community built for seekers. Share your japa milestones, post spiritual messages, and inspire fellow devotees on their path.',
  },
  {
    icon: '👥',
    title: 'Connect with Fellow Seekers',
    desc: 'Find people who chant the same deity, join group japa sessions, and build meaningful bonds with others on the same spiritual journey.',
  },
  {
    icon: '📿',
    title: 'Share Spiritual Messages',
    desc: 'Post slokas, mantras, devotional thoughts, and experiences. Your words can uplift thousands of fellow seekers.',
  },
  {
    icon: '🏛️',
    title: 'Temple & Event Updates',
    desc: 'Stay informed about temple events, special pujas, and spiritual gatherings in your area and across India.',
  },
  {
    icon: '🌟',
    title: 'Exclusive for Japam Members',
    desc: 'Apavarga is built exclusively for the Japam community — a sacred space free from distractions, only for sincere seekers.',
  },
];

export function ApavargaPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen pb-12 bg-gloss-bubblegum">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="max-w-lg mx-auto px-4 flex-1">
        <AppHeader title="Apavarga" showBack onBack={() => navigate('/settings')} />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mt-4 mb-8"
        >
          <div className="text-6xl mb-4">🕉️</div>
          <h1 className="text-3xl font-bold text-amber-300 mb-2" style={{ fontFamily: 'serif' }}>
            Apavarga
          </h1>
          <p className="text-amber-200/80 text-base leading-relaxed mb-4">
            The spiritual social network for seekers
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-sm font-semibold">Coming Soon</span>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-5 mb-6 text-center"
        >
          <p className="text-amber-100 text-sm leading-relaxed">
            Apavarga means <span className="text-amber-300 font-semibold">liberation</span> — freedom from the ordinary.
            We are building a sacred digital space where seekers, devotees, and priests come together.
            No noise. No distraction. Only devotion.
          </p>
        </motion.div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.4 }}
              className="rounded-2xl bg-black/40 border border-amber-500/20 p-4 flex gap-4 items-start backdrop-blur-sm"
            >
              <div className="text-3xl shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <h3 className="text-amber-200 font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-amber-200/60 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Notify CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="rounded-2xl bg-black/40 border border-amber-500/30 p-5 text-center"
        >
          <p className="text-amber-200 text-sm font-medium mb-3">
            Want to be notified when Apavarga launches?
          </p>
          <a
            href="https://wa.me/919505009699?text=Hi%2C%20I%20want%20to%20be%20notified%20when%20Apavarga%20launches%20on%20Japam!"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Notify me on WhatsApp
          </a>
          <p className="text-amber-200/40 text-[11px] mt-3">
            We will message you on WhatsApp when Apavarga is ready to join.
          </p>
        </motion.div>
        </div>
        <AppFooter />
      </div>
    </div>
  );
}
