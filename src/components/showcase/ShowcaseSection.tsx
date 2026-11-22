import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Product, ShowcaseData } from '../../types';
import { ColourwaySwitcher } from './ColourwaySwitcher';
import { FabricExplorer } from './FabricExplorer';
import { OutfitBuilder } from './OutfitBuilder';
import { ScrollStory } from './ScrollStory';
import { ShoppableLookbook } from './ShoppableLookbook';
import { Showcase360Viewer } from './Showcase360Viewer';

interface ShowcaseSectionProps {
  showcase: ShowcaseData;
  products: Product[];
  mode?: 'compact' | 'full';
}

export function ShowcaseSection({ showcase, products, mode = 'compact' }: ShowcaseSectionProps) {
  const { shouldSimplify } = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [activated, setActivated] = useState(mode === 'full');
  const [activeTab, setActiveTab] = useState<'360' | 'lookbook' | 'colour' | 'fabric' | 'outfit'>(
    '360'
  );

  useEffect(() => {
    if (activated) return;
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActivated(true);
          obs.disconnect();
        }
      },
      { rootMargin: '420px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activated]);

  const switcherProduct =
    products.find((p) => p.id === 'wk-tee-01') || products[0];

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">Wicked Interactive Studio</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mt-1 text-[#1F2A1C]">
            Inspect Craft, Fit &amp; Fabric
          </h2>
        </div>

        {mode === 'compact' && (
          <div className="flex flex-wrap gap-1.5 bg-[#E7ECE0] p-1 rounded-lg border border-[#C5D1B8]">
            {[
              { id: '360', label: '360° Orbit' },
              { id: 'lookbook', label: 'Lookbook' },
              { id: 'colour', label: 'Colourways' },
              { id: 'fabric', label: 'Fabric Lens' },
              { id: 'outfit', label: 'Outfit Builder' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  whileTap={shouldSimplify ? undefined : { scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    isActive ? 'text-[#1F2A1C]' : 'text-[#4D5A48] hover:text-[#1F2A1C]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="wicked-studio-tab-bg"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 bg-[#9CAF88] rounded-md"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {!activated ? (
        <div className="h-[460px] rounded-lg bg-[#E7ECE0]/60 border border-[#C5D1B8] flex items-center justify-center">
          <p className="text-sm text-[#4D5A48]">Loading Wicked Studio Showcase...</p>
        </div>
      ) : mode === 'compact' ? (
        <div className="space-y-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === '360' && <Showcase360Viewer config={showcase.spin360} />}
              {activeTab === 'lookbook' && (
                <ShoppableLookbook lookbook={showcase.lookbook} products={products} />
              )}
              {activeTab === 'colour' && switcherProduct && (
                <ColourwaySwitcher product={switcherProduct} />
              )}
              {activeTab === 'fabric' && (
                <FabricExplorer fabricExplorer={showcase.fabricExplorer} />
              )}
              {activeTab === 'outfit' && <OutfitBuilder products={products} />}
            </motion.div>
          </AnimatePresence>
          <ScrollStory
            steps={showcase.storySteps}
            fabricImage={showcase.fabricExplorer.imageUrl}
          />
        </div>
      ) : (
        <div className="space-y-12">
          <Showcase360Viewer config={showcase.spin360} />
          <ShoppableLookbook lookbook={showcase.lookbook} products={products} />
          {switcherProduct && <ColourwaySwitcher product={switcherProduct} />}
          <FabricExplorer fabricExplorer={showcase.fabricExplorer} />
          <OutfitBuilder products={products} />
          <ScrollStory
            steps={showcase.storySteps}
            fabricImage={showcase.fabricExplorer.imageUrl}
          />
        </div>
      )}
    </section>
  );
}
