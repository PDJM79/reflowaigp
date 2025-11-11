/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API which is supported on most mobile browsers
 */

type HapticIntensity = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [15, 100, 15],
  error: [30, 100, 30, 100, 30],
};

/**
 * Trigger haptic feedback on supported devices
 * @param intensity - The intensity of the haptic feedback
 */
export function triggerHaptic(intensity: HapticIntensity = 'light'): void {
  // Check if Vibration API is supported
  if (!('vibrate' in navigator)) {
    return;
  }

  const pattern = HAPTIC_PATTERNS[intensity];

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (error) {
      console.debug('Could not cancel haptic feedback:', error);
    }
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}
