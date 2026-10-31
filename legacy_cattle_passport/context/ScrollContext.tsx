import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface ScrollContextType {
  isScrolled: boolean;
  scrollY: number;
  setIsScrolled: (scrolled: boolean) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  resetScroll: () => void;
}

const ScrollContext = createContext<ScrollContextType>({
  isScrolled: false,
  scrollY: 0,
  setIsScrolled: () => {},
  onScroll: () => {},
  resetScroll: () => {},
});

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // For Web: Automatically listen to DOM scroll events in the capture phase
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | Document;
      let top = 0;
      if (target && 'scrollTop' in target && typeof (target as HTMLElement).scrollTop === 'number') {
        top = (target as HTMLElement).scrollTop;
      } else {
        top = window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
      }

      const scrolled = top > 8;
      setScrollY(top);
      setIsScrolled(scrolled);
    };

    // Capture phase intercepts scroll events from ANY scrollable container / ScrollView
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
    };
  }, []);

  // For Native (iOS / Android): onScroll handler for ScrollView
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    setScrollY(y);
    setIsScrolled(y > 8);
  }, []);

  const resetScroll = useCallback(() => {
    setScrollY(0);
    setIsScrolled(false);
  }, []);

  return (
    <ScrollContext.Provider value={{ isScrolled, scrollY, setIsScrolled, onScroll, resetScroll }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => useContext(ScrollContext);
