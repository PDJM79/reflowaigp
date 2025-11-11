import { useRef, useState, useEffect } from 'react';
import { triggerHaptic } from '@/lib/haptics';

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  enabled = true,
}: UseSwipeGestureOptions) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      currentX.current = startX.current;
      setIsSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return;

      currentX.current = e.touches[0].clientX;
      const distance = currentX.current - startX.current;
      setSwipeDistance(distance);

      // Haptic feedback at threshold
      if (Math.abs(distance) >= threshold && Math.abs(distance) < threshold + 10) {
        triggerHaptic('light');
      }
    };

    const handleTouchEnd = () => {
      const distance = currentX.current - startX.current;

      if (Math.abs(distance) >= threshold) {
        triggerHaptic('medium');
        
        if (distance > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (distance < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      setIsSwiping(false);
      setSwipeDistance(0);
      startX.current = 0;
      currentX.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, isSwiping, threshold, onSwipeLeft, onSwipeRight]);

  return {
    elementRef,
    swipeDistance,
    isSwiping,
  };
}
