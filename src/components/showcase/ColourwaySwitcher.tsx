import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBag } from '../../hooks/useBag';
import type { Product } from '../../types';

interface ColourwaySwitcherProps {
  product: Product;
}

export function ColourwaySwitcher({ product }: ColourwaySwitcherProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToBag } = useBag();

  const initialColorName = searchParams.get('colour');
  const initialIdx = Math.max(
    0,
    product.colors.findIndex(
      (c) => c.name.toLowerCase() === (initialColorName || '').toLowerCase()
    )
  );

  const [colorIdx, setColorIdx] = useState(initialIdx);
  const [selectedSize, setSelectedSize] = useState('M');

  const activeColor = product.colors[colorIdx] || product.colors[0];
  const price = product.price + (activeColor.priceDelta || 0);
  const variant = product.variants.find(
    (v) => v.color === activeColor.name && v.size === selectedSize
  );
  const stock = variant?.stock ?? 0;

  const handleSelectColour = (idx: number) => {
    setColorIdx(idx);
    const next = new URLSearchParams(searchParams);
    next.set('colour', product.colors[idx].name);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
      <div className="lg:col-span-6 relative bg-[#F7F5EF] aspect-[3/4] max-h-[520px] w-full overflow-hidden">
        {product.colors.map((c, idx) => (
          <img
            key={c.name}
            src={c.images[0]}
            alt={`${product.name} in ${c.name}`}
            width={600}
            height={800}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              idx === colorIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />
        ))}
      </div>

      <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between bg-[#E7ECE0]/40 border-t lg:border-t-0 lg:border-l border-[#C5D1B8]">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">Interactive 03 · Colourway Switcher</p>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1">{product.name}</h3>
          <p className="text-sm text-[#4D5A48] mt-2">{product.description}</p>

          <div className="mt-5 flex items-baseline gap-3 tabular-nums">
            <span className="font-display text-2xl font-bold">
              ₹{price.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-medium text-[#4D5A48]">
              {stock > 0 ? `${stock} in stock · ${activeColor.name}` : 'Out of stock'}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold text-[#1F2A1C] mb-2">
              Select Colourway: {activeColor.name}
            </p>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((c, idx) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectColour(idx)}
                  className={`px-3.5 py-2 rounded-md border text-sm font-medium inline-flex items-center gap-2 transition-colors ${
                    idx === colorIdx
                      ? 'bg-[#9CAF88] text-[#1F2A1C] border-[#1F2A1C]'
                      : 'bg-[#F7F5EF] text-[#4D5A48] border-[#C5D1B8] hover:bg-[#E7ECE0]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-[#1F2A1C]/30"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#1F2A1C] mb-2">Select Size</p>
            <div className="flex flex-wrap gap-2">
              {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`min-w-[44px] h-10 px-3 rounded-md border text-sm font-semibold tabular-nums transition-colors ${
                    selectedSize === sz
                      ? 'bg-[#9CAF88] text-[#1F2A1C] border-[#1F2A1C]'
                      : 'bg-[#F7F5EF] text-[#4D5A48] border-[#C5D1B8] hover:bg-[#E7ECE0]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            disabled={stock === 0}
            onClick={(e) =>
              addToBag(
                {
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  category: product.category,
                  color: activeColor.name,
                  size: selectedSize,
                  unitPrice: price,
                  quantity: 1,
                  image: activeColor.images[0],
                },
                { sourceRect: e.currentTarget.getBoundingClientRect() }
              )
            }
            className="w-full py-3.5 px-6 rounded-md btn-tomato"
          >
            Add to bag · ₹{price.toLocaleString('en-IN')}
          </button>
        </div>
      </div>
    </div>
  );
}
