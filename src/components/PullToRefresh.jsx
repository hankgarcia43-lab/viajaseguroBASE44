import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && el.scrollTop === 0) {
        e.preventDefault();
        setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
      }
    };

    const onTouchEnd = async () => {
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        await onRefresh();
        setRefreshing(false);
      }
      setPullDistance(0);
      startY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto overscroll-none">
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: refreshing ? THRESHOLD : pullDistance }}
      >
        {(pullDistance > 10 || refreshing) && (
          <div className="flex flex-col items-center gap-1">
            <Loader2
              className={`w-6 h-6 text-blue-600 ${refreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${progress * 360}deg)`, opacity: progress }}
            />
            <span className="text-xs text-slate-500">
              {refreshing ? 'Actualizando...' : progress >= 1 ? 'Suelta para actualizar' : 'Desliza para actualizar'}
            </span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}