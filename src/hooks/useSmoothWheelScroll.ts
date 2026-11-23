import { useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Smoothly interpolates discrete mouse-wheel ticks via delta-time exponential damping
 * so scrolling feels identical across 60Hz, 90Hz, 120Hz, and 144Hz displays, while
 * leaving native trackpad/touch inertia, modals/drawers, and canvas zoom untouched.
 */
export function useSmoothWheelScroll() {
  const { shouldSimplify } = useReducedMotion();

  useEffect(() => {
    if (shouldSimplify) return;

    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let rafId: number | null = null;
    let lastTime = 0;

    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const isScrollableContainer = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      if (target.closest('canvas, [role="dialog"], select, textarea')) return true;
      let el: Element | null = target;
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 2
        ) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const tick = (now: number) => {
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;

      const diff = targetY - currentY;
      if (Math.abs(diff) < 0.4) {
        window.scrollTo({ top: targetY, behavior: 'auto' });
        rafId = null;
        lastTime = 0;
        return;
      }

      const alpha = 1 - Math.exp(-11.5 * dt);
      currentY += diff * alpha;
      window.scrollTo({ top: currentY, behavior: 'auto' });
      rafId = window.requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      if (isScrollableContainer(e.target)) return;

      // Preserve native macOS/laptop trackpad inertial scrolling for fine fractional deltas
      const isTrackpadSmallDelta =
        e.deltaMode === 0 && Math.abs(e.deltaY) < 24 && Math.abs(e.deltaX) === 0;
      if (isTrackpadSmallDelta || Math.abs(e.deltaY) < 1) {
        currentY = window.scrollY;
        targetY = window.scrollY;
        return;
      }

      e.preventDefault();
      if (rafId === null) {
        currentY = window.scrollY;
        targetY = window.scrollY;
        lastTime = performance.now();
      }
      const lineMult = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      const delta = e.deltaY * lineMult;
      targetY = Math.max(0, Math.min(maxScroll(), targetY + delta));

      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const onScrollSync = () => {
      if (rafId === null) {
        currentY = window.scrollY;
        targetY = window.scrollY;
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScrollSync, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScrollSync);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [shouldSimplify]);
}

export function smoothScrollToTop(simplify: boolean): void {
  if (simplify) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  const startY = window.scrollY;
  if (startY <= 0) return;
  const startTime = performance.now();
  const duration = Math.min(620, Math.max(280, startY * 0.25));

  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    window.scrollTo({ top: Math.round(startY * (1 - eased)), behavior: 'auto' });
    if (t < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}
