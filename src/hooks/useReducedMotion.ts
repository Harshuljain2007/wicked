import { useEffect, useState } from 'react';

export function useReducedMotion(): {
  prefersReducedMotion: boolean;
  isLowPowered: boolean;
  shouldSimplify: boolean;
} {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isLowPowered, setIsLowPowered] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);

    const cores = navigator.hardwareConcurrency || 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    if (cores <= 2 || mem <= 2) {
      setIsLowPowered(true);
    }

    return () => mq.removeEventListener('change', onChange);
  }, []);

  return {
    prefersReducedMotion,
    isLowPowered,
    shouldSimplify: prefersReducedMotion || isLowPowered,
  };
}
