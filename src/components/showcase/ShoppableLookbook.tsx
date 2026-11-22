import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useBag } from '../../hooks/useBag';
import type { Product, ShowcaseData } from '../../types';

interface ShoppableLookbookProps {
  lookbook: ShowcaseData['lookbook'];
  products: Product[];
}

export function ShoppableLookbook({ lookbook, products }: ShoppableLookbookProps) {
  const { addToBag } = useBag();
  const [activeId, setActiveId] = useState<string | null>(lookbook.hotspots[0]?.id || null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  const activeHotspot = lookbook.hotspots.find((h) => h.id === activeId) || null;
  const activeProduct = activeHotspot
    ? products.find((p) => p.id === activeHotspot.productId) || products[0]
    : null;

  const currentColor =
    activeProduct?.colors.find((c) => c.name === selectedColor) || activeProduct?.colors[0];
  const availableSizes = activeProduct
    ? Array.from(new Set(activeProduct.variants.map((v) => v.size)))
    : [];
  const currentSize = availableSizes.includes(selectedSize)
    ? selectedSize
    : availableSizes[0] || 'M';

  const handleSelectHotspot = (hotspotId: string, prodId: string) => {
    setActiveId(hotspotId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSelectedColor(prod.colors[0].name);
      setSelectedSize(prod.variants[0]?.size || 'M');
    }
  };

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!activeProduct || !currentColor) return;
    addToBag(
      {
        productId: activeProduct.id,
        slug: activeProduct.slug,
        name: activeProduct.name,
        category: activeProduct.category,
        color: currentColor.name,
        size: currentSize,
        unitPrice: activeProduct.price + (currentColor.priceDelta || 0),
        quantity: 1,
        image: currentColor.images[0],
      },
      { sourceRect: e.currentTarget.getBoundingClientRect() }
    );
  };

  return (
    <div className="bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-[#C5D1B8] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">Interactive 02 · Shoppable Editorial</p>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1">{lookbook.title}</h3>
        </div>
        <p className="text-sm text-[#4D5A48] max-w-md">{lookbook.subtitle}</p>
      </div>

      <div className="relative w-full aspect-[16/9] bg-[#E7ECE0]">
        <img
          src={lookbook.imageUrl}
          alt={lookbook.title}
          width={1440}
          height={810}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />

        {lookbook.hotspots.map((spot) => {
          const isOpen = spot.id === activeId;
          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => handleSelectHotspot(spot.id, spot.productId)}
              aria-label={`Inspect ${spot.label}`}
              aria-expanded={isOpen}
              style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-transform duration-150 ${
                isOpen
                  ? 'bg-[#1F2A1C] text-[#F7F5EF] border-[#F7F5EF] scale-110'
                  : 'bg-[#F7F5EF]/95 text-[#1F2A1C] border-[#1F2A1C] hover:scale-105'
              }`}
            >
              <Plus className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
            </button>
          );
        })}

        {activeHotspot && activeProduct && currentColor && (
          <div className="mt-4 sm:mt-0 sm:absolute sm:bottom-5 sm:right-5 sm:w-80 bg-[#F7F5EF] border border-[#C5D1B8] rounded-lg p-4 z-10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#4D5A48]">{activeProduct.category} · {activeProduct.gsm} GSM</p>
                <h4 className="font-display text-base font-bold text-[#1F2A1C] mt-0.5">
                  {activeProduct.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                aria-label="Close hotspot card"
                className="p-1.5 rounded hover:bg-[#E7ECE0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-base font-bold tabular-nums mt-2">
              ₹{(activeProduct.price + (currentColor.priceDelta || 0)).toLocaleString('en-IN')}
            </p>

            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#4D5A48]">Colour:</span>
                {activeProduct.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    aria-label={c.name}
                    className={`w-5 h-5 rounded-full border ${
                      currentColor.name === c.name
                        ? 'border-[#1F2A1C] ring-1 ring-[#1F2A1C] ring-offset-1'
                        : 'border-[#C5D1B8]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {availableSizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                      currentSize === sz
                        ? 'bg-[#9CAF88] text-[#1F2A1C] border-[#1F2A1C]'
                        : 'bg-[#FCFBF7] text-[#4D5A48] border-[#C5D1B8]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-2.5 px-4 rounded-md btn-tomato mt-1"
              >
                Add to bag
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
