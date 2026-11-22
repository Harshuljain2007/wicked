import { motion } from 'motion/react';
import { useBag } from '../hooks/useBag';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function FlyToBagOverlay() {
  const { flyingItem } = useBag();
  const { shouldSimplify } = useReducedMotion();

  if (!flyingItem || shouldSimplify) return null;

  const targetEl = document.getElementById('wicked-bag-btn');
  const targetRect = targetEl?.getBoundingClientRect();
  const toX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth - 48;
  const toY = targetRect ? targetRect.top + targetRect.height / 2 : 32;

  return (
    <motion.div
      aria-hidden="true"
      className="fixed z-50 pointer-events-none w-14 h-16 rounded-md overflow-hidden border border-[#C5D1B8] bg-[#F7F5EF]"
      style={{ left: 0, top: 0 }}
      initial={{
        x: flyingItem.fromX - 28,
        y: flyingItem.fromY - 32,
        scale: 1,
        opacity: 0.95,
      }}
      animate={{
        x: toX - 28,
        y: toY - 32,
        scale: 0.35,
        opacity: 0,
      }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <img
        src={flyingItem.image}
        alt=""
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </motion.div>
  );
}
