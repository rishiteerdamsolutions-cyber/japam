import { useCallback, useRef } from 'react';

interface OpeningVideoModalProps {
  onClose: () => void;
  videoSrc?: string;
}

const DEFAULT_VIDEO_SRC = '/opening video.mp4';

export function OpeningVideoModal({ onClose, videoSrc = DEFAULT_VIDEO_SRC }: OpeningVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleEnded = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={videoSrc}
        className="max-w-full max-h-full w-full h-full object-contain"
        muted
        autoPlay
        playsInline
        onEnded={handleEnded}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
      >
        Skip
      </button>
    </div>
  );
}
