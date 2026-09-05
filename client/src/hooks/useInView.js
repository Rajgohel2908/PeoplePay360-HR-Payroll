// client/src/hooks/useInView.js
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to detect when an element enters the viewport.
 * Perfect for triggering scroll animations on dashboard cards and graphs.
 */
export function useInView(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -40px 0px',
    triggerOnce = true,
  } = options;

  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback if browser doesn't support IntersectionObserver
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.unobserve(el);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, inView];
}

export default useInView;
