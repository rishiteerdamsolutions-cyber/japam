import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Large bottom area — CSS only for pull-to-refresh / overscroll.
 * Does not call preventDefault on touch (that broke globe swipes leaving the 96px hit box).
 */
export function MalaGlobeTouchPad({ children, className = '' }: Props) {
  const padRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overscrollBehaviorY;
    const prevBody = document.body.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = 'none';
    document.body.style.overscrollBehaviorY = 'none';
    return () => {
      document.documentElement.style.overscrollBehaviorY = prevHtml;
      document.body.style.overscrollBehaviorY = prevBody;
    };
  }, []);

  return (
    <div
      ref={padRef}
      className={`w-full flex flex-col items-center ${className}`}
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {children}
    </div>
  );
}
