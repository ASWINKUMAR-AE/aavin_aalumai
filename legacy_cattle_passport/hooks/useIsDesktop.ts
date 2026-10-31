import { useState, useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Returns true if running on a desktop environment (e.g. desktop web browser on PC/Mac/Linux)
 * OR if the viewport width is >= 1024 (e.g. large tablet / desktop viewports).
 *
 * Crucially: On a desktop PC browser (Windows, Mac, Linux), resizing or minimizing the window
 * will NOT abruptly flip the interface into mobile layout. The desktop layout persists.
 */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();

  const isDesktopBrowser = (() => {
    if (Platform.OS !== 'web') return false;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;

    const ua = navigator.userAgent || '';
    // Mobile devices (phones and touch tablets)
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTouchOnly = (navigator.maxTouchPoints || 0) > 1 && /mobile/i.test(ua);

    // Desktop browsers on Windows, macOS, Linux, ChromeOS
    return !isMobileUA && !isTouchOnly;
  })();

  // If on desktop PC/Mac, it is ALWAYS desktop.
  // Otherwise on mobile web or native, it uses the 1024px width breakpoint.
  return isDesktopBrowser || width >= 1024;
}
