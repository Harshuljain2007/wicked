import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface ClickPulse {
  id: number;
  x: number;
  y: number;
  isInteractive: boolean;
}

export function ClickMotionLayer() {
  const { shouldSimplify } = useReducedMotion();
  const [pulses, setPulses] = useState<ClickPulse[]>([]);

  useEffect(() => {
    if (shouldSimplify) return;

    let counter = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest('button, a, [role="button"], input, select, summary, label')
      );
      const id = ++counter;
      setPulses((prev) => [...prev.slice(-4), { id, x: e.clientX, y: e.clientY, isInteractive }]);
      window.setTimeout(() => {
        setPulses((prev) => prev.filter((p) => p.id !== id));
      }, 460);
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [shouldSimplify]);

  if (shouldSimplify) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[70] overflow-hidden"
    >
      <AnimatePresence>
        {pulses.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              x: p.x - 20,
              y: p.y - 20,
              scale: 0.25,
              opacity: p.isInteractive ? 0.55 : 0.32,
            }}
            animate={{
              x: p.x - 20,
              y: p.y - 20,
              scale: p.isInteractive ? 1.55 : 1.15,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 left-0 w-10 h-10 rounded-full border-2 border-[#1F2A1C]/50 bg-[#9CAF88]/25"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
