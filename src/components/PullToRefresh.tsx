import { useRef, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70; // px pulled (after resistance) needed to trigger a reload
const MAX = 110;      // max visual pull distance

/**
 * Wraps a scrollable area and reloads the page when the user pulls down from
 * the very top — gives installed PWAs a native-feeling pull-to-refresh, since
 * standalone mode has no browser chrome to provide one.
 */
export function PullToRefresh({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const el = ref.current;
    if (!el || el.scrollTop > 0 || refreshing) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    setPull(dy > 0 ? Math.min(MAX, dy * 0.5) : 0);
  };

  const onTouchEnd = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      setTimeout(() => window.location.reload(), 150);
    } else {
      setPull(0);
    }
  };

  const dragging = startY.current !== null;

  return (
    <div
      ref={ref}
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex justify-center overflow-hidden lg:hidden"
        style={{ height: refreshing ? THRESHOLD : pull, transition: dragging ? 'none' : 'height 200ms ease' }}
      >
        <RefreshCw
          className={`w-5 h-5 mt-3 text-text-muted ${refreshing ? 'animate-spin' : ''}`}
          style={{
            opacity: Math.min(1, pull / THRESHOLD),
            transform: refreshing ? undefined : `rotate(${pull * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
