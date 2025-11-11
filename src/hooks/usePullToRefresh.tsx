import { useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '@/lib/haptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const element = scrollableRef.current;
    if (!element) return;

    let touchStartY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the scroll container
      if (element.scrollTop === 0) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartY || element.scrollTop > 0) return;

      currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY;

      if (distance > 0) {
        // Apply resistance to pull distance
        const pull = distance / resistance;
        setPullDistance(pull);
        setIsPulling(true);

        // Prevent default scroll behavior when pulling
        if (distance > 10) {
          e.preventDefault();
        }

        // Haptic feedback when reaching threshold
        if (pull >= threshold && pull < threshold + 5) {
          triggerHaptic('light');
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic('medium');
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      setIsPulling(false);
      setPullDistance(0);
      touchStartY = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, pullDistance, threshold, resistance, isRefreshing, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return {
    scrollableRef,
    isPulling,
    pullDistance,
    pullProgress,
    isRefreshing,
  };
}
