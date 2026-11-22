import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { ShowcaseData } from '../../types';

interface ScrollStoryProps {
  steps: ShowcaseData['storySteps'];
  fabricImage: string;
}

export function ScrollStory({ steps, fabricImage }: ScrollStoryProps) {
  const { shouldSimplify } = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 28,
    mass: 0.35,
  });
  const imageScale = useTransform(smoothProgress, [0.1, 0.85], [1, 1.08]);

  return (
    <div
      ref={sectionRef}
      className="bg-[#9CAF88]/35 border border-[#C5D1B8] rounded-lg p-6 sm:p-10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <p className="text-xs font-medium text-[#4D5A48]">Interactive 06 · Mill-to-Studio Story</p>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-2 text-[#1F2A1C]">
            How Every Wicked Piece Is Made
          </h3>
          <p className="text-sm text-[#4D5A48] mt-3 leading-relaxed">
            From long-staple Tiruppur cotton spinning to low-liquor sage vat dyeing and Jaipur enzyme washes.
          </p>

          <div className="mt-6 rounded-lg overflow-hidden border border-[#C5D1B8] aspect-[4/3] bg-[#F7F5EF]">
            {shouldSimplify ? (
              <img
                src={fabricImage}
                alt="Wicked organic cotton textile detail"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <motion.img
                src={fabricImage}
                alt="Wicked organic cotton textile detail"
                loading="lazy"
                referrerPolicy="no-referrer"
                style={{ scale: imageScale }}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {steps.map((s, idx) => (
            <motion.div
              key={s.step}
              initial={shouldSimplify ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, delay: shouldSimplify ? 0 : idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 rounded-lg bg-[#F7F5EF] border border-[#C5D1B8]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs font-semibold text-[#4D5A48]">
                  Stage {s.step}
                </span>
                <span className="text-xs font-medium text-[#4D5A48]">{s.location}</span>
              </div>
              <h4 className="font-display text-xl font-bold mt-2 text-[#1F2A1C]">{s.title}</h4>
              <p className="text-sm text-[#4D5A48] mt-2 leading-relaxed">{s.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
