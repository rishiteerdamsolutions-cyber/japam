import { motion } from 'framer-motion';
import { JapamLogo } from './ui/JapamLogo';

interface SplashProps {
  onComplete: () => void;
}

export function Splash({ onComplete }: SplashProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full"
        onAnimationComplete={() => setTimeout(onComplete, 800)}
      >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-3"
      >
        <JapamLogo size={100} />
      </motion.div>
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-4xl font-bold text-amber-400 mb-2"
        style={{ fontFamily: 'serif' }}
      >
        Japam
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-amber-200/80"
      >
        Match & Chant
      </motion.p>
      </motion.div>
    </div>
  );
}
