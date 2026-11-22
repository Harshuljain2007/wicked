import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useBag } from '../../hooks/useBag';
import type { Product } from '../../types';

interface OutfitBuilderProps {
  products: Product[];
}

export function OutfitBuilder({ products }: OutfitBuilderProps) {
  const { addBundleToBag } = useBag();

  const tops = useMemo(
    () => products.filter((p) => ['tees', 'shirts', 'kurtas', 'hoodies'].includes(p.category)),
    [products]
  );
  const bottoms = useMemo(
    () => products.filter((p) => p.category === 'bottoms'),
    [products]
  );
  const accessories = useMemo(
    () => products.filter((p) => p.category === 'accessories'),
    [products]
  );

  const [topIdx, setTopIdx] = useState(0);
  const [bottomIdx, setBottomIdx] = useState(0);
  const [accIdx, setAccIdx] = useState(0);
  const [size, setSize] = useState('L');

  const top = tops[topIdx % Math.max(1, tops.length)];
  const bottom = bottoms[bottomIdx % Math.max(1, bottoms.length)];
  const accessory = accessories[accIdx % Math.max(1, accessories.length)];

  if (!top || !bottom || !accessory) return null;

  const rawTotal = top.price + bottom.price + accessory.price;
  const bundleDiscount = Math.round(rawTotal * 0.12);
  const bundlePrice = rawTotal - bundleDiscount;

  const handleAddFullLook = () => {
    addBundleToBag([
      {
        productId: top.id,
        slug: top.slug,
        name: top.name,
        category: top.category,
        color: top.colors[0].name,
        size,
        unitPrice: top.price,
        quantity: 1,
        image: top.colors[0].images[0],
      },
      {
        productId: bottom.id,
        slug: bottom.slug,
        name: bottom.name,
        category: bottom.category,
        color: bottom.colors[0].name,
        size,
        unitPrice: bottom.price,
        quantity: 1,
        image: bottom.colors[0].images[0],
      },
      {
        productId: accessory.id,
        slug: accessory.slug,
        name: accessory.name,
        category: accessory.category,
        color: accessory.colors[0].name,
        size: accessory.variants[0]?.size || 'One Size',
        unitPrice: accessory.price,
        quantity: 1,
        image: accessory.colors[0].images[0],
      },
    ]);
  };

  return (
    <div className="bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
      {/* Mannequin-style stacked vertical outfit preview */}
      <div className="lg:col-span-5 bg-[#F7F5EF] p-6 flex flex-col items-center justify-center gap-3">
        <div className="w-full max-w-[260px] grid grid-cols-2 gap-3">
          <div className="col-span-2 aspect-[4/3] rounded-md overflow-hidden border border-[#C5D1B8] bg-[#FCFBF7]">
            <img
              src={top.colors[0].images[0]}
              alt={top.name}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="aspect-[3/4] rounded-md overflow-hidden border border-[#C5D1B8] bg-[#FCFBF7]">
            <img
              src={bottom.colors[0].images[0]}
              alt={bottom.name}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="aspect-[3/4] rounded-md overflow-hidden border border-[#C5D1B8] bg-[#FCFBF7]">
            <img
              src={accessory.colors[0].images[0]}
              alt={accessory.name}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <p className="text-xs font-medium text-[#4D5A48] mt-1">
          Full Look Bundle · Save 12% automatically
        </p>
      </div>

      {/* Layer Sliders & Bundle Checkout */}
      <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#C5D1B8]">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">Interactive 05 · Outfit Builder</p>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1">
            Combine Top, Bottom &amp; Carry
          </h3>

          <div className="mt-5 space-y-4">
            {[
              {
                label: 'Top Layer',
                item: top,
                onPrev: () => setTopIdx((i) => (i - 1 + tops.length) % tops.length),
                onNext: () => setTopIdx((i) => (i + 1) % tops.length),
              },
              {
                label: 'Bottom Silhouette',
                item: bottom,
                onPrev: () => setBottomIdx((i) => (i - 1 + bottoms.length) % bottoms.length),
                onNext: () => setBottomIdx((i) => (i + 1) % bottoms.length),
              },
              {
                label: 'Accessory',
                item: accessory,
                onPrev: () => setAccIdx((i) => (i - 1 + accessories.length) % accessories.length),
                onNext: () => setAccIdx((i) => (i + 1) % accessories.length),
              },
            ].map((slot) => (
              <div
                key={slot.label}
                className="flex items-center justify-between gap-3 p-3.5 rounded-md bg-[#F7F5EF] border border-[#C5D1B8]"
              >
                <div className="min-w-0">
                  <p className="text-xs text-[#4D5A48]">{slot.label}</p>
                  <p className="font-display text-sm font-bold text-[#1F2A1C] truncate">
                    {slot.item.name}
                  </p>
                  <p className="text-xs font-semibold tabular-nums mt-0.5">
                    ₹{slot.item.price.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={slot.onPrev}
                    aria-label={`Previous ${slot.label}`}
                    className="w-10 h-10 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] flex items-center justify-center hover:bg-[#9CAF88] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={slot.onNext}
                    aria-label={`Next ${slot.label}`}
                    className="w-10 h-10 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] flex items-center justify-center hover:bg-[#9CAF88] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#1F2A1C] mr-1">Apparel Size:</span>
            {['S', 'M', 'L', 'XL'].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSize(sz)}
                className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                  size === sz
                    ? 'bg-[#9CAF88] text-[#1F2A1C] border-[#1F2A1C]'
                    : 'bg-[#F7F5EF] text-[#4D5A48] border-[#C5D1B8]'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#CFD9C3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="tabular-nums">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold">
                ₹{bundlePrice.toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-[#4D5A48] line-through">
                ₹{rawTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs font-medium text-[#4D5A48]">
              12% Bundle Savings (-₹{bundleDiscount.toLocaleString('en-IN')})
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddFullLook}
            className="py-3.5 px-6 rounded-md btn-tomato whitespace-nowrap"
          >
            Add to bag · Full Look
          </button>
        </div>
      </div>
    </div>
  );
}
