import { useEffect, useState } from 'react';
import { ShowcaseSection } from '../components/showcase/ShowcaseSection';
import { SEED_PRODUCTS, SEED_SHOWCASE } from '../data/seedData';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import type { Product, ShowcaseData } from '../types';

export function ShowcasePage() {
  const [showcase, setShowcase] = useState<ShowcaseData>(SEED_SHOWCASE);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);

  useDocumentMeta({
    title: 'Interactive Studio Showcase — Wicked',
    description:
      'Rotate garments in 360 degrees, shop the Courtyard Lookbook, explore 420 GSM French terry weave under 2.4x lens, and build a bundled Wicked outfit.',
  });

  useEffect(() => {
    fetch('/api/showcase')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.showcase) setShowcase(data.showcase);
        if (data?.products) setProducts(data.products);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="bg-[#9CAF88]/30 border-b border-[#C5D1B8] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-medium text-[#4D5A48]">Wicked Studio · Full Experience</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mt-2 text-[#1F2A1C]">
            Interactive Showcase
          </h1>
          <p className="text-base text-[#4D5A48] mt-3 max-w-2xl">
            Every silhouette inspected in 360-degree rotation, real courtyard lookbook hotspots, colourway crossfades, macro mill weave lens, and outfit bundling.
          </p>
        </div>
      </div>

      <ShowcaseSection showcase={showcase} products={products} mode="full" />
    </div>
  );
}
