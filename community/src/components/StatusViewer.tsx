import { useEffect, useState } from 'react';

export interface StatusItem {
  id: string;
  text: string;
  authorType: string;
  templeName?: string;
  templeId?: string;
  authorUid?: string;
  authorDisplayName?: string;
  mediaUrl?: string;
  createdAt: string;
  expiresAt: string;
}

interface StatusViewerProps {
  statuses: StatusItem[];
  authorLabel: string;
  onClose: () => void;
  onReply?: () => void;
}

const AUTO_ADVANCE_MS = 5000;

export function StatusViewer({ statuses, authorLabel, onClose, onReply }: StatusViewerProps) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const current = statuses[index];
  const hasNext = index < statuses.length - 1;
  const hasPrev = index > 0;

  useEffect(() => {
    if (!current) return;
    setProgress(0);
    const start = Date.now();
    const t = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / AUTO_ADVANCE_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        if (hasNext) setIndex((i) => i + 1);
        else onClose();
      }
    }, 50);
    return () => clearInterval(t);
  }, [index, current?.id, hasNext, onClose]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
        {statuses.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col justify-center px-6 py-16"
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}
      >
        {current.mediaUrl ? (
          <img
            src={current.mediaUrl}
            alt=""
            className="max-w-full max-h-[60vh] object-contain mx-auto rounded-xl"
          />
        ) : null}
        <p className="text-white text-center font-mono text-base mt-4 whitespace-pre-wrap">
          {current.text}
        </p>
        <p className="text-white/50 text-xs font-mono text-center mt-2">
          {authorLabel}
        </p>
      </div>

      {/* Tap zones: left = prev/close, right = next */}
      <div className="absolute inset-0 flex">
        <button
          type="button"
          className="flex-1"
          onClick={() => (hasPrev ? setIndex((i) => i - 1) : onClose())}
          aria-label={hasPrev ? 'Previous' : 'Close'}
        />
        <button
          type="button"
          className="flex-1"
          onClick={() => (hasNext ? setIndex((i) => i + 1) : onClose())}
          aria-label={hasNext ? 'Next' : 'Close'}
        />
      </div>

      {/* Reply button */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 flex justify-center"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={onReply}
          className="px-6 py-2 rounded-full bg-white/20 text-white text-sm font-mono hover:bg-white/30"
        >
          Reply
        </button>
      </div>
    </div>
  );
}
