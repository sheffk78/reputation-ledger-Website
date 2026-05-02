import { useEffect, useRef, useState } from "react";

/**
 * Hook to trigger animations when elements scroll into viewport.
 * Returns ref to attach to element and boolean for visibility state.
 * @param {Object} options - IntersectionObserver options
 * @param {number} options.threshold - 0 to 1, default 0.15
 * @param {boolean} options.triggerOnce - Only trigger once, default true
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export function useScrollAnimation(options = {}) {
  const { threshold = 0.15, triggerOnce = true } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  return [ref, isVisible];
}

/**
 * Hook to create staggered animation delays for child elements.
 * @param {number} count - Number of items
 * @param {number} baseDelay - Base delay in ms, default 50
 * @param {number} staggerDelay - Delay between items in ms, default 50
 * @returns {number[]} Array of delays in ms
 */
export function useStaggerDelays(count, baseDelay = 50, staggerDelay = 50) {
  return Array.from({ length: count }, (_, i) => baseDelay + i * staggerDelay);
}
